# Rendering completeness and frame work — 2026-10-04

Candidate release: `realm-a2f25c669ef49c4b`. Compatible browser renderer update; the game remains open during publication. No server behavior, account data, character scale, role grants, or shared-world definitions change.

## Changes

- Keep a compatibility mesh visible until every primitive of its canonical replacement is ready. Activate the full replacement and remove the fallback in the same frame.
- Keep a complete previous model through a LOD/model switch; move it with the requested transform until the replacement activates.
- Reserve construction time and counts for both canonical models and terrain/compatibility geometry. Desktop allows at most 64 operations, mobile 16; each queue receives half the 5 ms / 3 ms target. One native operation is atomic and can exceed its time target. Neither queue can starve the other.
- Submit nearest terrain surfaces first. Retain the previous GPU terrain surface until its new renderable is usable, release superseded staging packets, and protect the current chunk from stale retirement callbacks.
- Reuse native LOD, streaming, and residency decisions for unchanged settled views. Movement, asset generations/reloads, receipts, memory changes, scene changes, and editor pins invalidate them. Idle resources continue aging and releasing; another renderer cannot overwrite a cached native LOD transfer.
- Cache crop geometry separately for grown/harvested states. Reuse an exact triangle-cell height sample and cancel identity-transform terrain terms. Solve creature floor contact using unique skinned points, preserving every render triangle, joint, weight, and animation.
- Apply syntax minification without renaming classic-script globals to keep the complete release within the hosting limit. Verify delivered bytes and asset versions against that transformation.

## Production-world CPU/construction probe

Real C++ WASM and Filament 1.77 NOOP backend, production terrain and asset workers, cooked authored world; desktop profile at Briar `[55,61]`, 1112 × 512, zoom 118. Two 340-frame runs; compare the last 30 frames. The baseline read override normalizes paths and records all overridden client files, including `view3d.js`, `world-depth.js`, `creatures.js`, `world-light-scene.js`, `world-performance.js`, and `asset-draws.js`. Baseline Sites source: `b96f706542999e620b85190df452efc12804c996`.

| Observation | Baseline | Updated |
| --- | ---: | ---: |
| Median local CPU frame work | 184.19 ms | 133.95 ms |
| Pending visible model instances after frame 340 | 562 | 0 |
| Deferred resource/renderable requests after frame 340 | 156 | 0 |
| Dynamic vertices per frame | 12,072 | 3,720 |

Local median CPU work decreased **27.3%**, while all **4,135/4,135** canonical draws were active. All 37 streamed model assets were resident, with zero failures and no native residency budget overrun. Measurements include Node VM/Filament CPU overhead and asynchronous workers; **they do not measure a physical PC's GPU execution, rasterization, visible screenshots, or delivered FPS**. The initial cold draw is still roughly 6.8 seconds in this harness. This is not hosted simultaneous-player capacity certification.

Authoritative measurements: `.qa/lag-render-verified-baseline.json`, `.qa/lag-render-controlled-fixed.json`, and `.qa/lag-validation-summary.json`. Earlier exploratory probes are not the comparison reference.

## Validation completed

- Real Filament/WASM renderer: every one of 96 multipart replacements has exactly one complete representation throughout initial replacement and model switching; old terrain survives budget pressure; superseded buffers release; unchanged scheduling skips work; movement and competing LOD transfers refresh decisions; idle retirement, animation, building sharing, culling, and resource teardown pass.
- Construction fairness in both visit orders and desktop/mobile profiles; 100 shared model instances in runtime/editor; generation invalidation, cancellation, failure cleanup, scene switches, and unload cycles pass.
- Actual native streaming: load limits, settled-cache reuse, selection pins, undo, asset generation/reload, document reload, 12 travel cycles, and complete resource release pass.
- Creature contact height matches the original full-vertex solve within 1e-7 over five phases of every authored clip. Imported animation, attacks, death/loot/respawn, and appearance parity pass.
- Terrain worker, 40 travel cells, LOD seams, source matching, dirty replacement, camera coverage, camera projection/picking, editor terrain undo/redo, and native terrain invalidation pass.
- All 1,408 cooked pages / 5,632 parity samples match the authoritative collision heightfield: maximum height error 0.00005010 and normal error 0.00009778. Complete world serialization remains unchanged.
- Built release: all 29 startup resources, inline and external script parsing, current/stale cache routes, PBR/model catalog roundtrips, Brotli/identity/HEAD/ETags, source licensing/music responses, saved Scene fields, and hosting-size limit pass. Mobile Filament runtime and selected player/NPC appearance pass.
- `git diff --check` and the complete `npm run build` pass.

## Publication invariants

- Worker: 67,073,515 bytes, below 67,108,864 bytes.
- Worker SHA-256: `e8df61ae25cded613b76a0aca475eaf9d7130d62402f5a69e813cb22098bcdcf`.
- Authored seed file SHA-256 stays `fdbaf2dd9b3a96790941b5c55aed62a5f82514af8232854936a2ab1575e51747`.
- Live pre-publication shared world: revision 26, 103 entities; serialized world SHA-256 `6109f4fb1ba5cbb327cfb0378150f18aa688873218190711ba7d592ccd535b75`.
- Larock420 editor grant, player world scale 1.18, every account/character save, public audience, current DB binding, and existing migration files are preserved. No global reset or maintenance countdown runs.
- Verify the saved/deployed release fingerprint, live client bytes, unchanged latest shared world, and open maintenance status after publication.
