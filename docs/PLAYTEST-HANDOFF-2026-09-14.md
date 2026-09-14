# Veldren — playtest handoff, 14 September 2026

## Read this before resuming

Raymond requested a comprehensive final regression check, durable Git memory, and a development pause while he and his girlfriend play the game. Resume on Saturday **19 September 2026**, America/Chicago, starting with his actual playtest findings. Do not add unsolicited features during the freeze. A new explicit request from Raymond can override the pause.

Never claim that every possible game interaction is proven bug-free. The complete regression output is in `docs/qa/regression-2026-09-14.json`; failures remain reported. The suite includes production modules and authenticated two-client integration checks, but is not a substitute for real-device, real-network playtesting or load testing.

## Production checkpoint

- Public game: https://playveldren.com (Sites project `appgprj_6a9e68dae77c8191989f534c6843e6e0`).
- Owner's GitHub: `mxpsrs/emberfall-game`, private, branch `main`.
- GitHub destination authorization: on 14 September 2026, Raymond explicitly answered **“Yes”** to syncing the full source and handoff to private `mxpsrs/emberfall-game`. This resolves the earlier safety-review destination-approval block. Sync the committed source with a normal fast-forward update, preserve existing GitHub history, and verify the final file tree before reporting success. The commit message identifies the exact source checkpoint.
- Live release: **v95**, runtime source `a99ea71e7b1d58fa3abe3210e802feb569e74dd7`.
- Deployment: `appgdep_6aa7cfe62e5481919e50994814560a05`, succeeded, environment revision 4.
- Full two-minute maintenance `rowan-crossing-20260914` was completed; login reopened successfully. No account reset or save deletion was performed.
- Subsequent handoff/test-only commits do not change the live runtime.

## Critical incident from Raymond's recording

`ScreenRecording_09-14-2026 05-37-48_1.mp4` shows Foolio2 at Elder Rowan on the final tutorial lesson. Finishing the conversation produces **“That crossing is not unlocked.”** This was a real production bug, not user error.

The server required tutorial index 38, but the current 38-lesson tutorial's final lesson is index **37**. The permit is requested before that lesson completes, so completion could never happen. Client-only walkthroughs missed this server boundary.

Fix: `scripts/export-shared-world.cjs` now exports the current final-lesson index and v2–v7 final indices into `worker/shared-catalog.json`; `worker/shared-world.js` checks that exported contract instead of a magic number. Earlier lessons, off-island requests and invalid destinations remain rejected.

Evidence:

- `tests/story-server.mjs`: v2–v7 final-stage permits, earlier-stage rejection, invalid scene/destination rejection, exact main-story enemy stage gates, resource names.
- `tests/rowan-crossing.mjs`: actual game client queues a crossing; actual shared server returns permit; client animates, arrives on mainland and saves completion/destination together. Belongings, bank, Mining XP and one-time reward retained.
- `tests/shared-two-clients.mjs`: authenticated independent clients, observer's real avatar-renderer call path, green/red departure and arrival poses, correct colour/duration, no stuck pose after expiry. This verifies shared packets and renderer selection, not a physical-device video comparison.

## Changes completed before the freeze

### Armour and characters

- Real fitted low-poly armour geometry, closed contoured torso backplate, wrapped upper/lower arms, thighs, knees and lower legs; front/back coverage on both character frames.
- Unified metal fit uses the fitted iron shell shape with each tier's palette; avoids old oversized/blocky imported silhouettes. Chest pieces include shoulders. Retired shoulder/crest items remain compatible with old saves rather than being silently deleted.
- Captain Vale and other NPCs use the same equipment-fitting path as players, including world and portrait rendering. Rellan wears the same iron armour system.
- Weapons were not redesigned as part of the latest armour request. Armour-shell, equipment-fit and NPC-appearance tests cover movement and multiple body variants.

### Tutorial and bank

- 38-step ordered Firstlight apprenticeship; explicit tutor conversations, direct click guidance and detailed Worship explanation.
- Bank coach is compact and inline, not a giant blocking popup. Deposit the highlighted first bag item, withdraw it, learn 1/5/10/All quantities, close the bank, then find Keeper Sera.
- Browser QA at 844×390 verified the full bank sequence with actual UI clicks and visible inventory/bank counts. The menu and bag remain visible simultaneously.
- Tutorial completion teleports one way to Briarhaven. Bank, inventory, equipment and XP carry over; final reward is not repeatable.
- Existing tutorial saves migrate by completed lesson identities, not blindly preserving an old numeric index. Earlier work stays complete even when lesson order changes.
- Firstlight square is level, the approach to the rat pen was lowered, and physical buildings/doors match the authored layout.

### Main story — strict prerequisite order

1. **The Broken Watch** — Captain Rellan, Briarhaven. Wagon-driver testimony, three clues, correct trail, lookout fight, dispatch, forged-order accusation. Reward: 150 coins, 200 Attack XP, 200 Defense XP.
2. **The Weight of an Oath** — Hesta, Ironhollow. Requires quest 1, Mining 5 and Smithing 5. Inspect and make the timber lift safe, clear ventilation, mine support material, forge the pin, set brake and counterweight, rescue **both Bera and Oren**, physically escort them back. Reward: 200 coins, 250 Mining XP, 250 Smithing XP.
3. **Echoes Without a Name** — Keeper Ilyra. Requires quest 2 and Magic 5. Compare enchanted oathstones, solve sigils, defeat the oathbound shade, unbind the cursed shrine, return the memory shard. Reward: 250 coins, 300 Magic XP, 150 Hitpoints XP.

These are fantasy quests: **no technological relay network**. The shrine steals names/voices through a curse. Props are timber machinery, stone, carvings, sigils and magical light.

`dist/main-story.js` stores `s.mainStoryQuest`, stages 0–25. Quest boundaries are 0/7/18/25. Evidence and rescue positions persist independently of bag capacity. Wrong choices are retryable, work cancels safely on movement, death preserves evidence, rewards are one-time and full-bag overflow goes to the bank.

Only stage 25 unlocks a new start of **The King Beneath the Mountain — Part One**. Existing players who already started the Mountain story keep their access. Both Mountain chapters, Alaric-assisted Veyr combat and red Huntsman crossings are implemented. Never remove the grandfathering safeguard.

### Relics and Eldrite

- Spell resources display Air, Mind, Water, Earth, Fire, Chaos, Death and Blood **relics**.
- Rune armour tier displays **Eldrite**. Supporting material, weapon and tool names follow the tier.
- Technical IDs (`runes`, `airRunes`, `rune_body`, etc.) deliberately remain stable. Do not rename database/save IDs as a cosmetic cleanup; doing so could destroy compatibility.
- Item definitions, shop/trade server catalogues, recipes, tutorial text and quest text were updated. An audit may still find incidental old prose; check visible strings independently of compatibility keys.

### Shared world and chat

- Server-owned NPC positions, actions, health, combat, death/respawn and resource depletion. Clients cannot author NPC poses.
- Independent activity stream delivers combat-start notifications while a normal world request is stalled. Observer animation de-duplicates delayed deliveries.
- Ground loot has owner privacy for 30 seconds, then becomes public; simultaneous pickup has one winner; receipts protect retries. Fire/ashes and opened doors synchronize.
- Local chat is a **circular 25-tile radius**, same scene, audience fixed at send time from recent presence. Walking into a location never replays hours-old/yesterday's local conversation.
- Local chat initial request establishes a cursor without dumping history. Local lifetime is 12 seconds; private messages persist for 24 hours. Private reply target remains selected until explicitly switching Local.
- Local chat migration: `drizzle/0015_live_local_chat.sql`. Two-stage trade, post-combat recovery, following and scene/save handoff tests are included.

### Other retained work

- Logout lives under Settings; emote/music menu entries removed. Woodcutting sound triggers per swing.
- Character name is permanent; appearance may be edited. New players do not spawn in equipped armour.
- Independent combat skills, XP thresholds, equipment requirements, bow/arrow slots, projectile timing, item-use interactions, coin pouch vs inventory coins, persistent bank and 25-slot bag.
- Approved authored creatures, four boss lairs, world expansion, walk-in buildings, minimap/terrain picking, GPU skinning with Android/fallback paths and indexed/instanced scenery.
- Beta landing page, server status, Veldren branding and Android source retained. Donation page still awaits real owner-supplied payment links; do not invent them.
- Local development uses automatic per-character JSON files plus SQLite/outbox recovery. Production uses Sites Worker/D1.

## Testing and remaining limits

Run `node scripts/check-game.mjs` from repository root. It discovers all `.cjs`/`.mjs` tests, runs two at a time, records exit codes, durations and failure tails in the committed report. Full temporary logs are ignored under `.qa/`. Blender/Python import tools require their external environment and are not covered by that command.

The initial sweep ran 95 scripts: 63 passed, 32 failed. Many older test harnesses omitted newer modules or asserted deliberately superseded behavior. Updated checks now use current tutorial ordering, equipped ammunition and tinted arrow meshes, DOM methods, maintenance schema, live-chat cursor semantics, lazy navigation cells, actual coin storage and door approach behavior. No production mechanics were weakened to satisfy stale assertions.

The final result is **95 passed, 1 failed, 96 scripts total**. The report combines the complete 96-script sweep with a recorded rerun of the nine failing scripts after their harnesses were reconciled. Both original receipts are retained beside the consolidated report. This is explicitly a **full sweep plus targeted rechecks**, not a claim of one completely green run.

**Open balance discrepancy — do not erase the failing assertion:** `tests/encounters.cjs` simulates 1,000 seeded level-1 bronze-dagger fights. Median **67.50 seconds**, p95 **110.70 seconds**, mean HP lost **2.10**, zero deaths. The earlier documented target was approximately 15 seconds. Commit `ec2a3a75f0c784c0037823ab595634d412ad2711` intentionally replaced boosted combat with uniform opposed rolls, removed the +2 melee starting-damage bonus, and changed a four-tick attack from 2.1 to 2.4 seconds. The older encounter test retained its 15-second assertion. A search did not recover the owner's exact later balance instruction; preserve the current production formula and report this conflict for confirmation, rather than silently rebalance the whole game or weaken the assertion. This remaining failure prevents an all-clear.

Other reconciled legacy checks now cover current XP/default HP, physical kingdom buildings, integrated shoulders and retired crest compatibility, gradual enemy recovery, native creature animation dimensions, pinch zoom, and cooking guidance. Mainland connectivity uses a cardinal flood of lazy navigation cells, since the expanded continent exceeds one click's 45,000-cell pathfinding budget. All 189 settlement buildings have connected entrances.

Live Worker error queries before and after v95 returned no events in their queried windows. This is limited evidence, not a guarantee that every client/device interaction works.

## Resume procedure

1. Read this handoff, `AGENTS.md`, the final regression JSON, `docs/CHANGE-HISTORY-THROUGH-2026-09-14.md` and Raymond's new playtest reports.
2. Reproduce every reported problem through the authenticated shared-server boundary, not just a stubbed client. Verify observer-visible effects as well as the acting player's state.
3. Keep tests failing visibly until a justified fix is verified. Expand Rowan-style end-to-end cases to any newly changed boundary.
4. Preserve all user work and accounts. Never use global reset as maintenance.
5. Before **every** production deployment: start the full two-minute notice, verify locked, push exact source, build/package/save/deploy, wait for success, finish the same maintenance ID. A failed deployment must remain locked until recovery.
6. Follow the credential-recovery instructions in `AGENTS.md`; never commit operator tokens or private backups. Do not include player saves or local databases in Git or deployment archives.

The Git history is the authoritative record of all committed work. The companion history document exports full commit messages and changed paths through the live checkpoint, so future work does not depend on chat memory.
