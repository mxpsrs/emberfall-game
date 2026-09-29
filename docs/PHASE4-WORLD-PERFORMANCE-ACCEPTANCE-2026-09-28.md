# Phase 4 world performance and resource streaming — local acceptance

Status: **COMPLETE — local implementation and acceptance**, 28 September 2026.
Repository: `mxpsrs/emberfall-game`; branch: `phase4-world-performance-wip`.
Accepted Phase 3 base: `3f0deb4daf83a8aec108f5c896af1d47cb0e2542`.

The implementation is at `06932597af7263fa2d9dff0f4601f93121fd34c8`; the
preceding independently verified evidence checkpoint is
`40d2d3d762f1b34ff86cdd15bc214ebe2dbdafc1`. This closeout adds verification and
records without changing the tested engine source. Its commit message is
`Complete Phase 4 local performance and streaming acceptance`.

## Completed scope

Native spatial partitioning and visibility feed compact render preparation;
existing native asset LOD selection has hysteresis and stable identities;
compatible instances share resources without redundant stationary transform
uploads; native memory policy retires old allocations and reconstructible upload
staging; native cell scheduling coordinates existing asset leases, selection pins,
prefetch, cancellation and reload epochs. Canonical Scene/world data, Phase 2
asset ownership and Phase 3 editor/history/persistence remain authoritative.

## Final evidence

| Gate | Result |
| --- | --- |
| Native algorithms | All five performance targets passed: partition, visibility, LOD, residency and streaming |
| Lifecycle and invariants | Native 1,000-cycle resource/cell fixtures; real WASM/Filament shared-resource, cancellation, reload, pin, undo and 12-cycle release checks passed |
| Populated rendering | 10 desktop views and 6 mobile-sized views passed, including authenticated local gameplay |
| Longer travel soak | Six settlement/wilderness passes plus initial editor/gameplay: 14 views and 42 presented samples passed |
| Combined browser evidence | 30 views, 90 presented samples; zero page errors, failed loads or sampled budget overruns; every final viewpoint sample settled |
| Editor | Full populated Inspector, hierarchy, prefab/building, undo/redo, verified save, exact fresh reload and isolation passed |
| Delivery/regressions | Normal build, all 125 startup resources, static-transform/reconstruction, selection and native desktop headless checks passed on the implementation |

The soak's wilderness geometry entries warmed to 727, then retired to 598. Its
last two wilderness passes had identical known GPU/staging totals and streamed
resource/cell counts. Peak soak GPU allocation was 245.17 MiB against a 256 MiB
budget. Across the earlier overview route, compatibility GPU storage fell from
516.38 MB baseline to 223.44 MB; wilderness upload staging fell from 223.59 MB to
1.66 MB. These are allocation and structural improvements, not hardware FPS claims.

The detailed acceptance and implementation limits are in
[native/PHASE4_ACCEPTANCE.md](../native/PHASE4_ACCEPTANCE.md). Raw browser receipts,
the native-suite output and the generated summary are in
[docs/qa/phase4-world-performance](qa/phase4-world-performance).

Reproduce receipt validation with:

```sh
node scripts/phase4-verify-receipts.mjs \
  docs/qa/phase4-world-performance/streaming-desktop-browser.json \
  docs/qa/phase4-world-performance/streaming-mobile-browser.json \
  docs/qa/phase4-world-performance/streaming-soak-browser.json
```

## Explicit limits

SwiftShader/mobile-sized tests do not certify physical-device FPS, Safari,
complete browser heap/driver VRAM, extended physical-device soak or hosted
39-player capacity. Native desktop evidence includes native algorithms and
headless regressions, not new full-world hardware-rendered acceptance. There are
no authored production LOD1/LOD2 sets, so production remains LOD0. Streaming
covers resources; canonical world data and compatibility source payload remain
resident. These limits remain unverified and were not silently marked passed.

No deployment, main merge, production-data modification, Phase 5 or Phase 6 work
is included. The local implementation/verification work is closed; this record
supersedes earlier open software-gate statements.
