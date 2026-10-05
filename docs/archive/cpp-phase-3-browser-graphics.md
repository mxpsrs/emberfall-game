# C++ conversion Phase 3 — browser graphics

23 September 2026. Phase 3 keeps the C++ render and animation batches from
Phase 2 and improves how the browser presents them within a fixed GPU and memory
budget.

## Why the source assets looked better in Godot

Godot supplied a complete rendering context around the imported geometry:
environment light, physical exposure, tone mapping, contact shading, shadows,
and high-quality texture sampling. Veldren's browser conversion retained the
geometry and base color, but its shared atlas path deliberately flattened much
of that context. The visual difference was therefore primarily the rendering
pipeline, not a different mesh.

## Phase 3 changes

- Filament now uses ACES tone mapping, calibrated color grading, physical camera
  exposure, and a compact spherical-harmonic sky light.
- Desktop keeps SSAO, temporal dithering, three shadow cascades, and 16×
  anisotropic filtering. Coarse-pointer/mobile devices retain the cheaper path:
  no SSAO, one 1024 shadow cascade, and 8× anisotropy.
- Browser-generated mipmaps average sRGB color in linear light. This avoids the
  dark, muddy reduced textures produced by averaging encoded color bytes.
- Decoded GLB source data uses a least-recently-used budget of 32 MiB on mobile
  and 96 MiB on desktop. Existing mesh residency remains bounded at 24/48 MiB,
  and mobile/desktop backing resolutions remain capped.
- The direct GLB loader continues to use Filament's glTF asset loader, which
  preserves authored glTF material and hierarchy data. The highly batched world
  atlas remains the compatibility path for current scenery.

## Verification

The native C++ executable and standalone WebAssembly ABI tests pass. Filament's
renderer contract, authored-character parity, and an iPhone-sized NOOP runtime
pass with the new lighting stack. Render-quality, texture-skinning, native GLES
bone-addressing, desktop rendering, built-asset byte parity, and production build
checks pass. Authored motion, creature animation/rendering, and packed software
geometry checks also pass.

These are deterministic local and NOOP/native-GLES checks, not a physical-device
FPS certification. A physical mobile and desktop walkthrough remains the correct
way to judge final exposure and sustained GPU frame time after publication.

Phase 4 is not started. Full-resolution assets, longer draw distance, denser
foliage, stronger effects, and reuse of the same C++ core in a native desktop
client remain reserved for explicit authorization.
