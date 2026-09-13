# Emberfall publishing

Before EVERY production deployment, send the in-game “System maintenance” notice with a full two-minute countdown. At zero, revoke all game sessions and clear online presence; preserve accounts and character saves. Verify maintenance is locked before deploying. Keep login locked until deployment succeeds, then finish that same maintenance request to reopen the game. A failed deployment must stay locked until recovered.

Use scripts/maintenance.mjs to start, check and finish the same request ID. Never use global-reset as a maintenance substitute. Never deploy before the deadline or silently skip this rule.

Bootstrap completed: the user explicitly approved a one-time exception for v64, which was published successfully on 2026-09-13. That exception is consumed. The maintenance broadcaster is now installed; every subsequent production deployment must follow the countdown and disconnect procedure above.

Maintenance operator: use `node --env-file-if-exists=.env.maintenance.local scripts/maintenance.mjs start|check|finish REQUEST_ID`. The ignored operator file contains the dedicated maintenance key; never print or commit it.

Recovery pending: after v64, the previous reset operator key was unavailable locally and cannot be read back from Sites. A dedicated MAINTENANCE_TOKEN has been prepared in Sites and retained in the ignored local operator file. It takes effect only after deployment. The spirit and player-menu correction must stay unpublished until the user explicitly authorizes one recovery deployment without a countdown, or the existing live operator key is recovered. No recovery exception has been granted.
