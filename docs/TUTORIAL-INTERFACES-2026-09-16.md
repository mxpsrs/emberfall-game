# Tutorial and interface repair

Owner scope: fix tutorial, reset everyone to a fresh start, and keep the world/camera running during all interfaces.

- Reproduced the cooking approach failure: one guided request opened the kitchen door and stopped. The old walkthrough silently retried guidance, hiding this. Guided travel now continues through a tutor's door; a manual stop cancels that continuation.
- Bram's full-bag Continue now closes the conversation, opens the bag, explains the required space, and resumes the ingredient handoff once two slots are available. The gift is still granted only once.
- World time, wandering and actor interpolation no longer pause because a menu is open. Bank, equipment, workbench, NPC dialogue and generic panels allow camera keys and gestures. Trade and creation still lock the player's own actions, while world actors continue. Trade keeps its explicit cancellation behavior.
- NPC and generic conversations are non-modal, retaining a close button and Escape. Character creation/sign-in remain modal forms, but creation does not pause world actors.
- Rowan retains his original introduction before the new chapter text. The magic lesson directs players to the Combat page before Gust Needle when another spell page is selected.
- Shared teleport requests reject double starts while the existing crossing is animating.

## Verification

`tests/tutorial-cook.cjs` first failed on the single-request kitchen approach, then passed after the repair. It covers Bram's blocked ingredient handoff, idempotent recovery, non-modal dialogue, camera rotation, and actor/time progression with bank, equipment, workbench, generic, trade and creation interfaces open.

`tests/tutorial-guidance.cjs` covers magic-page navigation and preserved Rowan identity alongside the existing supply and banking cases.

The shared walkthrough uses the real shared-world server and client receipts against disposable local storage. It uses an in-memory character, so it does not certify authenticated hosted save round trips. Separate Rowan/save and reset tests cover those boundaries.

Browser inspection reached character creation, the opening conversation and camera lesson. Subsequent input calls intermittently timed out; no completed browser walkthrough is claimed.

## Fresh start

The earlier permanent purge was rejected by automatic review and must not be retried. Its receipt is preserved as blocked, verified uncompleted by a read-only query. A new reversible character checkpoint is the chosen fresh-start operation: credentials remain, all active characters restart, and prior character data remains restorable. Record the actual live result after execution; do not infer it from tests.

## Completed publication and reset

Published as v119, runtime source `5099351ac48f4657b2a13b88914f5bc2fefc3e64`; deployment `appgdep_6aaaf0f9cfc48191a2be5d410ce2554f` succeeded on 2026-09-16 at 19:42:01 UTC. Maintenance request `veldren-tutorial-fresh-start-20260916` followed its two-minute countdown, reached locked, and was reopened after publication.

Live reversible checkpoint `0ef22c4a-d615-4a4b-a917-1a858126ef43` completed at 19:41:36 UTC before publication. Authenticated status confirmed 14 accounts, **0 active characters**, 0 sessions and 12 archived characters. Credentials remain usable; prior progress is recoverable. No permanent purge was executed.

Local reversible checkpoint `ac16c7e3-a656-4995-a32e-df2f6e27e5bc` archived the one QA character and revoked its session; verified zero active local characters. Preview was stopped for the local reset and remains stopped so it does not recreate test progress.

Final gates: cooking/interface regression, tutorial guidance, shared tutorial (1,253 server polls, 82 receipts), global-reset/rollback/stale-save tests, local-folder tests, production build and embedded-asset validation passed. Browser input timeouts remain a QA limitation, as stated above.
