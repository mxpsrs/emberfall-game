#pragma once

#include <cstdint>
#include <filesystem>
#include <memory>
#include <string>
#include <vector>

namespace filament {
class Engine;
class Renderer;
class Scene;
class View;
class Camera;
class SwapChain;
class IndirectLight;
class Skybox;
}
namespace gltfio {
class AssetLoader;
class ResourceLoader;
class FilamentAsset;
class MaterialProvider;
}

class VeldrenRenderer final {
public:
    VeldrenRenderer() = default;
    ~VeldrenRenderer();

    bool initialize(void* nativeWindow, uint32_t width, uint32_t height);
    void resize(uint32_t width, uint32_t height);
    bool loadGlb(const std::filesystem::path& path);
    void render();
    void shutdown();

private:
    struct LoadedAsset {
        gltfio::FilamentAsset* asset = nullptr;
        std::vector<uint8_t> bytes;
        std::string path;
    };

    filament::Engine* engine_ = nullptr;
    filament::Renderer* renderer_ = nullptr;
    filament::Scene* scene_ = nullptr;
    filament::View* view_ = nullptr;
    filament::Camera* camera_ = nullptr;
    filament::SwapChain* swapChain_ = nullptr;
    gltfio::MaterialProvider* materialProvider_ = nullptr;
    gltfio::AssetLoader* assetLoader_ = nullptr;
    std::unique_ptr<gltfio::ResourceLoader> resourceLoader_;
    std::vector<LoadedAsset> assets_;
    uint32_t width_ = 0;
    uint32_t height_ = 0;
};
