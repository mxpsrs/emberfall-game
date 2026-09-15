# Veldren: The Unwritten Age publishing

Minimum capacity requirement from Raymond: at least 39 simultaneous playtesters. A local integration pass is not live hosting capacity certification. Preserve that distinction in reports and require sustained authenticated hosted evidence before calling this requirement satisfied.

Playtest freeze requested 2026-09-14: read `docs/PLAYTEST-HANDOFF-2026-09-14.md` and the committed QA report before resuming. After the final audit/handoff, pause development until Saturday 2026-09-19 (America/Chicago), unless Raymond explicitly requests an earlier change. Preserve unresolved test failures honestly; a client-only walkthrough is not proof of shared-server end-to-end correctness.

Latest owner clarification, 2026-09-15: **“If you’re publishing changes that don’t affect the game’s server, why would you shut it down?”** This narrows the earlier blanket maintenance rule. Website-only search metadata, sitemap/crawl settings, landing-page text and other compatible changes that do not affect the live game server must publish while the game stays open. Do not disconnect players merely because a new site version is being published.

Use the in-game system update warning/countdown and maintenance lock for server behavior, shared-world protocol, player data changes or other updates that actually require player disconnection. When Raymond explicitly directs maintenance, run maintenance. For those updates, wait for `locked`, publish, then finish the same request and verify reopening. Do not infer further exceptions from urgency. Preserve every account and character save; never use global-reset as a deployment step.

On the search-only update of 2026-09-15, the assistant unnecessarily started maintenance using the old blanket rule. The existing operator refuses `finish` during countdown, so the game was reopened as soon as the lock occurred, before publishing the search update. The current control has no countdown cancellation action. Do not repeat that unnecessary interruption; classify the actual server impact before starting maintenance.

The following paragraphs record prior, consumed deployment exceptions and credential recovery. They do not waive maintenance when it is required under the current scope above.

Bootstrap completed: the user explicitly approved a one-time exception for v64, which was published successfully on 2026-09-13. That exception is consumed. The maintenance broadcaster is now installed; subsequent updates requiring maintenance must follow the procedure above.

Maintenance operator: use `node --env-file-if-exists=.env.maintenance.local scripts/maintenance.mjs start|check|finish REQUEST_ID`. The ignored operator file contains the dedicated maintenance key; never print or commit it.

Recovery completed: the user explicitly approved one recovery deployment without a countdown. v65 was published successfully on 2026-09-13 with environment revision 2, activating the dedicated MAINTENANCE_TOKEN retained in the ignored local operator file. This exception is consumed. Every future production deployment requiring maintenance must use the countdown and disconnect procedure.

Second recovery completed: after the local operator file was lost, the user explicitly approved one recovery publication without the countdown. v79 was published successfully on 2026-09-13 with environment revision 4. This exception is consumed. The full countdown and disconnect procedure remains mandatory for future production deployments.

Durable maintenance credential recovery: the current dedicated key is privately backed up as `Emberfall-Maintenance-Operator-Backup.json`, Library file `libfile_a9894717579881919d1c6c5566123daf`. The backup was independently restored and verified byte-for-byte before activation. If `.env.maintenance.local` is missing, use the Library skill to restore that exact private backup and write its `MAINTENANCE_TOKEN` value as `EMBERFALL_MAINTENANCE_TOKEN` in the ignored operator file with permissions 0600. Do not print the value, commit it, include it in a deployment archive, or share the backup. Attempt this recovery before proposing another key rotation or countdown exception. Any future replacement key must have a verified durable private backup before activation; a local ignored file alone is not a backup.
