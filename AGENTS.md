# Emberfall publishing

Before EVERY production deployment, send the in-game “System maintenance” notice with a full two-minute countdown. At zero, revoke all game sessions and clear online presence; preserve accounts and character saves. Verify maintenance is locked before deploying. Keep login locked until deployment succeeds, then finish that same maintenance request to reopen the game. A failed deployment must stay locked until recovered.

Use scripts/maintenance.mjs to start, check and finish the same request ID. Never use global-reset as a maintenance substitute. Never deploy before the deadline or silently skip this rule.

Bootstrap completed: the user explicitly approved a one-time exception for v64, which was published successfully on 2026-09-13. That exception is consumed. The maintenance broadcaster is now installed; every subsequent production deployment must follow the countdown and disconnect procedure above.

Maintenance operator: use `node --env-file-if-exists=.env.maintenance.local scripts/maintenance.mjs start|check|finish REQUEST_ID`. The ignored operator file contains the dedicated maintenance key; never print or commit it.

Recovery completed: the user explicitly approved one recovery deployment without a countdown. v65 was published successfully on 2026-09-13 with environment revision 2, activating the dedicated MAINTENANCE_TOKEN retained in the ignored local operator file. This exception is consumed. Every future production deployment must use the countdown and disconnect procedure.
