# Emberfall publishing

Before EVERY production deployment, send the in-game “System maintenance” notice with a full two-minute countdown. At zero, revoke all game sessions and clear online presence; preserve accounts and character saves. Verify maintenance is locked before deploying. Keep login locked until deployment succeeds, then finish that same maintenance request to reopen the game. A failed deployment must stay locked until recovered.

Use scripts/maintenance.mjs to start, check and finish the same request ID. Never use global-reset as a maintenance substitute. Never deploy before the deadline or silently skip this rule.

Bootstrap limitation: live v63 does not have a maintenance broadcaster. Installing this feature requires the user's explicit one-time exception after the update is prepared and verified. No exception has been granted. Future agents must not infer one from an older instruction to publish.
