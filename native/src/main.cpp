#include "VeldrenRenderer.h"

#include <SDL.h>
#include <SDL_syswm.h>

#include <filesystem>
#include <iostream>

static void* nativeWindow(SDL_Window* window) {
    SDL_SysWMinfo info{};
    SDL_VERSION(&info.version);
    if (!SDL_GetWindowWMInfo(window, &info)) return nullptr;
#if defined(_WIN32)
    return info.info.win.window;
#elif defined(__APPLE__)
    return info.info.cocoa.window;
#elif defined(__linux__)
    return reinterpret_cast<void*>(info.info.x11.window);
#else
    return nullptr;
#endif
}

int main(int argc, char** argv) {
    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_EVENTS) != 0) {
        std::cerr << "SDL init failed: " << SDL_GetError() << "\n";
        return 1;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Veldren: The Unwritten Age",
        SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
        1280, 720, SDL_WINDOW_RESIZABLE | SDL_WINDOW_ALLOW_HIGHDPI);
    if (!window) return 2;

    int width = 1280, height = 720;
    SDL_GetWindowSize(window, &width, &height);

    VeldrenRenderer renderer;
    if (!renderer.initialize(nativeWindow(window), width, height)) {
        std::cerr << "Failed to initialize Filament.\n";
        return 3;
    }

    // Optional direct GLB argument is useful while native world binding is brought online.
    if (argc > 1) renderer.loadGlb(std::filesystem::path(argv[1]));

    bool running = true;
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_QUIT) running = false;
            if (event.type == SDL_WINDOWEVENT &&
                (event.window.event == SDL_WINDOWEVENT_SIZE_CHANGED ||
                 event.window.event == SDL_WINDOWEVENT_RESIZED)) {
                renderer.resize(event.window.data1, event.window.data2);
            }
        }
        renderer.render();
    }

    renderer.shutdown();
    SDL_DestroyWindow(window);
    SDL_Quit();
    return 0;
}
