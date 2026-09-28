# Phase 4 performance and streaming checkpoint

Status: **in progress, not final acceptance**. Work remains on
`phase4-world-performance-wip`; nothing was deployed or merged into `main`.

Implementation checkpoint: `06932597af7263fa2d9dff0f4601f93121fd34c8`.
Its complete GitHub tree was independently read back and matched all 1,310
expected file hashes. It follows the accepted Phase 3 foundation without changing
canonical world files, account data, editor history or Phase 2 asset ownership.

## Changes

- Native spatial partition, conservative visibility and stable LOD decisions
  feed the existing renderer. The production registry has no authored multi-level
  LOD sets, so production art remains LOD0.
- Stable draw identities avoid transform uploads when visibility changes order.
  Existing material, shadow and generation compatibility boundaries remain.
- Native memory policy retires unused presentation resources and discards
  reconstructible upload staging while retaining visible GPU geometry.
- Native cell resource scheduling prioritizes visible demand and canonical
  selection pins, limits concurrent loads by profile, prefetches nearby authored
  renderers and cancels obsolete requests. The adapter acquires existing shared
  asset leases; reload epochs prevent stale completion from reviving old work.
- Procedural terrain/building buffers reconstruct from their existing source.
  Canonical entities and world definitions stay resident; this does not page
  world data or introduce a second scene/asset database.

## Verification

| Check | Result |
| --- | --- |
| Native resource policy | 1,000 travel cycles; protected active allocations; bounded retirement |
| Native cell scheduler | Priority, cancellation, late receipts, pins, epochs, 1,000 travel cycles |
| Actual WASM and Filament | Two-load mobile limit, shared GPU allocations, 12 unload/reload cycles, complete teardown |
| Reload and editor invariants | Generation changes, registry reload, document load, selection pins and undo; unchanged serialized world |
| Static transform/reconstruction | 256 initial uploads, zero stationary uploads, one moved-object upload; exact cache reconstruction |
| Build and packaged assets | Normal build passed; all 125 startup resources checked |
| Native desktop | Test and 240-frame headless smoke passed |
| Populated editor on `0693259` | Inspector, hierarchy, prefab/building history, verified save, fresh reload and isolation; zero page errors |
| Populated browser checks on `0693259` | 10 desktop and 6 mobile-sized views, including authenticated gameplay; zero page errors |
| Populated browser checks on preceding resource checkpoints | 10 desktop travel/revisit views, 6 mobile-sized views, 6 staging-refinement views; zero page errors |

The raw preceding-checkpoint browser receipts are committed in
`docs/qa/phase4-world-performance/`, with exact source commit IDs. The new
scheduler's populated editor save/reload check passed against `0693259`; its
receipt is `streaming-authoring-browser.json`. The completed travel receipts are
`streaming-desktop-browser.json` and `streaming-mobile-browser.json`. All 48
measured frames presented, with zero failed loads and zero reported budget
overruns. Three desktop frames caught one load in flight; every view's final
sample had no pending loads. Peak estimated GPU allocation was 255.94 MiB on
desktop (256 MiB budget) and 127.69 MiB on mobile (128 MiB budget).

## Measured resource improvements

These are allocation estimates from the same local populated world, not driver
VRAM measurements or hardware FPS benchmarks.

| Measurement | Baseline | Resource checkpoint |
| --- | ---: | ---: |
| Compatibility GPU allocations after overview | 516.38 MB | 124.71 MB at `1f32af1` |
| Compatibility GPU allocations on overview revisit | Not sampled | 122.61 MB at `1f32af1` |
| Upload staging after wilderness travel | 223.59 MB | 1.66 MB at `39c5a21` and `0693259` |
| Compatibility GPU allocations after overview, final implementation | 516.38 MB | 223.44 MB at `0693259` |
| Compatibility GPU allocations after overview revisit, final implementation | Not sampled | 225.06 MB at `0693259` |

The first checkpoint's staging overages were reported rather than hidden. The
second checkpoint releases reconstructible staging; shared index/dynamic data
remains separately charged by the native budget. After staging release, the final
implementation can retain more reusable GPU cache than the first CPU-constrained
checkpoint, while staying within its GPU budget. Budgets cover known allocations,
not the entire browser heap. Active working sets can exceed a budget and are
explicitly reported instead of dropping visible content.

## Remaining acceptance limits

Extended hardware soak, hardware performance, physical mobile/Safari coverage
and the visual quality of
future authored LOD1/LOD2 art are not established by these tests. SwiftShader runs
overlapped, so their CPU frame times are not isolated performance comparisons.
No optional occlusion system, production capacity certification, Phase 5 or
Phase 6 work is claimed.
