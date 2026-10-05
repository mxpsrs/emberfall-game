# Phase 4 world performance and resource streaming acceptance

Repository: `mxpsrs/emberfall-game`. Branch: `phase4-world-performance-wip`.
Accepted Phase 3 base: `3f0deb4daf83a8aec108f5c896af1d47cb0e2542`.

Status: **COMPLETE — local implementation and acceptance**, 2026-09-28.
The native suite, populated desktop/mobile views, editor persistence regression
and six-pass populated travel soak passed. Hardware/device certification is
explicitly outside this local result; its remaining limits are recorded below.

## Scope and ownership

The accepted scope is the local World Performance and Resource Streaming
foundation: native spatial preparation, conservative visibility, existing asset
LOD selection, stable instance reuse, bounded presentation allocation lifetime,
cell resource scheduling and editor/runtime integration. Canonical Scene entities
and world data remain resident and authoritative. Existing Phase 2 owners retain
asset definitions, dependency leases, decoding and Filament resource ownership.
No second scene, asset registry, history or persistence system was introduced.

| Area | Implementation and evidence |
| --- | --- |
| Spatial partition | Native 32-unit XZ cells, conservative bounds/overflow, separate static/dynamic membership and incremental Scene updates. Native tests cover transformed parents, large extents, movement, deletion/undo and reload. The populated 14,832-record fixture considered 454 records in a 64-unit region. |
| Visibility | Native frustum, category distance and projected-size policies produce compact canonical draw packets. Large or uncertain procedural extents retain conservative visibility; no optional occlusion rejection is enabled. |
| LOD | The existing native AssetRegistry chooses levels with hysteresis; stable identities retain state and generation changes reset it. Tests cover 300 boundary oscillations, exact LOD0 return and reimport. Production assets have no authored multi-level sets, so production draws truthfully remain LOD0. |
| Instances | Existing compatible Filament pools retain stable instance identities and shared model/material/texture allocations. Reordering or culling an earlier identity causes zero stationary transform uploads; moving one identity causes one. No incompatible materials, shadow settings or generations are merged. |
| Resource lifetime | Native profile budgets, grace and LRU govern existing allocations. Retired buffers reconstruct from the original geometry; uploaded reconstructible staging can be discarded without destroying visible GPU geometry. Active allocations are protected and any overage is reported. |
| Cell resources | Native scheduling shares resources between cells, prioritizes demand/selection, limits concurrency, prefetches eligible canonical renderers, cancels stale work and retires idle resources. Epochs handle registry/document reload; stale completion cannot revive a cancelled lease. |
| Editor safety | Selection pins, transforms, undo, prefab/building history, save and exact fresh reload preserve canonical identity and data. Streaming never writes user history or world content. |
| Runtime integration | Desktop/mobile-sized populated views and authenticated local gameplay present successfully. Existing editor/runtime separation and native desktop headless behavior remain intact. |

## Evidence already completed

- Implementation: `06932597af7263fa2d9dff0f4601f93121fd34c8`.
- Verified checkpoint/evidence: `40d2d3d762f1b34ff86cdd15bc214ebe2dbdafc1`.
- All five native performance targets passed together on that exact source:
  partition, visibility, LOD, residency and streaming. Their full output is in
  `docs/qa/phase4-world-performance/native-closeout.json`.
- Native resource and cell tests each cover 1,000 travel cycles. Real
  WASM/Filament tests cover shared allocations, two-load mobile concurrency,
  cancellation, selection pins, invalidation, reload and 12 unload/reload cycles
  with complete resource release.
- Earlier actual-WASM, static-transform/reconstruction, normal build, packaged
  asset, selection and native desktop/headless checks passed on the implementation.
- `streaming-desktop-browser.json` records ten populated views, including two
  travel passes and authenticated gameplay. `streaming-mobile-browser.json`
  records six mobile-sized views. All 48 frames presented without failed loads
  or allocation overruns. Three frames caught one load in flight; each view's
  final sample had a drained queue.
- `streaming-authoring-browser.json` records the full populated Inspector,
  hierarchy, prefab/building, undo/redo, verified save, fresh reload and isolation
  workflow with zero page errors.

The reusable validator is `scripts/qa/phase4-verify-receipts.mjs`. It preserves
transient loads in the evidence, checks concurrency and budgets, and rejects
failed loads or a final sample that has not settled.

## Final soak and closeout

`streaming-soak-browser.json` records six settlement/wilderness travel passes,
the initial populated editor and authenticated gameplay: 14 views and 42
presented samples, with zero page errors, failed/pending loads in those samples,
or reported allocation overruns. Peak estimated GPU/staging allocations were
257,077,080 / 5,782,332 bytes against the browser's 268,435,456 / 134,217,728-byte
budgets. Wilderness resource counts rose to 727 during warmup, then retired to
598. The last two wilderness passes both retained exactly 235,311,852 GPU bytes,
5,282,172 accounted staging bytes, two streamed resources and 195 tracked cells.
This is bounded-allocation evidence across that route, not a claim that every
possible browser or driver allocation has been proven leak-free.

The complete validated browser evidence comprises 30 views and 90 presented
samples across desktop, mobile-sized and soak runs. There were zero page errors,
failed loads or sampled allocation overruns. All final viewpoint samples settled.
The late wilderness screenshot was inspected after retirement/reconstruction.
`docs/qa/phase4-world-performance/closeout-results.json` contains the generated
validation summary and per-pass resource counts. No engine source changes were
needed during this closeout; the new reusable receipt validator and records
complete the available local acceptance work.

This record supersedes historical open software-gate statements in
`WORLD_PERFORMANCE.md` and the earlier checkpoint report. It does not convert
the hardware, authored-art or hosted-capacity limitations below into passes.

## Measured gains and limits

The baseline overview retained 516.38 MB of compatibility GPU buffers; the final
implementation retained 223.44 MB, then 225.06 MB on revisit. Wilderness upload
staging fell from 223.59 MB to 1.66 MB. Spatial candidate counts and zero unchanged
transform uploads provide structural evidence in addition to the memory results.

These numbers describe known allocations and recorded routes, not full browser
heap, driver VRAM, hardware FPS or pixel-identical camera comparisons. Raw camera
states and timings remain in the receipts. CPU timings from SwiftShader runs are
not physical-device performance certification.

Hardware FPS/long-duration physical-device soak, iPhone/Safari behavior and the
visual quality of future authored LOD1/LOD2 assets remain unverified. Resource
streaming does not page canonical world data or remove the compatibility source
payload. Native desktop evidence includes algorithms and headless regressions,
not a new full-world hardware-rendered desktop acceptance run. The hosted
39-player capacity requirement remains separate and unverified here.

No deployment, main merge, production-data changes, Phase 5 or Phase 6 work is
part of this closeout.
