# Veldren settlements, architecture and HUD — 16 September 2026

Owner-requested world overhaul, with the rejected Phase 1 HUD arrangement removed. Combat, attuned Spirit builds, Worship progression, multiplayer, the five-quest story and Firstlight remain in place. The lift-control lesson and independent journal selection are preserved. This does not start the separate Skills/Magic/Equipment/Tutorial overhaul.

## World construction

`organic-world.js` now defines settlement purpose, class, population scale, industry, water, defenses, civic approach, districts, entrances, roads and resource areas before generating lots. Named regional trade links use terrain-aware routes. Local streets and building frontage follow the plan. Capitals reserve a broad castle approach; elven cities use four connected groves. Decoration does not choose the settlement skeleton.

| Class | Settlements |
| --- | --- |
| Capital | Crownreach, Ironhollow, Aelindor |
| City | Greyhaven, Deepforge, Moonwillow |
| Town | Briarhaven, Willowcross |
| Large village | Stoneford, Copperdelve, Stonehearth |
| Small village | Fernwatch, Silverbrook |

`civilization-world.js` supplies terrain grading, civic centers, productive fringes, street-facing neighborhoods, castle architecture and industry. Briarhaven has twelve meaningful buildings and explicit roads around its services and housing. Brambleclaw retains fifteen roaming goblins and six shelters, with scavenged barriers, pens and watch platforms.

All three royal castles are rebuilt with a keep, curtain walls, towers, gatehouse, courtyard, great hall, library, council room, guard/stair hall, kitchen, barracks and armory. Upper chambers, lower secure/service rooms and a watchtower are reachable through visible stairs. Ironcrown's existing story scholar and records occupy its actual library room. Architecture reuses Veldren's modular meshes/materials and static mesh caching.

There are 96 additional usable floor scenes across castles, substantial houses/halls, inns and the coastal beacon. Inns receiving upper floors move their beds into guest rooms. Visible stairs connect each scene; return positions stand beside stairs. Upper/lower room purposes and furniture differ. Castle camera cutaway retains readable room boundaries; descending stairs have actual floor openings. New floor bounds and arrival entries are exported to the shared server catalog.

Five open-air quarries provide local, industrial, regional and abandoned workings: Copperdelve Cut, Ironhollow Crown Quarry, Crown Masonry Quarry, Deepforge Regional Quarry and Old Stoneford Cut. Their terrain is excavated into terraces, with a continuous work ramp, cliff collision, lifting equipment, stores, offices and workers or abandoned equipment. All excavation footprints are on dry land. Ore uses existing Mining levels, XP, tools, depletion and respawn rules. Traditional mines and dangerous caves remain.

The atlas shows current settlement classes, building footprints, fortifications and quarry terraces. Interior player markers use the correct exterior building. Stair destinations and civic banking appear in service guidance.

## HUD

Restored the established desktop side rail, adjacent panels and landscape mobile bottom tabs. Kept the larger top-right minimap (188 px desktop, 144 px landscape), separate equipment, all ordinary panels, contextual actions and a compact Spirit build badge. Spirit passives, upgrades and Unleash behavior remain unchanged. The software renderer now shows roads and quarry surfaces as well as the GPU renderer.

## Verification and fixes

Final matrix: `qa/world-overhaul-2026-09-16.json`, 138/138 passing after a full sweep and focused repairs. The initial four failures and subsequent rechecks are retained separately. The final source build and compressed asset responses are checked again before publication.

Coverage includes the complete five-quest walkthrough with real routes and combat, lift rescue, skill gates, interrupted actions, death/retry and fresh-runtime saves; all settlement entrances; 96 floor room/character routes and actual return-stair interactions; gates, quarry access and terrain; banks, shops, equipment, inventory, contextual input, camera, movement, following, trading after combat, chat, drops, respawns, teleporting, settings/logout, tutorial and saves. New server checks use two authenticated accounts on castle/inn/beacon floors and verify shared quarry depletion, idempotent harvesting and respawns.

Existing multiplayer checks pass melee/ranged/magic/Spirit animation visibility, including observers without the target NPC; timely independent action streams; day/night synchronization; two-client following; and a 39-client local SQLite workload. **Local evidence does not certify sustained 39-player hosted capacity or physical-phone performance.**

Issues found and fixed during this run:

- Moved Wardkeeper workbench out of a new building footprint; the full mountain quest passes.
- Moved an elven residence off the capital wall; every building entrance is reachable.
- Protected authored raider-camp scenery and moved two Stoneford lots away from the camp.
- Removed old Briarhaven radial lanes and restored its bridge connection.
- Removed a side bypass around closed castle gates.
- Corrected beacon landings and castle return stairs. A runtime stair interaction exposed the latter: landing on the blocking stair object triggered the old fallback to Briarhaven. The test now exercises every new floor's actual stair interaction, not only routes.
- Moved abandoned quarry excavation off water; all five excavation footprints are checked.
- Updated the old six-building Briarhaven assertion to twelve; corrected the new server fixture's inn scene ID; rebuilt stale generated assets/catalog after final edits.

## Visual and browser review

Rendered and inspected all eighteen requested views using production meshes, shaders, lights and camera: Briarhaven; Ironhollow; Ironhollow quarry; Ironcrown exterior, courtyard, great hall, library, upper chambers and lower dungeon/cellar; a small village; a large village; a town; a capital; goblin village; dwarven settlement; elven settlement; active regional quarry; abandoned quarry. Re-rendered corrected goblin shelters and the relocated abandoned quarry. Reproduction: `node scripts/qa/capture-civilizations.cjs`.

The disposable browser review uses production game scripts and the actual renderer with isolated test state. Desktop 1280×720 and landscape 844×390 / 667×320 layouts are reviewed; bank deposit and shop interfaces, inventory, visible stairs and panel behavior are checked. The browser uses the software-renderer fallback; the separate rendered views exercise the GPU shaders. Browser-control timeouts were checked against subsequent visible state instead of being treated as successful input automatically. Preview authentication/network errors occurred while the disposable page was unloaded during a rebuild; they are not a successful live account test. No production account is used or reset by the fixture. Remove both `client/__world-*.html` files before packaging.

Warm frontend submission measurements on the VM remain approximately 5–12 ms for tutorial cases and 18–31 ms for a wide mainland view. These measurements exclude actual GPU execution, browser layout and network latency and are not a frame-rate guarantee. Cold mesh creation remains substantially slower. Real-device/network playtesting and hosted capacity verification remain necessary.

## Release

No schema migration or account reset. Stable quest/NPC IDs are retained, moved guidance resolves current world objects, and invalid old standing positions recover to nearby walkable ground. Because this changes shared world geography/catalog entries, publication requires the full two-minute update warning, verified maintenance lock, deployment, finish of the same maintenance request and a separate open-state check. Preserve both source histories when mirroring the exact tree to private GitHub main.
