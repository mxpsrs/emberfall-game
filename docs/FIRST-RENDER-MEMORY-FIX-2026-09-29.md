# First-render memory repair — 2026-09-29

The latest 82-second phone recording resets startup three times around “Entering the realm.” No automatic reload path or corresponding server error was found. A browser memory termination is plausible, but the recording alone does not prove its cause.

## Confirmed problem and change

The cached-building painter expanded every instance of each indexed wall, roof and prop into a separate triangle buffer. Repeated geometry was uploaded again for each building. Buildings now use the existing shared indexed mesh path, with individual native transforms and bounds. Authored face-only geometry keeps its previous material handling. The accepted native Scene and asset pipeline remain in use, including canonical model streaming.

This is a compatible client renderer update. It does not change server behavior, player data or the shared-world protocol, and needs no maintenance interruption.

## Reproduction

`scripts/profile-first-render.cjs` constructs the full generated world, migrates it into the native Scene, prepares terrain and runs the production painter against the actual bundled Filament NOOP backend. It uses production asset bindings and loads canonical assets locally. The fixture is the Willowcross residence, 1112 × 512 viewport, zoom 118, mobile quality and 197 terrain chunks.

```sh
PROFILE_BASELINE=fe4346e648f420008dc5da47070d3ee2e2506b83 PROFILE_OUTPUT=/tmp/before.json node scripts/profile-first-render.cjs
PROFILE_OUTPUT=/tmp/after.json node scripts/profile-first-render.cjs
```

| Measurement | v215 | Repair |
| --- | ---: | ---: |
| First-frame legacy geometry allocation | 122,739,850 bytes | 30,811,504 bytes |
| First-frame total tracked GPU resource bytes | 129,730,354 | 37,802,008 |
| Filament WASM heap after first frame | 134.5 MiB | 45 MiB |
| First-frame process RSS | 1,180 MiB | 961 MiB |
| First-frame discarded upload staging bytes | 133,059,840 | 32,429,040 |
| Streaming memory pressure after eight frames | true | false |
| Asset failures after eight frames | 0 | 0 |

Geometry allocation falls 74.9%. After eight frames, the repaired path has loaded 14 canonical models instead of 2; tracked resources remain 50,741,168 bytes versus 133,291,502 bytes. Sharing increases the number of independent renderables and enables their existing culling/instancing path.

These are native renderer resource measurements, not hardware GPU memory or iPhone FPS. The test excludes browser/GPU driver allocation, rasterization and network loading. Warm CPU frame times did not improve in this fixture. The baseline overlapped the world-scene suite, so CPU timing is not a controlled comparison. Process RSS includes the Node fixture and is not Safari memory. No live 39-player capacity claim is made.

The earlier CPU-only room fixture omitted terrain and Filament resource creation. It was insufficient evidence that startup or phone performance had been repaired. This patch addresses a demonstrated memory spike; smooth phone gameplay and the cause of the reloads remain unverified.

## Regression checks

- Real Filament test: 100 repeated building parts share one 188-byte vertex/index allocation; scale, shear, placement and grounding match; steady transforms are reused; one changed transform updates once; removing a part removes its renderable.
- Renderer configuration, real Filament runtime and character parity tests pass.
- Full world-building Scene test passes for 235 buildings, native ownership, hierarchy, geometry, doors, surfaces and save/unload/load.
- Detailed measurements: `qa/first-render-memory-2026-09-29.json`.
