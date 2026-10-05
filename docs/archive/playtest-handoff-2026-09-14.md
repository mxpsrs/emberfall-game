# Work Run 2 completion — 16 September 2026

See `WORK-RUN-2-2026-09-16.md` and `qa/work-run-2/`. The full-world tree/terrain review, fresh tutorial verification and Badlands naming are complete. Preserve the existing interface/cooking repairs and account state. Hosted capacity and physical-device limitations remain explicit.

# Latest completion: tutorial fixes and reversible fresh start

Published v119. Live verification: 14 accounts, zero active characters, 12 restorable archived characters; local verification: zero active characters. Usernames/passwords remain. Maintenance reopened. See `TUTORIAL-INTERFACES-2026-09-16.md` for fixes, evidence and browser limitations. Earlier blocked-purge and unfinished-tutorial notes below are historical.

# Tutorial and interface follow-up

Read `TUTORIAL-INTERFACES-2026-09-16.md`. Reproduced and repaired the kitchen guidance stop, full-bag handoff, and interface-driven world freeze. The shared-server walkthrough passed all 38 lessons (1,253 polls, 82 receipts). This update uses a reversible character reset; permanent purge remains blocked. Publication/reset completion is recorded in the repair document after verification.

# Account cleanup status — 16 September 2026

Read `ACCOUNT-CLEANUP-2026-09-16.md`. Local accounts were deleted. Live deletion was blocked by automatic review; 14 accounts and 12 saves remained. The tutorial repair is unfinished. Do not infer completion from earlier Phase 2 test reports.

# Quarry labels and local account files — 16 September 2026

## Latest completion — 2026-09-16 Phase 2

The owner asked to finish the work left in progress. Read `IDENTITY-PHASE-2-2026-09-16.md` and its QA reports. Woodland/terrain, shared tree lifecycle, fieldwork, Magic/material identity, Firstlight chapters and Selene’s Relic Shaping quest are implemented. Phase 1 combat/Spirit/HUD work remains. No third overhaul is started. Hosted capacity for 39 players remains unverified. Older notes below describe their original release state.


The owner requested a local-file account reset and quarry map labels. Read `QUARRY-MAPS-LOCAL-RESET-2026-09-16.md` and `qa/quarry-maps-2026-09-16.json`. The local SQLite account files were removed after verifying the server was stopped; this checkout contained zero accounts/saves. Hosted accounts were explicitly left untouched. All five existing surface quarries now have names, Mining icons, real ore requirements and access-ramp guidance on the atlas/minimap. This is a compatible client update and does not require hosted maintenance.

# Global prop placement — 16 September 2026

The owner explicitly requested the prop-placement overhaul across the whole game and provided the goblin-bridge recording. Read `PROP-PLACEMENT-2026-09-16.md` and `qa/prop-placement-final-2026-09-16.json`. Shared semantic anchors now govern 680 room contexts plus roads, markets, courtyards, camps and quarry worksites. Preserve inward-facing wall furniture, counter/attendant access, protected doors/stairs/roads/bridges, all six goblin shelters and the quarry ramp exclusion. Client/server collision uses the same oriented footprints. This scoped request does not reopen unrelated development or the Skills/Magic/Equipment/Tutorial overhaul. Hosted-capacity and physical-device limits still apply.

# World civilizations and HUD correction — 16 September 2026

The owner requested authored settlements, usable castles/floors and surface quarries, and rejected the Phase 1 HUD arrangement. Read `WORLD-CIVILIZATIONS-2026-09-16.md` and `qa/world-overhaul-2026-09-16.json`. Thirteen settlement plans, three castles, 96 usable floor scenes and five excavated quarries are integrated with quests, maps and the shared catalog. The established panel arrangement is restored while Spirit/combat functionality remains. Actual return-stair interactions are tested; do not regress landings onto blocking stair objects. The local 138-script final matrix passes after repairs. Physical-device and sustained hosted-capacity limits still apply. This explicit request overrides the freeze only for its stated scope.

# Identity Phase 1 — 16 September 2026

The owner explicitly requested the combat/Spirit/Worship/HUD identity pass, overriding the development freeze for this scope. Read `IDENTITY-PHASE-1-2026-09-16.md` and its QA matrix before continuing. One attuned passive replaces collection-wide stacking; saved Spirit resonance and the new HUD are in place. Do not begin the separate Skills/Magic/Equipment/Tutorial overhaul without that next request.

# Combat timing and quest observers — 15 September 2026

See `COMBAT-TIMING-AND-OBSERVERS-2026-09-15.md` for the recorded attack-cooldown repair and visible player animations against hidden quest enemies.

# Home Teleport — 15 September 2026

See `HOME-TELEPORT-2026-09-15.md`: purple Home Teleport in Magic → Teleports, free of relics and XP, returns to Briarhaven after five seconds out of combat. Spirit art remains deferred by the owner.

# Quest fight visibility and combat claims — 15 September 2026

See `QUEST-FIGHT-PHASING-2026-09-15.md` for per-player quest enemies and server-enforced single combat below level 27. Spirit portrait replacement remains unresolved after the owner rejected generated images and Ækashics.

# Latest owner-requested update — 15 September 2026

See `SPIRIT-DISCOVERY-AND-SKILL-FEEDBACK-2026-09-15.md` for elemental skilling discoveries, chat-box Unleash controls, automatic per-spirit cooldowns, level-up celebrations, cooking batches and larger cyan minimap arrows. Existing characters are retained. This gameplay/server update requires the system-update countdown before publication.

# Search-only publishing clarification — 15 September 2026

Raymond explicitly corrected unnecessary downtime for changes that do not affect the game server. Follow the updated scope in AGENTS.md: SEO/sitemap/landing-page-only changes publish online. Maintenance remains required when explicitly directed or when an update actually requires disconnecting players. Never start a maintenance countdown merely to publish search metadata. The current maintenance operator cannot cancel a countdown before it locks.

# Latest owner-requested repair — 15 September 2026

See `QUEST-ACCESS-LIGHTING-CONNECTION-2026-09-15.md` for the current recording follow-up: actual ladder access, readable clues, synchronized quest guidance, accurate NPC markers, fishing shores, outdoor lanterns, indoor light containment, and automatic connection recovery. The owner explicitly reinstated disconnect repair in this batch. Mandatory maintenance procedure still applies.

# Maintenance clarification — 15 September 2026

Raymond corrected the assistant’s unsupported “optional maintenance” interpretation after v103. Production updates must use the in-game warning/countdown, wait for the maintenance lock, publish, then reopen. See the authoritative procedure in `AGENTS.md`. Do not repeat v103’s direct deployment without warning. This instruction correction does not itself deploy or take the running game offline.

Recent recordings `IMG_0111.mp4` (88.7 seconds) and `IMG_0112.mp4` (58.2 seconds) were visually reviewed during this clarification. They show the cart-investigation journal and repeated “There is no clear path to this …” messages while selecting evidence. This needs reproduction in a subsequent gameplay repair; the maintenance-instruction checkpoint does not claim to fix it.

# Cave and lighting repair — 15 September 2026

Owner-requested follow-up: see `CAVES-AND-LIGHTING-2026-09-15.md`. Restored natural boulder walls with matching collision; paired cave mouths/ladders; rebuilt the connected freight refuge; replaced player glow with visible world lights; kept all house interiors lit. Published as v103 at 06:33:04 UTC; runtime source `e51e911b871960ee941bdc96023069601e97ca3b`. No account reset or schema change.

# Tree and monster selection follow-up — 15 September 2026

Published as v102 at 05:57:18 UTC. Owner-requested canopy/body click repair: see `MODEL-PICKING-2026-09-15.md`. Selection now follows rendered model triangles and animated poses, with a four-pixel edge allowance and shared click/context-menu picking.

# World, rewards and recording update — 15 September 2026

Owner-requested follow-up: see `WORLD-AND-QUEST-REWARDS-2026-09-15.md` and `qa/world-rewards-2026-09-15.json` for the whole-world atlas, natural geography, all-room furnishing, quest celebrations / 40% reward increase, recording repairs and yellow/red click feedback. No account reset or schema migration. v101 published successfully at 05:43:40 UTC, 15 September; runtime source `4b1a501f32491eb6e1af505166255db74068492e`. All 108 automated checks passed; the physical-phone and 39-player hosted verification limits remain.

# Veldren — playtest handoff, 14 September 2026

## New owner-requested quest repair, 15 September

Read `docs/archive/quest-cohesion-2026-09-15.md` and `docs/qa/quest-cohesion-2026-09-15.json` for the subsequent recording-driven repair. Final verification passes all 104 available test scripts, including the previously failing starter encounter balance check. The lookout/Nessa ID collision is fixed and authenticated kill credit tested; quest scenery, evidence actions, journal requirements and side-quest rewards are aligned. Brook's +8 maximum-health bonus is explicitly preserved at the owner's request and explained in the HUD. This is local regression and offscreen visual evidence, not live hosted capacity certification. No database migration or account reset is part of this revision.

## Read this before resuming

Raymond requested a comprehensive final regression check, durable Git memory, and a development pause while he and his girlfriend play the game. Resume on Saturday **19 September 2026**, America/Chicago, starting with his actual playtest findings. Do not add unsolicited features during the freeze. A new explicit request from Raymond can override the pause.

Never claim that every possible game interaction is proven bug-free. The complete regression output is in `docs/qa/regression-2026-09-14.json`; failures remain reported. The suite includes production modules and authenticated two-client integration checks, but is not a substitute for real-device, real-network playtesting or load testing.

## Minimum capacity requirement

Raymond explicitly requires **at least 39 simultaneous playtesters**. Treat this as an acceptance requirement, not a measured hosting limit or an already-proven capability. Local SQLite integration tests do not establish live D1 queueing, network latency, long-duration availability or device rendering capacity. Require sustained authenticated hosted load evidence before certifying 39-player readiness. Do not infer that a VPS is necessary from the earlier inefficient query paths alone.

## Quest geography and dungeon revision requested before playtesting

Raymond’s recording `ScreenRecording_09-14-2026 17-56-53_1.mp4` showed a freestanding field doorway leading straight to Varkesh. He requested believable quest journeys and boss approaches through inhabited caves/ruins. This explicit request overrides the development freeze for this revision.

- The Broken Watch: Tovin remains in Briarhaven; evidence is at Redclay Bend southeast of town, with the lookout camp farther east. Updated dialogue and journal give directions; the forged dispatch returns to Rellan.
- The Weight of an Oath: new `story_mine` scene contains the lower freight lift, ventilation, salvage and miners. Hesta and the rescue forge remain at the surface entrance. The rescue requires traveling into the workings, bringing salvage back for forging, returning to repair the lift and leading both miners out. Guided movement paces the escort through bends. Saved partial rescues and completed quests remain valid.
- Echoes Without a Name: Ilyra’s pilgrim camp is southwest of Ironhollow; the Bell, Lantern and Hand mark distinct trail stops, and the shrine lies farther south. Existing evidence, puzzle answers, stage order, rewards and skill gates remain unchanged.
- Four boss scenes retain their existing arenas, boss IDs and quest bindings but gain winding approaches: Abandoned Crystal Mine, Hollow Ruins Catacombs, Ashwatch Mountain Caves and Moonwillow Root Caverns. Each has three dressed chambers and six lesser enemies. Verified cardinal routes from entrance to arena are 150–157 tiles. The physical world entrances use recessed, timber-supported openings in rock outcrops; the complete entrance footprint is kept away from houses. Varkesh’s entrance moves toward the Ashwatch ridge.
- Server scene bounds and huntsman arrival coordinates now come from the generated world catalogue. Crossings arrive at dungeon entrances, before the passages. No database schema/reset or account deletion is required. Existing shared-entity signatures include home coordinates, so moved story enemies relocate on their next synchronization.
- New checks: `tests/gameplay/dungeon-journeys.cjs` verifies connected routes, guard populations and spatial separation. `tests/server/dungeon-server.mjs` verifies two authenticated accounts entering expanded scene bounds, sharing guards and preserving dungeon positions/belongings. The full main-story walkthrough includes actual mine transitions, escort, rewards and fresh-runtime save recovery. Existing mountain quest, two-client renderer/teleports and server combat/privacy checks were also exercised. An old shared-world test’s hardcoded arrival was updated to the actual server permit entry; it then passed.
- Visual review used production meshes, atlas, shaders, lights and shadows through `scripts/qa/capture-scene.cjs` and `scripts/qa/render-scene.py`; this is an offscreen geometry review, not physical-phone or hosted load certification. The 39-player hosting requirement and prior unresolved encounter-balance test remain open.

**Publication:** v98 deployed successfully at 23:17:05 UTC. The first attempt (`appgdep_6aa880201d848191b58c1f46fd83198d`) failed at 23:15:54 with “D1 DB is overloaded. Requests queued for too long.” Recent application error/activity queries returned no events; a maintenance request responded, but checking an unstarted request ID correctly failed its match check. No maintenance was started. A single retry of the same saved version succeeded (`appgdep_6aa8805bc9c48191a882e5952ef94aa0`). The publication failure is additional evidence that hosting/database stability is still unresolved; successful publication does not certify the 39-player requirement.

## Further overload repair after v98

Raymond explicitly requested fixing the overload after the v98 deployment failure. The earlier v97 mitigation was insufficient. Investigation found redundant per-poll reads, repeated attempts to create ashes for already-converted fires, two writes for every cooldown check, and a retention throughput flaw: only 128 acknowledged events were removed every 30 seconds, while ordinary multiplayer activity could generate events faster indefinitely.

The repair consolidates final entities/objects/receipts/effects into one scoped SQL snapshot, reuses the existing presence read for peer delivery, skips a redundant entity reread when no maintenance changes occurred, changes cooldown claiming to one atomic UPSERT, and only materializes missing ashes in bounded batches. Authorization and account/save/reset checks remain uncached. Private object filtering, receipt ownership, and server NPC/CAS authority remain enforced. Large/slow snapshot metadata is logged without payloads or credentials.

Cleanup now uses one cross-isolate lease per second. Each sweep retires at most 256 acknowledged transient effects older than 60 seconds, 256 day-old acknowledged receipts, and 256 expired objects. Unacknowledged receipts remain retained. Migration `0017_foamy_richard_fisk.sql` adds `(kind,acked,created_at)` for effect expiry; the bounded transient query deliberately has no global ORDER BY, avoiding an unbounded sort across kinds. Existing indexes handle durable receipt/object expiry.

Validation: actual shared combat, two-client animation/teleports, dungeon bounds/saves, social/maintenance transactions and outage behavior passed. The 100,000-event test plus ten simulated minutes at 156 effects/second held history bounded and preserved unacknowledged data. A 39-authenticated-client local run completed 480 rounds / 120 seconds, 25,545 requests and 239,787 SQL statements (1,998/second), 18,681 peer checks, 1,560 combat receipts, 19,227 stream frames and 39 intact saves, with no 250-ms round overruns. See `docs/qa/overload-repair-2026-09-14.json`. This is still local SQLite evidence, not a live hosted capacity certificate. The first cleanup plan assertion correctly failed with the sorted query; it passed after removing the unnecessary global sort.

Maintenance request `overload-repair-20260914-v99` was started for the database update, verified locked before deployment, and finished/open after v99 succeeded. Post-release status, maintenance and session probes all returned HTTP 200 at approximately 23:29:15 UTC; status reported online with zero players, maintenance was open, and the unauthenticated session response was null as expected. The queried two-minute error window returned no events. This is a successful reopen and limited observation, not sustained production load evidence. Do not reset or delete character accounts to address load.

## Production checkpoint

### Subsequent incident: recurring API 503 responses

**Confirmed recurrence after v96:** at 22:40–22:41 UTC the new diagnostics captured `D1_ERROR: D1 DB is overloaded. Requests queued for too long.` The earlier healthy sample and one-retry mitigation did not resolve the incident. Do not treat a brief recovery as an all-clear.

Published in v97 at 22:49:42 UTC: replace two global history deletes on every world poll with a cross-isolate leased sweep at most once per 30 seconds, deleting at most 128 expired rows per table; add indexes matching both cleanup predicates; never delete unacknowledged receipts. Scope expired-trade updates to the requesting player. Reduce the independent activity channel from ten to four reads per second, cancel work on disconnect, and use capped exponential reconnect backoff with stale-connection protection. Do not retry database-overload responses into the same full queue. World position polling and urgent action publication remain enabled.

Validation: the 100,000-event database fixture verifies actual indexed query plans, bounded deletes, cross-isolate exclusion and retained unacknowledged/recent data. For 120 world polls, cleanup falls from 240 cleanup writes to three database operations. Shared two-client combat/teleport rendering, shared-world state, local chat, social/maintenance transactions, story server gates, outage handling and activity reconnect tests pass. These are specific load-path corrections, not a claim of a measured production player capacity. The owner asked whether a VPS was already needed; the observed overload plus avoidable query work does not establish that a migration is necessary.

**39-client local evidence:** `tests/server/shared-39-clients.mjs` passed with 39 registered/authenticated accounts, 120 movement rounds at 4 Hz for 30 seconds, all 38 peers visible to each account, 390 combat receipts (58 accepted hits), 39 local-chat audience checks, private-message isolation, 4,797 notification frames, and 39 independently preserved revision-4 saves. The run made 85,001 SQL statements (approximately 2,833/second), with 2,803 ms aggregate local SQL execution and a 108 ms maximum round; no round exceeded its 250 ms budget. See `docs/qa/shared-39-clients-2026-09-14.json`. This is a local functional/load probe, **not** 39 live browsers, 39 independent boss encounters, or a hosted D1 capacity pass. Initial fixture runs exposed missing unbound-query adapter support and attack positions outside the moving target; the harness was corrected without changing production combat.

**Post-v97 observation:** the queried six-minute production error window contained no errors; `/api/status` returned HTTP 200 with maintenance open and zero players. There was insufficient active gameplay traffic to establish sustained recovery under load. Do not represent this idle observation as satisfying the 39-player requirement.

On 14 September around 22:15 and 22:20 UTC, live maintenance, session, status and save requests returned 503 in two bursts. The site remained active and administrative maintenance was open. Healthy probes between bursts did **not** establish permanent recovery. The common maintenance database SELECT is a prerequisite for protected API requests; the original catch discarded the underlying exception. The exact database/provider cause was not established from those logs.

The prepared mitigation adds one delayed retry (100 ms) to that idempotent SELECT, then still fails closed. It never retries session deletion or writes, caches an open state, or bypasses maintenance/authentication. Server-only diagnostics retain the database exception and cause. `tests/server/maintenance-outage.mjs` verifies healthy reads, transient recovery, persistent failure, locked-state enforcement and diagnostic privacy. The existing social/maintenance transaction test also passed. This additional targeted validation does not replace the earlier 96-script audit or resolve its combat-timing discrepancy.

**Published without maintenance at the owner's direction:** automatic review rejected starting `database-outage-20260914`. Raymond then instructed “No more maintenance lock,” and version 96 deployed successfully without starting maintenance, revoking sessions or resetting accounts. He subsequently clarified: **“You can put the game into maintenance I don’t care I need this fixed asap.”** Maintenance is now authorized if needed for the incident; it is not a mandatory deployment step. Capture post-publication diagnostics before claiming the underlying cause resolved.

Post-release verification, 22:36:44–22:39:11 UTC: all **24 probes** (eight rounds of status, maintenance and session checks) returned HTTP 200. Maintenance remained open; a real player joined during observation. The latest 100 production events sampled around 22:38 contained 36 successful world updates, 28 social requests, 12 maintenance reads, 8 character requests, 13 activity streams, one session check, one status check and one successful partial audio response; no database diagnostic or failed request appeared in that sample. This supports recovery during the observation window, not proof of the original provider/database fault's root cause or a sustained-load guarantee.

GitHub synchronization of the new incident changes was rejected again by automatic review, including the runtime source blob: the review requested explicit authorization for the destination and payload, and separately flagged private operational/credential-recovery metadata in AGENTS.md. Do not bypass that rejection. The repair is live and saved in the existing Sites source Git, but GitHub still points to the earlier 056e517 checkpoint until this new sync is approved.

- Public game: https://playveldren.com (Sites project `appgprj_6a9e68dae77c8191989f534c6843e6e0`).
- Owner's GitHub: `mxpsrs/emberfall-game`, private, branch `main`.
- GitHub destination authorization: on 14 September 2026, Raymond explicitly answered **“Yes”** to syncing the full source and handoff to private `mxpsrs/emberfall-game`. This resolves the earlier safety-review destination-approval block. Sync the committed source with a normal fast-forward update, preserve existing GitHub history, and verify the final file tree before reporting success. The commit message identifies the exact source checkpoint.
- Live release: **v99**, runtime source `905379e67d4911c069629121872bc3aef75f299a`.
- Deployment: `appgdep_6aa883125e50819181e1249e7c9dbae9`, succeeded on its first attempt at 23:28:37 UTC, environment revision 4.
- Prior Rowan release v95 used `rowan-crossing-20260914`, which was finished/open. Versions 96, 97 and 98 started no maintenance. No account reset or save deletion was performed.
- Subsequent handoff/test-only commits do not change the live runtime.

## Critical incident from Raymond's recording

`ScreenRecording_09-14-2026 05-37-48_1.mp4` shows Foolio2 at Elder Rowan on the final tutorial lesson. Finishing the conversation produces **“That crossing is not unlocked.”** This was a real production bug, not user error.

The server required tutorial index 38, but the current 38-lesson tutorial's final lesson is index **37**. The permit is requested before that lesson completes, so completion could never happen. Client-only walkthroughs missed this server boundary.

Fix: `scripts/world/export-shared-world.cjs` now exports the current final-lesson index and v2–v7 final indices into `worker/shared-catalog.json`; `worker/shared-world.js` checks that exported contract instead of a magic number. Earlier lessons, off-island requests and invalid destinations remain rejected.

Evidence:

- `tests/server/story-server.mjs`: v2–v7 final-stage permits, earlier-stage rejection, invalid scene/destination rejection, exact main-story enemy stage gates, resource names.
- `tests/server/rowan-crossing.mjs`: actual game client queues a crossing; actual shared server returns permit; client animates, arrives on mainland and saves completion/destination together. Belongings, bank, Mining XP and one-time reward retained.
- `tests/server/shared-two-clients.mjs`: authenticated independent clients, observer's real avatar-renderer call path, green/red departure and arrival poses, correct colour/duration, no stuck pose after expiry. This verifies shared packets and renderer selection, not a physical-device video comparison.

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

`client/main-story.js` stores `s.mainStoryQuest`, stages 0–25. Quest boundaries are 0/7/18/25. Evidence and rescue positions persist independently of bag capacity. Wrong choices are retryable, work cancels safely on movement, death preserves evidence, rewards are one-time and full-bag overflow goes to the bank.

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

**Open balance discrepancy — do not erase the failing assertion:** `tests/gameplay/encounters.cjs` simulates 1,000 seeded level-1 bronze-dagger fights. Median **67.50 seconds**, p95 **110.70 seconds**, mean HP lost **2.10**, zero deaths. The earlier documented target was approximately 15 seconds. Commit `ec2a3a75f0c784c0037823ab595634d412ad2711` intentionally replaced boosted combat with uniform opposed rolls, removed the +2 melee starting-damage bonus, and changed a four-tick attack from 2.1 to 2.4 seconds. The older encounter test retained its 15-second assertion. A search did not recover the owner's exact later balance instruction; preserve the current production formula and report this conflict for confirmation, rather than silently rebalance the whole game or weaken the assertion. This remaining failure prevents an all-clear.

Other reconciled legacy checks now cover current XP/default HP, physical kingdom buildings, integrated shoulders and retired crest compatibility, gradual enemy recovery, native creature animation dimensions, pinch zoom, and cooking guidance. Mainland connectivity uses a cardinal flood of lazy navigation cells, since the expanded continent exceeds one click's 45,000-cell pathfinding budget. All 189 settlement buildings have connected entrances.

Live Worker error queries before and after v95 returned no events in their queried windows. This is limited evidence, not a guarantee that every client/device interaction works.

## Resume procedure

1. Read this handoff, `AGENTS.md`, the final regression JSON, `docs/archive/change-history-through-2026-09-14.md` and Raymond's new playtest reports.
2. Reproduce every reported problem through the authenticated shared-server boundary, not just a stubbed client. Verify observer-visible effects as well as the acting player's state.
3. Keep tests failing visibly until a justified fix is verified. Expand Rowan-style end-to-end cases to any newly changed boundary.
4. Preserve all user work and accounts. Never use global reset as maintenance.
5. Push exact source, build/package/save/deploy and verify success. Maintenance is authorized if needed to repair the current server outage, but do not interrupt players merely as an automatic deployment step. If maintenance is started, finish the same request after success and verify login reopens.
6. Follow the credential-recovery instructions in `AGENTS.md`; never commit operator tokens or private backups. Do not include player saves or local databases in Git or deployment archives.

The Git history is the authoritative record of all committed work. The companion history document exports full commit messages and changed paths through the live checkpoint, so future work does not depend on chat memory.
