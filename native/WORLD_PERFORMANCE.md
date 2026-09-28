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

The completed six-view graphical baseline is recorded in
`docs/qa/phase4-world-performance/baseline-browser.json`. The disposable local
Worker authenticated `/play`; all six views rendered with zero browser page
errors. Dense settlement submitted 1,537 application packets and 2,177 WebGL calls;
wilderness submitted 1,397 packets / 2,057 calls; building-heavy submitted
1,214 packets / 1,703 calls. Calls include renderer passes and existing automatic
instancing. Compatibility geometry retained approximately 125 MB, 208 MB and
291 MB respectively, rising to 516 MB after the overview. This identifies a real
resource-lifetime target; it is not yet an improvement claim. Native compilation
ran concurrently, so these CPU times are descriptive rather than isolated FPS
benchmarks. Exact camera states and the three frame samples are retained.

## Native partition checkpoint

One native 32-unit XZ grid now references canonical Scene IDs and conservative
world-space bounds. Static and dynamic memberships are separate sets inside the
same cells. Objects covering more than 64 cells use a conservative overflow
list. Queries intersect bounds, never just pivots. Eight transformed asset-bound
corners support parent rotation, scale, and affine transforms. Building, bridge,
road and quarry components supply structural extents; uncertain procedural
geometry deliberately retains conservative bounds.

A bounded, optional Scene change journal updates affected entities and descendants.
Static content does no membership work on unchanged frames. Movement, creation,
deletion, component changes, inherited active state, reparenting and editor undo
feed the same journal. A fresh document, registry reimport or journal overflow
triggers an explicit rebuild. Runtime actor positions and terrain grounding are
presentation overlays and never enter WorldDocument serialization.

The browser world renderer now asks this partition for candidate objects and
buildings. JavaScript only resolves returned IDs to the existing canonical views;
transient fires/previews and relocated actors keep their existing lifetime owners.
The current broad phase includes a conservative silhouette margin. Proper native
camera-frustum evaluation is the next gate; this checkpoint does not claim it.

Tests passed: `make -C native world-performance-test scene-test editor-test`,
`node tests/world-performance.mjs /path/to/exported-world.json`, and
`node tests/editor-selection.mjs`. The actual 15,496-entity overworld contains
14,832 spatial records. A 64-unit region considered 454 candidates; unchanged
synchronization updated zero memberships. The native/WASM renderer-ID bridge
preserved the complete serialized WorldDocument exactly. Test coverage includes
large spans, transformed parents, cell movement, delete/undo/redo, reload,
static/dynamic separation, and bounded-journal recovery. These are structural
measurements, not a completed graphical performance comparison.

The following remain implementation/acceptance gates: graphical partition verification,
frustum/category distance evaluation, existing Phase 2 LOD selection with
hysteresis, native compact render preparation, compatible instancing, explicit
cell residency states and existing asset leases, profile memory budgets, editor
focus/selection/history integration, populated stress/soak, mobile-sized browser,
native/desktop regressions, and measured before/after improvement. No optional
occlusion implementation is claimed.

Nothing has been deployed or merged into main. Production data is untouched.
Spirits remain retired. Phase 5 and Phase 6 are outside this work.

## Visibility implementation (acceptance in progress)

The native partition now supplies camera-frustum candidates and conservative
six-plane world-AABB tests before geometry preparation. Filament and native
visibility consume one shared camera projection, including the asymmetric frame
anchor and pixel-locked center. Category tables select browser, mobile-browser or
native-desktop distance and projected-size policies. Large structures/terrain
retain full camera range; bounds distance, rather than pivot distance, governs
large silhouettes. Unknown procedural bounds are not projected-size culled.
Conservative terrain-relative bounds prioritize correctness until exact prepared
geometry bounds are available. No occlusion rejection is enabled.

Native visibility returns compact canonical draw packets (stable entity ID,
asset, matrix, material and shadow state) and bounded counters. The authored
renderer consumes these instead of traversing every canonical renderable in
JavaScript each frame. Lights use the same native partition for range queries,
then the existing native light-property conversion. Authored properties remain
unchanged. Browser graphical checks for this checkpoint are still running.

Culling checkpoint validation: native visibility and partition tests pass, as do
the actual-WASM bridge, canonical picking regression, static-transform renderer
test, shared-camera renderer test, and packaged-asset checks. The populated
editor rendered and accepted the hierarchy/name interaction, but the full
Inspector workflow observed a numeric Y edit remaining at zero. This is an
open acceptance blocker, not a passing graphical editor result. The focused
DOM test (including numeric edit during refresh) passes; the complete workflow
is being traced before changing accepted Inspector behavior.

## LOD integration checkpoint

`AssetRegistry::select_lod` is the single implementation of the existing Phase 2
LOD threshold decision. Optional current level and a 12% hysteresis band stabilize
runtime transitions; the original stateless registry command stays compatible.
`WorldLodState` holds current/target decisions by stable render identity, resets
on registry revision changes and retires old entries. None of this is serialized.
The partition unions authored LOD bounds. Canonical draw packets resolve their
asset natively; compatibility model instances submit a compact native LOD batch
before existing Phase 2 GPU acquisition. Both paths retain material/shadow options
and use the existing generation-safe shared model/material/texture leases.

The actual registry has **325 model definitions and zero authored multi-level
LOD sets**. Production world draws therefore remain valid LOD0, with explicit
missing-LOD diagnostics. No runtime decimation or invented lower-quality art is
introduced. Stability tests declare fixture levels referencing real model IDs;
they verify selection/lifecycle behavior, not the visual quality of nonexistent
production LOD1/LOD2 art. Authored future levels use the same registry interface.

Passed: `make -C native world-lod-test asset-test`, the rebuilt WASM target,
`node tests/world-performance.mjs /path/to/exported-world.json`,
`node tests/asset-meshes.mjs`, `node tests/renderer-filament.cjs`, and
`node tests/filament-static-transforms.cjs`. Native tests exercise 300 threshold
oscillations, exact return to LOD0, missing levels and reimport reset. Actual
Filament/NOOP resource tests cover both editor/runtime, 100 shared copies,
cancellation, failures, invalidation, 20 unload cycles and zero residual resources.
These resource tests are not substituted for browser graphical acceptance.

The traced populated-editor rerun passed Inspector numeric edits, undo/redo,
hierarchy, prefabs and modular building history without an Inspector source
change. Save/fresh-reload completion is still being verified; the earlier
numeric-input failure remains recorded until the complete rerun finishes.
