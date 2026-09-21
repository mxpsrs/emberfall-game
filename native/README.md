# Veldren native C++ / Filament runtime

This directory is the native rendering runtime for Veldren. It is intentionally inside
the Veldren repository and consumes the migration's local assets. It does not modify
or depend on a Vervesis Studio workspace.

## What this establishes

- native C++ executable rather than a browser renderer or JavaScript Filament wrapper
- Filament Engine / SwapChain / Renderer / Scene / View / Camera lifecycle
- gltfio GLB loading from local files
- stable 1:1 rendering baseline: dynamic resolution disabled, FXAA enabled
- resize-safe camera projection and viewport
- deterministic ownership and cleanup of loaded Filament assets

The preserved migration remains authoritative for Veldren content:
`../assets` contains local production/source assets and `../migration/content`
contains the 339 converted source scenes and game-data snapshots.

## Build

Install a current Filament SDK and SDL2 development package, then configure this
folder with CMake. Point CMake's prefix path at the installed Filament/SDL2 package
locations when they are not globally discoverable.

    cmake -S native -B native/build -DCMAKE_BUILD_TYPE=Release
    cmake --build native/build --config Release

For an immediate renderer smoke test, pass any local production GLB:

    native/build/veldren assets/models/<category>/<model>.glb

## Next binding boundary

The next native layer reads `migration/content/scenes/*.json`, resolves each stable
world/gameplay identity to its local GLB, and applies transforms to Filament entities.
Gameplay authority remains outside render entities so combat, saves, networking,
quests and shared-world state are not coupled to the renderer.
