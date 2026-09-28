# Phase 4 world performance and streaming

Status: **IN PROGRESS**. This is an implementation record, not acceptance.
Repository: `mxpsrs/emberfall-game`; branch: `phase4-world-performance-wip`.
The branch was created on GitHub from the exact accepted Phase 3 commit
`3f0deb4daf83a8aec108f5c896af1d47cb0e2542` and independently queried before work.
Phase 1 and Phase 2 remain accepted at `f49ef4896b910a57bfc3dbd56948fcebca830c30`
and `9e72e514610f6e8de01ae782e406e10fc5a8443a`.

## Implemented instrumentation

`renderer-filament.js` exposes an on-demand `diagnostics()` snapshot of the
existing Phase 2 owners and legacy compatibility geometry. Setting the explicit
development flag `window.VELDREN_PERFORMANCE = true` records bounded frame
submission/transform counts, synchronization/submission times and first-render
time relative to viewport navigation. It stores only the current frame. Normal
production frames do not enumerate resource maps or read the clock for these
measurements. Existing quality, draw distances and world content are unchanged.

`asset-draws.js` reports active renderables and submitted primitive bindings from
its existing pools, without collecting per-entity histories. The browser harness
counts actual WebGL draw and instanced-draw calls in development only. Those
counts include renderer passes and are distinct from application mesh packets.
GPU byte values are known buffer/texture allocation estimates, not driver VRAM.

## Baseline reproduction

```sh
npm run build
node tests/filament-static-transforms.cjs
node tests/renderer-filament.cjs
node scripts/phase3-native-performance.mjs /path/to/exported-world.json
node scripts/phase4-performance-browser.mjs
```

The browser harness uses the actual built Worker and a new disposable local
account/database. It captures three frames each in a populated editor, a dense
settlement, wilderness, a building-heavy area, an overview, and ordinary gameplay.
`VELDREN_PLAYWRIGHT` and `VELDREN_CHROMIUM` select the installed tools.
`VELDREN_PERFORMANCE_LABEL` selects a report folder under ignored `.qa/phase4/`.
Reports distinguish unavailable measurements from zero. Software GPU timings
must not be presented as hardware FPS or physical mobile/Safari acceptance.

The current unchanged native WorldDocument fixture has 259 scenes, 20,856
entities, and 15,496 overworld entities. The new baseline measured load at
9,251.56 ms, cold hierarchy at 1,018.82 ms and cold picking at 1,273.43 ms.
Native transform median was 0.0304 ms; post-transform picking median was
0.5701 ms. These are one local Node/WASM run, not hardware-independent targets.
The static Filament fixture retains 256 first-frame transform updates, zero
stationary updates, and one update for one moved object.

The six-view graphical baseline capture is still in progress. Initial samples
that included skipped Filament presentations are not accepted measurements. The
harness now waits for model loads and samples presented frames only. The native
baseline and instrumentation tests above have passed; no full browser-baseline
or Phase 4 acceptance is claimed at this checkpoint.

## Next implementation — not yet completed

The intended acceleration is one native XZ cell partition with vertical bounds,
separate static/dynamic membership, and conservative handling for objects spanning
many cells. It will reference stable Scene IDs and derived bounds only. The actual
world is a broad outdoor surface with small dense settlement clusters, long roads,
and buildings spanning cell edges; a cell scheme allows the same index to serve
visibility and residency demand without another authored world.

The following remain implementation/acceptance gates: incremental membership,
frustum/category distance evaluation, existing Phase 2 LOD selection with
hysteresis, native compact render preparation, compatible instancing, explicit
cell residency states and existing asset leases, profile memory budgets, editor
focus/selection/history integration, populated stress/soak, mobile-sized browser,
native/desktop regressions, and measured before/after improvement. No optional
occlusion implementation is claimed.

Nothing has been deployed or merged into main. Production data is untouched.
Spirits remain retired. Phase 5 and Phase 6 are outside this work.
