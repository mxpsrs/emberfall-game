# Execution interruption: Briar Haven live update

The overhaul is **not finished or deployed**. Publication is authorized for the
existing live game, https://playveldren.com. Sites still reports live version
**241**, with source opening commit `af6ad3b0ae7e07c21033b9c53694ce243c58909d`.
No maintenance countdown, deployment, production database write, account reset,
GitHub main merge or PR #4 merge was performed during this verification.

## Execution blocker

The runtime disconnected during the final correction. `exec_command` returned
`409 Conflict, environment_offline: Environment is not connected`; a retry
could not reconnect. Building, browser verification and deployment packaging
cannot proceed while the execution server is offline. GitHub connector access
still works, so the completed work and this concrete correction are checkpointed.

The pending terrain and gameplay-harness corrections in this commit passed
V8 syntax parsing only. They have **not** passed repository regressions, a new
build or actual rendered inspection. The existing release receipt intentionally
still pins the earlier tested Worker, so it cannot approve these unbuilt changes.

## Last tested runtime and preserved data

- Tested runtime source: `c34e48d30ef5abddbd0a7416f8168096e4102705`.
- Matching source tree: `27bd712660b85cc3702593b7e41b759551f69d7c`.
- Built Worker SHA-256:
  `242812e8577e141cf78f180754c4b7deba145544c4d3b487079d114970eb3877`.
- Worker size: **67,098,052 bytes**, below the 67,108,864-byte hosting limit.
- 883 built assets, 259 cooked scenes, 21,741 entities and 1,408 terrain pages.
- The latest fetched branch and accepted newer terrain/engine work were preserved.
  No reset, force-push or replacement with the old checkpoint was performed.
- Live editor revision **26**, **103** edits, world hash
  `fdbaf2dd9b3a96790941b5c55aed62a5f82514af8232854936a2ab1575e51747`.
  A fresh public read matched every source entity, terrain field and legacy edit
  with both runtime/source mirrors. Hosted data was not rewritten.
- Accounts, saves, inventory, banks, quests and stable entity IDs were preserved.
  Spirits remain retired. Unrelated gameplay and website pages were not changed.

## Completed implementation

The existing branch contains the complete twelve native Briar building plans,
correct authored floors, roofs and gables, linked entrances and collision,
stairs and supported loft furnishings, settlement routes, supported approaches,
clustered vegetation, restrained forge activity and runtime daylight lighting.

The shared camera drives Filament, projection, picking, labels and culling.
Manual orbit/pitch/zoom and the detached editor camera remain. Native wall
bounds and authored door openings stop the follow camera. Closed doors cannot
be bypassed through adjacent wall cells. Upstairs cutaways retain the occupied
floor; L-shaped courtyards do not incorrectly hide a building's roof.

Static GPU reuse, construction fairness, grounded culling, native building
projection caching, foreground terrain coverage and editor transform/reload
fixes remain in place. Accepted Scene/entity/component and asset/streaming
architecture is retained.

## Passed checks at the tested Worker

Current logs are committed under `checks/`:

- `npm run build`: pass, 65,525 KiB module.
- `npm run filament:verify`: pass, actual supplied Filament runtime and mobile policy.
- Built asset delivery, 29 startup URLs, licensed audio and fresh cache URLs: pass.
- Built-Worker editor API authorization, Scene CAS, terrain and account/save preservation: pass.
- Built-Worker multiplayer identity, durable saves, movement trails and invalid-write rejection: pass.
- Shared camera over 36 poses, projection/picking, orbit, walls/terrain and editor separation: pass.
- 224 building shells, 25 footprint sizes, authored floors/gables and 40 kit modules: pass.
- 234 door open/enter/exit/close regressions: pass.
- Actual-WASM editor commands, grouped dragging, undo/redo and exact reload: pass.
- Twelve native Briar plans, accepted IDs, floor coverage, fully closed wall routes,
  real stair travel, supported lofts, occupied upper-floor visibility, courtyard
  occupancy, town-edge camera and serialization: pass.
- Native projection microbenchmark: 12 buildings × 120 frames in **111.36 ms**.
  This is CPU-only and is not a frame-rate certification.

The unchanged native C++ engine tests and supplied actual-WASM checks passed
earlier. `npm run native:test` cannot finish a fresh WASM rebuild without
`em++`, unavailable here. Its failure is preserved. Six existing other-city
civic banker-counter failures remain in the broader prop-placement suite;
Briar furnishing/service checks pass. Tests were not weakened.

## Actual rendering and observed defects

All six matching 1920 × 1080, device-scale-1, hour-11 views completed with
120 settled frames, zero visible construction/loading queues and no model or
page errors. All were inspected. Route positions and yaw/pitch/zoom inputs
matched the saved baseline. The baseline itself has incomplete loading and
cannot establish a settled FPS improvement.

Four completed JPEGs are durably saved in `after-live/`: main street,
services/smithy, houses and the School approach. `capture-progress.json.gz`
retains the first three completed routes' raw samples. The final inn interior
and town-edge images, all-six raw receipt and full local performance report
were captured and inspected, but the runtime disconnected before their upload.
Those bytes must be recaptured; do not replace them with generated images.

The town-edge follow camera now remains outside Copper House: observed camera
distance **4.8834690777**, rather than the previous camera inside its wall.
The interior retained its floor, staircase, windows, walls and aligned doorway.

**Remaining visual defect:** distant native scenery remained visible after the
terrain rectangle ended, producing sky-colored gaps beneath distant houses.
The concrete pending correction in `dist/renderer-gl.js` derives terrain
coverage from the shared camera's existing far plane and downward ground rays.
A convex footprint restricts cell candidates so the rotated enclosing rectangle
does not indiscriminately add terrain cells. Existing far distance, terrain LOD,
worker, upload and residency budgets remain. The new town-edge regression in
`tests/terrain-camera-coverage.cjs` still needs to run.

## Actual gameplay/editor status

Actual pointer orbit, pitch, wheel zoom and click-to-walk to [57,61] passed.
The rendered inn door was picked, entered and exited; closing it while occupied
retained the cutaway, and exiting restored the roof.

The twelve-building traversal stopped at the first inn leg because its test
returned as soon as the route emptied while the final visual step still moved.
Recorded state: logical tile [41,48], physical position [41,48.76250000000003],
insideBuilding "inn", empty route, no network failures, no conflict or disconnect.
The pending harness correction keeps waiting when the logical tile is the goal.
It retains the .05-unit physical endpoint assertion, timeout, collision checks
and failure for an early stop at a different tile; it never teleports the endpoint.

The current-Worker actual editor GUI and final School facade checks were queued
after that traversal and therefore did not run. Older successful GUI evidence
is not acceptance for the pending runtime correction.

## Measured software-rendering performance

These values are copied from the completed local production-Filament report,
before the pending terrain correction. They are not measurements of the new code.

| View | CPU p50 / p95 / p99 ms | Frame interval p50 / p95 / p99 ms | Settle ms | Estimated GPU MiB |
| --- | --- | --- | --- | --- |
| Main street | 289.4 / 492 / 664.5 | 401.4 / 3929.4 / 4453.4 | 331850 | 104.4 |
| Services/smithy | 549.1 / 881.1 / 990.3 | 714.6 / 3599.9 / 3711.7 | 96365 | 106.7 |
| Houses | 782.4 / 1054.7 / 1221.6 | 979.4 / 2346.4 / 2618.4 | 85639 | 108.3 |
| School approach | 504.9 / 746.7 / 930.6 | 672.3 / 2295.1 / 2388.4 | 54443 | 107.0 |
| Interior | 309.5 / 505.3 / 629.2 | 415.8 / 4264.7 / 4528.1 | 261341 | 106.3 |
| Town edge | 377.7 / 565 / 682.1 | 458.1 / 3061.9 / 3384.3 | 114561 | 82.8 |

SwiftShader software graphics are slow and **not performance acceptance**.
The reported first-render diagnostic was 61,069.2 ms; the separate startup
measurement is retained in the durable progress receipt. No physical Ryzen 5
1400 / RTX 2060 desktop, iPhone 15 Pro Max or Galaxy S24 was available. The
60/30 FPS targets, sustained resource behavior and 39 authenticated simultaneous
hosted players remain unverified. GPU memory is an estimate; renderer submission
counters are not physical driver draw calls.

## Next concrete execution steps

1. Recover a functioning workspace and fetch the current work branch. Preserve
   newer work; never reset or force-push. Read AGENTS and the engine/asset/editor
   and relevant Phase 4 foundations again if their current source has changed.
2. Run the pending terrain camera regression, terrain worker/LOD/seam tests,
   terrain frame budget and cell parity, camera and native Briar regressions.
   Confirm the convex footprint is correct through orbit, pitch and editor motion.
   Do not remove the new coverage/budget assertions to get passes.
3. Build and verify Filament, built assets, editor API and multiplayer. Check the
   Worker stays below 64 MiB. Commit/push coherent fixes and verify the remote SHA.
4. Capture the corrected town-edge and services rendering first. Fix any remaining
   horizon holes, excessive terrain coverage, blocked approaches or visible defects.
   Then recapture all six matching views and 120 settled frames against one exact
   Worker; run every physical entrance/exit and the complete actual editor GUI
   (camera, selection, gizmo, terrain, undo/redo, save and fresh reload). Capture
   the actual north-facing School facade too.
5. Replace release source hashes and Worker SHA only after rebuilding. Regenerate
   performance, inspect the actual images, retain raw gzip receipts, and pass the
   strict `scripts/verify-briar-release.mjs`. Save screenshots/results to GitHub.
6. Open the same Site through the Sites skill workflow. Reuse its project ID
   `appgprj_6a9e68dae77c8191989f534c6843e6e0`, reconcile the current Site source
   and copy the exact tested Worker. Save its matching archive-backed version.
7. Recheck the live editor snapshot. Restore the private maintenance operator
   using AGENTS if needed, never exposing or archiving it. This shared-world
   update requires the existing two-minute warning/countdown. Wait for locked,
   deploy to the existing LIVE game, finish the SAME request ID, and verify open
   plus preserved world data. Do not merge GitHub main or PR #4.
8. Push the deployment receipt and report the actual live URL, version, screenshots,
   tests, measured performance, exact remotely verified commit and remaining gaps.
