cmake_minimum_required(VERSION 3.22)
project(VeldrenNative LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(SDL2 CONFIG REQUIRED)
find_package(filament CONFIG REQUIRED)

add_executable(veldren
    src/main.cpp
    src/VeldrenRenderer.cpp
)

target_include_directories(veldren PRIVATE src)
target_link_libraries(veldren PRIVATE
    SDL2::SDL2
    filament::filament
    filament::gltfio
    filament::gltfio_core
    filament::filament-iblprefilter
    filament::utils
)

target_compile_definitions(veldren PRIVATE
    VELDREN_CONTENT_ROOT="${CMAKE_SOURCE_DIR}/../migration/content"
    VELDREN_ASSET_ROOT="${CMAKE_SOURCE_DIR}/../assets"
)
