# Reported issues release — 2026-10-04

The live v242 source did not contain the latest Briar Haven, camera, terrain and renderer work from `briar-haven-visual-overhaul-wip` at `078613b411b1800102d26bf5512212e8afc22067`. This release restores that work and retains the Larock420 editor grant and equal local/remote player scale already deployed in v242.

Additional reproduced defects corrected in this release:

- Six outdoor banker counters were rejected because all four initial placements overlapped roads. Placement now searches clear nearby clerk/counter pairs, moves both together and preserves each clerk's original native identity. All six clerks have a reachable workstation and open customer approach.
- A neighboring building's convex selection hull could intercept empty bank-floor clicks. Building selection now tests the visible world-space triangles, excludes geometry behind the camera, and respects native parent transforms. Bank, school and kitchen entry, exit and actual interior floor-click tests pass.
- Repeated vertex projections allocated and formatted the same camera-pose key. Numeric pose-input checks now reuse the pose while preserving frame, movement, camera, world, terrain and surface invalidation.
- The complete rebuilt Worker exceeded the host's 64 MiB module limit. Shared catalog and authored-world seeds now use lossless basE91/Brotli storage with a shared seed decoder. No active game model or texture was removed.

## Built release

| Field | Value |
| --- | --- |
| Release | `realm-9e993d5f6471c967` |
| Worker bytes | 67,106,558 / 67,108,864 |
| Worker SHA-256 | `25fc39270d3009d41488f7b6cca6a672beca04dfaef65681129a305981aacdeb` |
| Delivered assets | 883 |
| Native scenes / entities | 259 / 21,747 |
| Cooked terrain pages | 1,408 |
| Authoring warnings | 0 |

## Validation

Passing checks cover account creation/authentication/save round trips, editor identity grants and revocation, multiplayer isolation, equal local/remote character transforms, startup and connection recovery, creator/appearance controls, original authored movement and transition smoothing, quest-specific guidance, camera projection/picking/obstruction/input, near-plane terrain coverage, native world reload and saved-player state, terrain workers/travel/invalidation, render-construction fairness, static transform reuse, native building/spawn identity, editor building history and indoor lighting.

All 234 building doors pass entry/exit movement checks. The full native building audit covers 235 buildings, 2,232 building parts and 234 doors. Briar Haven's 12 distinct plans, doors, stairs, roofs, lofts and cutaways pass their focused audit. The real native C++ tests and Filament/WASM NOOP resource tests pass. Production Worker editor grants and built-asset delivery are tested against the compiled artifact, not just source handlers.

The isolated 39-client test passed 120 rounds over 30 seconds, with 6,474 requests, no late rounds and 39 saved characters. This is local protocol coverage; it is not certification of 39 simultaneous production D1 clients.

## Preserved data and limits

The pre-release live authored world is revision 26 with 103 saved entities, SHA-256 `fdbaf2dd9b3a96790941b5c55aed62a5f82514af8232854936a2ab1575e51747`. It matches the release seed. No account, character or global reset is part of this update; existing editor-world data takes precedence.

No fresh browser or physical PC/phone run was available in the managed container. Historical Briar Haven screenshots are retained separately with their original provenance. Renderer NOOP CPU probes omit GPU/browser work and the old fixture's terrain fallback is not production streamed terrain; those numbers are not reported as PC/mobile FPS. Physical-device performance and the tester's end-to-end signed-in PC session still require those devices.

Publish under the repository's maintenance countdown/lock procedure, preserving the current audience, environment and D1 binding. Reopen only after the exact saved version reports success; compare the live release and authored world after reopening.
