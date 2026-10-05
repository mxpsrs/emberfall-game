# Renderer CPU and animation-buffer repair

Scope: improve the existing C++ Scene / Filament runtime and editor foundation. No engine migration, visual-quality reduction, server behavior or player-data change. This compatible client update does not require maintenance.

## Measured bottlenecks

The full first-draw profiler now includes the actual scenery preparation step, terrain construction, production asset bindings and native Filament resource creation. The old room-only fixture missed these costs. Node Inspector sampling found repeated road-coordinate projection/allocation during terrain grading and repeated GPU geometry creation for changing CPU-generated character poses.

## Changes

- Road views cache immutable transformed endpoints, widths and normals by native Scene revision. Reads still observe mutations inside a native batch, parent transforms, component edits and load/undo. Terrain distance/grade calculations read each endpoint once per segment.
- Filament attribute conversion avoids two temporary typed-array views per vertex and computes bounds in the same pass.
- CPU-generated character/cape poses keep their existing vertex output. Filament reuses presentation buffers by source mesh, topology and simultaneous pose slot. Different poses visible together use separate buffers; identical poses can share. The fast update uploads only positions and changed normals; appearance changes refresh color/material/UV data. Native renderable bounds follow the animated geometry.
- Existing native residency owns retirement. Mutable staging stays available for updates, then retires with the buffer, shared-index references and pose-cache references. No new authoritative Scene or asset ownership is introduced.

## Reproduction and measurements

```sh
PROFILE_BASELINE=f3f10ae2e6c81ed90a6d488f8a85ad0b0a53f6b4 PROFILE_FRAMES=32 PROFILE_CPU=/tmp/before.cpuprofile PROFILE_OUTPUT=/tmp/before.json node scripts/qa/profile-first-render.cjs
PROFILE_FRAMES=32 PROFILE_CPU=/tmp/after.cpuprofile PROFILE_OUTPUT=/tmp/after.json node scripts/qa/profile-first-render.cjs
```

Both recorded runs used the Inspector sampler, real bundled Filament NOOP, the generated/native world and the same Willowcross view. The warm sample uses frames 12–31.

| Measurement | v216 | Updated |
| --- | ---: | ---: |
| First draw | 20,842.7 ms | 14,521.0 ms |
| Terrain preparation in first draw | 8,989.0 ms | 6,007.8 ms |
| Median warm CPU draw | 144.0 ms | 127.7 ms |
| Maximum sampled warm CPU draw | 234.1 ms | 204.3 ms |
| Legacy geometry bytes after 32 frames | 48,233,102 | 31,365,462 |
| Legacy mesh allocations after 32 frames | 380 | 353 |
| Active legacy renderables | 1,718 | 1,718 |
| Active canonical renderables | 1,904 | 1,904 |
| Failed / pending asset loads at final frame | 0 / 0 | 0 / 0 |

The first draw is 30.3% faster and the warm median 11.4% lower in this reproduction. These timings exclude world generation/migration. They do not establish phone FPS, GPU speed, reliable Safari startup or 39-player capacity. The CPU frame cost remains substantial. Node process RSS was 986 versus 1,011 MiB at the final sample and the Filament WASM heap was 45 versus 54 MiB: do not claim total device memory decreased. The established allocation improvement is fewer retained animated geometry buffers.

The last idle-retirement cleanup was tested after the full run had loaded its source; it only releases staging when native residency retires an unused pose. The focused real-Filament test verifies that cleanup, reconstruction and shared index accounting.

## Validation

Road ownership/terrain parity, renderer contract, real Filament runtime, character material parity and static/animated geometry tests pass. The animation regression checks 40 updates against fresh geometry, two simultaneous poses, equipment subsets, recoloring, actual native bounds, retirement and reconstruction. Production build and built-assets checks are required before publication. Detailed results are in `docs/qa/runtime/renderer-cpu-and-pose-buffers-2026-09-29.json`.
