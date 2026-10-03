# Veldren native runtime

This directory is the replacement boundary for browser gameplay code. Game simulation,
visibility, asset loading, animation state, and rendering move into C++. Browser code is
limited to page UI, authentication, input forwarding, networking transport, and loading
the compiled WebAssembly module.

`make test` builds and runs the core as a native executable. `make wasm` produces a
standalone WebAssembly module without generated JavaScript glue when Emscripten is
available.

Production startup requires this module. Actor interpolation, species speeds, slow
effects, crowded-world update budgeting, world-grid A* pathfinding, gameplay random
rolls, skill progression, combat levels, accuracy, maximum hits, combat XP, gathering,
cooking, firemaking, smelting probabilities, inventory capacity, crafting-capacity
checks, bank transfer quantities, and coin debits run here. `dist/native-runtime.js`
loads the module and marshals browser state across the ABI.

Browser builds are verified with Emscripten 4.0.10. The browser and asset worker
provide the standalone module's WASI environment hooks and `fd_close` returning
BADF (no filesystem descriptors). ABI 19 also offers reusable packed visible-draw
and LOD transfer buffers and bounded native Scene payload paging. See
`docs/RENDERER-ENGINE-UPGRADE-2026-09-30.md` for formats, preservation guarantees,
test results and performance limits. `make world-payload-test` verifies paging
with serialization, editor history, collision and hierarchy queries.

ABI 16 adds indexed, hierarchy-aware footprint queries for transformed structural
collision and room/stair-opening queries. It also resolves permanent point lights from native Scene components,
including hierarchy activation, world transforms, scaled radii and day/night
intensity. The browser submits those resolved sources to the renderer.

The Phase 1 native-gameplay baseline was published as Site version 180. Stateful
action/combat scheduling, quest checks, world timers, navigation, and core inventory
transactions now cross this ABI. Save normalization and server-authoritative networking
remain adapters around the shared core. Browser JavaScript remains an input/network/UI
adapter; do not add new gameplay rules to the legacy client.

## Render and animation batches

ABI 16 keeps actor interpolation state inside each native actor record, resolves combat accuracy and maximum-hit rules in C++, and returns one
packed render-state batch per simulation step. Each 32-byte row contains the actor ID,
interpolated position, smoothed heading, gait phase, blend, speed, and motion flags.
The browser submits animation events as a second packed batch; C++ resolves idle,
walk, run, hit, attack, cast, throw, and death priority plus base-clip blending, then
returns the final animation state in place. Browser renderers consume those results and
remain responsible only for asset-specific mesh submission and presentation.

## Phase 3 — browser visual fidelity

Phase 3 is the browser GPU and memory pass. It addresses the gap seen when the
same source assets are opened in Godot: an engine-grade lighting, exposure,
tone-mapping, shadow, texture-filtering, and material-import path makes the source
geometry read better than a flat base-color-only conversion. The browser keeps the
Phase 2 C++ render/animation batches, adds Filament ambient lighting and ACES output,
uses gamma-correct mipmaps and stronger anisotropic filtering, and bounds both mesh
and GLB source residency. Full-resolution assets, longer draw distance, denser
foliage, and stronger effects remain Phase 4's native-desktop scope.

## Phase 4 — native desktop client

The native desktop target is a C++ executable, not a web view. It links the same
`core.cpp` used to produce the browser WebAssembly module and consumes the ABI 16
render and animation batches directly. Its Ultra profile targets 2560×1440 with a
4096-pixel directional shadow map with PCF filtering, 16× anisotropic filtering,
4× MSAA, a 900-unit far plane, 2.5× foliage density, and doubled effect density.

The renderer loads the full 4096 world atlas, full 1024 ground atlas, and native
OBJ conversions of all eleven local Kenney nature GLBs. These conversions preserve
the source geometry and are reproducible with `scripts/build-native-models.sh`;
there is no JavaScript asset or runtime step.

The desktop window is directly playable with WASD movement and mouse camera
rotation; Escape exits. Movement targets are written back into the shared C++
actor world rather than maintained as a separate renderer-only position.

Build and verify on Linux:

```sh
make -C native desktop-test desktop-smoke
cd native && ./build/veldren-desktop --assets=..
```

The CMake target supports Linux and Windows. Both require zlib; the interactive
runtime loads SDL2 dynamically (`libSDL2-2.0.so.0` or `SDL2.dll`). A headless mode
validates full-resolution textures/models and the shared simulation without a
windowing system:

```sh
native/build/veldren-desktop --headless --frames=240 --assets=.
```
