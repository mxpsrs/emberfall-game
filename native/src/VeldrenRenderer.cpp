#include "VeldrenRenderer.h"

#include <filament/Camera.h>
#include <filament/Engine.h>
#include <filament/Renderer.h>
#include <filament/Scene.h>
#include <filament/SwapChain.h>
#include <filament/View.h>
#include <gltfio/AssetLoader.h>
#include <gltfio/FilamentAsset.h>
#include <gltfio/MaterialProvider.h>
#include <gltfio/ResourceLoader.h>
#include <utils/EntityManager.h>

#include <fstream>
#include <iostream>

using namespace filament;
using namespace gltfio;

VeldrenRenderer::~VeldrenRenderer() { shutdown(); }

bool VeldrenRenderer::initialize(void* nativeWindow, uint32_t width, uint32_t height) {
    width_ = width;
    height_ = height;

    engine_ = Engine::create(Engine::Backend::DEFAULT);
    if (!engine_) return false;

    swapChain_ = engine_->createSwapChain(nativeWindow);
    renderer_ = engine_->createRenderer();
    scene_ = engine_->createScene();
    view_ = engine_->createView();

    auto& em = utils::EntityManager::get();
    auto cameraEntity = em.create();
    camera_ = engine_->createCamera(cameraEntity);

    view_->setScene(scene_);
    view_->setCamera(camera_);
    view_->setViewport({0, 0, width_, height_});

    // Stable native image first: no dynamic resolution and no temporal upscaler.
    view_->setDynamicResolutionOptions({.enabled = false});
    view_->setAntiAliasing(View::AntiAliasing::FXAA);
    view_->setDithering(View::Dithering::TEMPORAL);

    camera_->setProjection(45.0, double(width_) / double(height_), 0.1, 2000.0,
                           Camera::Fov::VERTICAL);
    camera_->lookAt({18.0, 18.0, 18.0}, {0.0, 0.0, 0.0}, {0.0, 1.0, 0.0});

    materialProvider_ = createUbershaderProvider(engine_);
    AssetConfiguration config{};
    config.engine = engine_;
    config.materials = materialProvider_;
    config.entities = &em;
    assetLoader_ = AssetLoader::create(config);

    ResourceConfiguration resources{};
    resources.engine = engine_;
    resources.normalizeSkinningWeights = true;
    resourceLoader_ = std::make_unique<ResourceLoader>(resources);
    return true;
}

void VeldrenRenderer::resize(uint32_t width, uint32_t height) {
    width_ = width;
    height_ = height;
    if (!view_ || !camera_ || height_ == 0) return;
    view_->setViewport({0, 0, width_, height_});
    camera_->setProjection(45.0, double(width_) / double(height_), 0.1, 2000.0,
                           Camera::Fov::VERTICAL);
}

bool VeldrenRenderer::loadGlb(const std::filesystem::path& path) {
    if (!assetLoader_ || !resourceLoader_) return false;

    std::ifstream stream(path, std::ios::binary | std::ios::ate);
    if (!stream) {
        std::cerr << "Veldren: cannot open GLB: " << path << "\n";
        return false;
    }
    const auto size = stream.tellg();
    if (size <= 0) return false;

    LoadedAsset loaded;
    loaded.path = path.string();
    loaded.bytes.resize(static_cast<size_t>(size));
    stream.seekg(0);
    stream.read(reinterpret_cast<char*>(loaded.bytes.data()), size);

    loaded.asset = assetLoader_->createAssetFromBinary(loaded.bytes.data(), loaded.bytes.size());
    if (!loaded.asset) {
        std::cerr << "Veldren: gltfio rejected GLB: " << path << "\n";
        return false;
    }

    const auto base = path.parent_path().string();
    resourceLoader_->addResourceData("veldren-base", {});
    if (!resourceLoader_->loadResources(loaded.asset)) {
        std::cerr << "Veldren: failed GLB resources: " << path << "\n";
        assetLoader_->destroyAsset(loaded.asset);
        return false;
    }

    loaded.asset->releaseSourceData();
    scene_->addEntities(loaded.asset->getEntities(), loaded.asset->getEntityCount());
    assets_.push_back(std::move(loaded));
    return true;
}

void VeldrenRenderer::render() {
    if (!renderer_ || !swapChain_ || !view_) return;
    if (renderer_->beginFrame(swapChain_)) {
        renderer_->render(view_);
        renderer_->endFrame();
    }
}

void VeldrenRenderer::shutdown() {
    if (!engine_) return;

    if (scene_) {
        for (auto& loaded : assets_) {
            if (loaded.asset) {
                scene_->removeEntities(loaded.asset->getEntities(), loaded.asset->getEntityCount());
                assetLoader_->destroyAsset(loaded.asset);
            }
        }
    }
    assets_.clear();
    resourceLoader_.reset();

    if (assetLoader_) AssetLoader::destroy(&assetLoader_);
    if (materialProvider_) destroyMaterials(materialProvider_);

    if (camera_) {
        auto entity = camera_->getEntity();
        engine_->destroyCameraComponent(entity);
        utils::EntityManager::get().destroy(entity);
        camera_ = nullptr;
    }

    if (view_) engine_->destroy(view_);
    if (scene_) engine_->destroy(scene_);
    if (renderer_) engine_->destroy(renderer_);
    if (swapChain_) engine_->destroy(swapChain_);
    view_ = nullptr; scene_ = nullptr; renderer_ = nullptr; swapChain_ = nullptr;

    Engine::destroy(&engine_);
}
