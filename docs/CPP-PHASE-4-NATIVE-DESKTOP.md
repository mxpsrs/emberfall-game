# C++ conversion Phase 4 — native desktop checkpoint

23 September 2026. This checkpoint adds a real native C++ desktop executable.
It does not embed the website, start a browser, or execute JavaScript.

## Runtime

- `native/build/veldren-desktop` links the same `core.cpp` that produces the
  browser's standalone WebAssembly module.
- The client reads ABI 11 render and animation batches directly and submits one
  batched actor mesh per pass.
- The interactive renderer dynamically loads SDL2, creates an OpenGL 3.3 core
  context, and performs a depth-only shadow pass plus the main lit pass.
- WASD movement updates actor 1 inside the shared core, mouse motion rotates the
  native follow camera, shadows follow the player, and Escape exits.
- Linux and Windows platform loading are implemented. The checked environment
  can compile and exercise Linux; it has no Windows cross-compiler or graphical
  display, so no Windows binary or on-screen GPU certification is claimed.

## Desktop graphics profile

The Ultra profile targets 2560×1440, 4× MSAA, a 4096 directional shadow map,
soft PCF filtering, 16× anisotropic filtering, a 900-unit far plane,
2.5× foliage density, and 2× effects. The High fallback targets 1920×1080 with
a 2048 shadow map and lower—but still desktop-class—distance and density.

The desktop path decodes the full 4096×4096 world atlas and full 1024×1024
ground atlas. It also loads full-geometry native conversions of all eleven local
Kenney nature GLBs. The deterministic conversion script uses Assimp and performs
no polygon reduction. Browser mobile atlases are not used by this executable.

## Verification

The native core test, native desktop C++ test, 240-frame headless desktop smoke
test, and standalone WebAssembly ABI test pass. The smoke test validates and
decodes both full-resolution texture atlases and parses every native model before
running 512 actors through the shared core. The measured 240-frame simulation
portion completed in roughly 6–8 ms on the build machine; this excludes GPU draw
time and is not an end-user FPS measurement.

The remaining production migration is content integration: the current native
checkpoint proves the executable, renderer, asset, and shared-core path, but it
does not yet replace every browser UI, quest presentation, network adapter, or
world-placement dataset with native equivalents.
