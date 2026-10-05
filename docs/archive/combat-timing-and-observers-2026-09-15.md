# Combat timing and quest observers — 15 September 2026

Recording IMG_0114.mp4 (67.6 seconds) shows the Raider lookout fight repeatedly reporting “Your next attack is not ready.” Frames were inspected; audio could not be decoded for listening or transcription in this runtime. No claim is made to have heard narration.

A real-client regression with packet spacing from 250 to 950 ms reproduced the error against the old server, followed by target loss. The client timed swings locally while the server checked a separate cooldown at impact receipt time. Uneven delivery shortened observed gaps between otherwise correctly spaced attacks.

Each new client swing now reserves the server cooldown once, and its melee/projectile impact references that exact swing. The server accepts one impact per actor/swing using deterministic receipt IDs; retries are idempotent and invalid, stolen, or rejected swings cannot deal damage. The client respects the returned readiness deadline. Cooldown resynchronization preserves auto-attack without repeated chat errors. Existing clients retain the legacy impact path. Damage, accuracy, nominal weapon speed, melee XP multiplier and single-combat rules are preserved.

Owner clarification: other players must see a player's attack animations even when their own quest completion hides that player's target. Polling and immediate activity events now preserve player animations independently of quest-enemy visibility. Melee, ranged and magic animations remain visible, aiming at transmitted coordinates when the target is hidden. Hidden NPC models, enemy animations and enemy hit splats stay hidden.

Validation: combat-network-timing reproduces the former failure and passes with the repair; combat-swing-permits checks one impact, retries, cooldown denial/recovery, cross-player rejection and delayed impact; quest-observer-animation covers three combat styles through server effect filtering and client animation state. Existing shared-world, combat-claims and home-teleport regressions pass. Production build and built-assets checks are required before publication. These are automated client/server fixtures, not a new physical-device walkthrough or hosted capacity certification.

Server behavior changes; use the system-update countdown unless the owner explicitly directs otherwise for this release. Preserve accounts and saves.

The owner explicitly instructed “Okay force publish when done” for this release. Publish directly after the final build and checks without starting maintenance.

Additional owner requests in this batch: direct fire clicks no longer open the cooking workbench; using food on a fire still starts the existing batch cooking action. The eight-minute day/night cycle now derives from server-corrected Unix time for all sky rendering, lamps, ambient audio and the clock display, rather than saved character playtime. Opening menus, relogging or loading an old save does not pause or reset the cycle. Separate house interiors remain lit. Tests shared-day-night, cooking-batch and world-lighting cover the new behavior. Saved v110 was not deployed because these requests arrived before publication; publish the combined successor version.

Combined v111 published successfully at 2026-09-15T09:45:13.382611Z, source `b645f05143755e7ab40109b0da973d6c861feabc`, deployment `appgdep_6aa91394d2d48191a3381e62a0771cc4`, environment revision 4. Direct publication followed the owner's explicit instruction; no maintenance countdown was started. Production build, built-assets, cooking-batch, shared-day-night and world-lighting checks passed. Players should refresh to load the new client.
