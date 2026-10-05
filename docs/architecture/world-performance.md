# Phase 4 world performance and streaming

Status: **COMPLETE — local implementation and acceptance**. The final result
and limits are in [PHASE4_ACCEPTANCE.md](../acceptance/native-phase4-acceptance.md). The chronological
checkpoint entries below retain their original status; historical open software
gates are superseded by that closeout, not by hardware-performance certification.
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
node tests/rendering/filament-static-transforms.cjs
node tests/rendering/renderer-filament.cjs
node scripts/qa/phase3-native-performance.mjs /path/to/exported-world.json
node scripts/qa/phase4-performance-browser.mjs
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
`node tests/world/world-performance.mjs /path/to/exported-world.json`, and
`node tests/editor/editor-selection.mjs`. The actual 15,496-entity overworld contains
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
`node tests/world/world-performance.mjs /path/to/exported-world.json`,
`node tests/assets/asset-meshes.mjs`, `node tests/rendering/renderer-filament.cjs`, and
`node tests/rendering/filament-static-transforms.cjs`. Native tests exercise 300 threshold
oscillations, exact return to LOD0, missing levels and reimport reset. Actual
Filament/NOOP resource tests cover both editor/runtime, 100 shared copies,
cancellation, failures, invalidation, 20 unload cycles and zero residual resources.
These resource tests are not substituted for browser graphical acceptance.

The traced populated-editor rerun passed Inspector numeric edits, undo/redo,
hierarchy, prefabs and modular building history without an Inspector source
change. Save/fresh-reload completion is still being verified; the earlier
numeric-input failure remains recorded until the complete rerun finishes.

## Resource lifetime and stable instance checkpoint

`WorldResourceResidency` now makes presentation-resource retention decisions in
C++. The Filament adapter submits the existing owners' allocation inventory and
releases the returned IDs. Profiles budget estimated GPU allocations / retained
staging bytes at 128/64 MiB for mobile browser, 256/128 MiB for browser, and
1024/512 MiB for native desktop. Canonical geometry and texture allocations are
charged as reserved shared GPU bytes. These are allocation estimates, not driver
VRAM or complete browser heap budgets. Visible allocations are protected even
when they exceed a budget; `overBudget` and pinned byte counts expose that case
instead of reducing quality or dropping visible objects.

Idle resources follow a bounded grace interval and least-recent-use order. An
eviction remains pending until the next inventory acknowledges release; reuse
cancels a pending eviction. Resource records disappear after acknowledgement.
GPU destruction now also retires entity-manager IDs. Shared mesh, terrain and
compiled-building caches invalidate their entry when their staging/GPU buffer is
retired, allowing exact reconstruction from the existing source geometry on
return. None of these operations unloads canonical entities, changes selection,
writes history, edits a WorldDocument, or affects gameplay/network identities.

Canonical draw pools now bind instances by the stable identity already supplied
by the native packets and generated modular draws. Visibility reordering and
removing an earlier instance no longer move every following slot. They retain
the Phase 2 shared model/material/texture leases and Filament's existing automatic
instancing. Different material/shadow options and model generations stay in
separate compatible pools. No new geometry merger or instancing backend exists.

Passed: `make -C native world-residency-test`, rebuilt WASM,
`node tests/world/world-performance.mjs .qa/phase4/baseline-complete/world.json`,
`node tests/assets/asset-meshes.mjs`, `node tests/rendering/filament-static-transforms.cjs`,
`node tests/rendering/renderer-filament.cjs`, normal `npm run build`, built-asset checks,
editor selection regression, and native desktop test/headless smoke. The native
resource test covers 1,000 travel cycles, CPU/shared accounting, active-resource
protection, reacquisition and release acknowledgement. Actual Filament tests
verify zero transform uploads on reordered/culled stable instances, one upload
for one moved instance, eviction and exact byte reconstruction. Complete saved
world content remains identical across native residency operations.

The earlier populated-editor rerun completed save/fresh reload as well as
Inspector, hierarchy, prefab and building history checks with zero page errors;
its prior numeric-input blocker is resolved without changing Inspector code.
A new populated travel/revisit browser comparison is running. This is still a
Phase 4 checkpoint: explicit asynchronous cell residency/prefetch, full stress
and mobile graphical acceptance, and measured final comparisons remain open.

### Reconstructible upload staging

The first travel run exposed a visible working set slightly above the staging
budget in the building-heavy view. A further native decision now discards upload
staging immediately when the existing cache supplies a reconstruction callback.
The live GPU resource remains resident and can be submitted again without an
upload. Shared index staging stays available until its last mesh reference is
released; dynamic arrays and non-reconstructible buffers remain accounted for.
This reduces duplicate CPU storage rather than evicting visible geometry.

The native resource test, rebuilt WASM, real Filament transform/retirement/cache
reconstruction test, renderer contract and canonical resource tests pass after
this change. The browser harness can restrict viewpoints and resolves fixed
camera targets once, so test navigation no longer repeatedly queries every
entity. The first resource checkpoint is remotely verified at
`1f32af18e5caf9e53500f175e29242c8a48148d2`. Its graphical receipts are kept
separate from the staging refinement's verification.

## Native cell resource scheduling checkpoint

`WorldStreaming` schedules asynchronous resource demand in the existing native
32-unit cells. It shares asset/material generations across cells, prioritizes
visible demand and canonical editor selection pins, prefetches nearby canonical
renderers, cancels stale pending work, and reports loading/resident/failed/
unloading/unloaded cell states. Browser/mobile/desktop profiles allow 4/2/8 loads
in flight. Speculative prefetch stops above 80% of the corresponding GPU budget;
idle retention is bounded. A changed adapter epoch regrants resources after
registry or document reload, and late completion of a cancelled lease is ignored.

The JavaScript adapter only marshals demand and completion and acquires/releases
the existing Phase 2 shared model leases. Compatibility imported submeshes join
through actual draw demand; their existing geometry fallback remains available
while queued. Source-derived procedural terrain/building geometry uses the
bounded reconstruction/retirement path described above. Canonical entities,
world definitions and history remain resident: this is resource streaming, not
world-data paging. No duplicate asset registry, entity store or renderer exists.

Passed: native scheduler tests, rebuilt WASM, actual WASM/Filament integration,
WorldDocument/LOD/residency regressions, static-transform reconstruction and
renderer contract, and normal production build. Integration checks cover the
two-load mobile limit, shared allocations, cancellation, remote selection pins,
undo, generation invalidation, unchanged-definition registry reload, document
reload, 12 travel/unload cycles and zero retained allocations on teardown.
Populated graphical verification of this new scheduler is the next gate.

Committed graphical receipts for the preceding checkpoints are under
`docs/qa/phase4-world-performance/`: `residency-browser.json` (10 viewpoints),
`residency-mobile-browser.json` (6), and `staging-final-browser.json` (6).
All completed with zero page errors, including authenticated local gameplay.
The first checkpoint reduced retained compatibility GPU allocations after the
overview from 516.38 MB baseline to 124.71 MB, then 122.61 MB on revisit.
Its staging overages remained visible in diagnostics and motivated the second
checkpoint. With that refinement, retained upload staging after dense/wilderness
travel and return was 1.66 MB versus 223.59 MB baseline at wilderness. Shared index
staging is counted separately by the native budget. These are allocation/lifetime
comparisons; concurrent SwiftShader runs do not establish hardware FPS gains.

Phase 4 remains in progress. Production has no authored LOD1/LOD2 art, physical
mobile/Safari and hardware performance acceptance are unverified, and cell
streaming graphical travel/soak and final editor regressions remain open. No
production deployment, main merge, Phase 5 or Phase 6 work has occurred.

### Completed software verification of the cell scheduler

The implementation was pushed and its complete 1,310-file GitHub tree verified at
`06932597af7263fa2d9dff0f4601f93121fd34c8`. The populated desktop run completed 10
views, including all four travel viewpoints twice and authenticated gameplay;
the mobile-sized run completed six views. All 48 measured frames presented with
zero failed loads and no reported GPU/staging budget overruns. Three desktop
samples caught one asynchronous load in flight; every viewpoint's final sample
had drained its queue. Native stress covered 1,000 travel cycles, and actual
WASM/Filament covered 12 unload/reload cycles with complete resource release.

The full populated editor regression also passed Inspector numeric/name edits,
undo/redo, preserve-world reparent, prefab updates, grouped modular building
edits, verified save, fresh reload and editor isolation, with zero page errors.
Representative mobile gameplay, mobile overview, desktop return overview and
fresh editor reload screenshots were visually inspected. Raw receipts and the
checkpoint report are committed under `docs/qa/phase4-world-performance/` and
`docs/archive/phase4-world-performance-checkpoint-2026-09-28.md`.

The final desktop overview retained 223.44 MB of compatibility GPU buffers,
versus 516.38 MB in the baseline route; its revisit retained 225.06 MB after
1,369 cumulative evictions. The final policy retains reusable GPU cache up to
its own budget instead of evicting it to satisfy a duplicate CPU staging budget.
Physical-device/hardware performance, extended hardware soak and future authored
LOD art remain unverified. Phase 4 is still in progress, not formally accepted.
