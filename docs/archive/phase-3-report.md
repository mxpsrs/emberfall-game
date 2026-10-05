# Veldren Identity & Originality — Phase 3

17 September 2026. Continues the tested Phase 2/loading/staff source at `a82b80325c30bd214acd9cb9c055f9b0aeb6c1e8`. This is an implementation and evidence report, not a promise of a bug-free game or commercial asset clearance.

## Implemented

- **Regional identity:** thirteen settlement accounts distinguish local trade, work, history and beliefs. Residents, archivists, priests and civic stewards use the appropriate account. Atlas settlement descriptions identify each place without crowding the mobile panel. Greyhaven has scales, Ironhollow a hammer and Deepforge an anvil on their existing civic plinths. Existing geography, collision, resource placement and object counts are preserved.
- **Briarhaven:** Ada explains the shared commons and services; Selene distinguishes consumed Relics from an independent Spirit bond. The Magic School has an original four-facet floor mark. It is decoration, not another player's activated quest altar.
- **Recurring characters and quests:** removed duplicate generic “Lorekeeper Ilyra” identities in elven archives and duplicate archivist naming. Rellan, Hesta, Ilyra and Edda now respond individually after Veyr. Rowan, Captain Vale and the Mysterious Man retain their established opening roles. The three prerequisites, two following chapters and assisted story fight remain intact. Existing investigations, counter-ward preparation, completion cards, sound, journal updates, one-time grants and approximately 40% increased reward tables were audited and exercised rather than replaced.
- **Bosses and lore:** all four Hunts have accessible field notes explaining origin, location and approach. Runeforged Colossus remains the stationary two-phase foundry sentinel; its inscriptions are explicitly distinguished from consumed Relics. Veyr's false orders and stolen memories connect the courier investigation, mine and shrine. Varkesh's roost and Xalith's nursery retain their environmental purpose. Existing telegraphs, phase thresholds, resets, assistance and rewards remain unchanged.
- **Spirit/Worship integration:** regional beliefs describe different relationships with Spirits; Ilyra's aftermath explains their independent reactions. Gathering discovery relationships and Worship mechanics remain unchanged.
- **Creatures, drops and lairs:** reviewed current models, regional hunting grounds, fifteen-goblin settlement, giant-rat behavior, boss drop tables and cave approaches. Retained functional camps, refuge beds, shrine props and mine work areas. Standard loot still falls on the ground with its owner-protection window; Veyr's orb remains an independent 1/250 roll. No new spawn clutter or balance inflation was introduced.
- **Visual defects fixed:** replaced opaque black elven vine cards with original green stem/leaf geometry. Subdivided castle floor faces and removed overlapping base/room coverage so the Canvas fallback no longer paints floors over characters and furniture. Stair openings remain open. Rechecked all three castles.
- **Credits/provenance:** added a public consolidated credits page linked from the handbook, a repeatable credits/inventory generator, repository asset hashes and a source/license audit. No assets were deleted merely because their origin is uncertain.
- **Review tooling:** world review accepts the current audit and includes castle, school, boss and quest interiors. Veyr's offscreen capture now sets the required private rematch state before entry. Disposable browser review pages were removed before the release build.

## Terminology and consistency

Player-facing Relic/Eldrite terminology, Veldren and Badlands names are preserved. Legacy infrastructure hostnames and internal rune/save IDs remain deliberately compatible. Generic skills and RPG terms are not renamed. The duplicate Ilyra identity and identical post-story responses were corrected. Boss field notes connect existing geography and story; no replacement quest chronology was invented.

## Verification

`PHASE-3-TEST-RESULTS.json` records **148 passing automated checks**: the 147-file existing suite plus the new Phase 3 check. The initial built-assets failure correctly detected stale embedded source; rebuilding and rerunning it passed. Rendering, civilization, armor loading and staff-idle checks were also rerun after visual corrections. Production build succeeds with 154 embedded assets and all 96 startup resources verified. The only build warning was npm's existing environment `http-proxy` warning, not a missing game reference.

- Fresh browser character completed **all 38 tutorial lessons**, including Bram's cooking, deposit/withdrawal/quantity-control banking, Spirit selection, mainland transition and save normalization, in an 844×390 landscape review frame. Controlled test actions/time were used; this is not a physical-phone certification.
- Full local main-story and mountain-story playthroughs exercised real navigation and objective handlers, prerequisites, clues, item requirements, interrupted work, both rescued miners, private spawns, guardian/Veyr encounters, assistance, death/retry, one-time rewards, journal feedback and fresh-state save reload. Re-entry and optional unassisted Veyr rematch passed.
- Boss tests cover the four current bosses, shared phase rules, telegraphs, attacks, death, reset/re-entry, rewards and observer animation. Veyr is intentionally absent/inactive outside the appropriate private story/rematch state; the review capture was corrected rather than exposing that boss globally.
- Regression suite covers accounts/login/creation, saves, movement/camera, UI controls, long press/right click, melee/ranged/magic, Spirits/Worship/Unleash, skills, Relics, equipment, banking, trading/following, ground loot, resource skills, tree lifecycle, dialogue/shops, doors, maps, chat, settings and persistence.
- Two authenticated local clients verified shared combat/teleport visibility, loot ownership, private quest credit, doors, competing cutters, stumps/regrowth/late arrivals, fire/state handling, Spirit actions and replay protection. Shared day/night checks passed. The local 39-client scenario completed 120 rounds/6,474 requests with zero late rounds; **it does not certify sustained hosted capacity**.
- Home Teleport passed its free purple presentation, zero XP/item cost, five-second combat guard, Briarhaven arrival and observer replication checks.
- World audit traversed **339 scenes with zero reported placement/navigation issues**. Mainland remains 7,686 objects, including 4,157 trees and 229 buildings; Firstlight remains 207 objects, 38 trees and six buildings.
- Browser log samples contained extension metadata errors, with no game-source errors in the inspected samples. These are sampled observations, not an assertion that every possible runtime path was executed.

## Actual visual walkthrough

Inspected rendered browser views of all thirteen settlements: Crownreach, Greyhaven, Briarhaven, Willowcross, Stoneford, Ironhollow, Deepforge, Copperdelve, Stonehearth, Aelindor, Moonwillow, Fernwatch and Silverbrook. Reviewed all three castle halls, Briarhaven Magic School, Firstlight tutorial locations, all five surface quarries, goblin settlement, seven bridge crossings, major boss entrances/arenas, freight-mine rescue, Hollow Shrine, Underworks refuge, courier cart/raider camp, collapsed workings/workbench/seal, Pinewatch Mine and Sunken Crypt interiors, and the Remembering Lake.

Reviewed Elderwood, Crownwood, Westmere Woods, Ironpine Foothills, Stonehearth Pines, Silverwood Forest, northern/eastern Badlands; Reedwater Mere, Fenmere, Ironmirror and Silverglass shores; and the seven review routes around Briarhaven–Willowcross, Stoneford, Crownreach, Ironhollow, Deepforge, Aelindor and Moonwillow. Checked normal/opposite/wide angles where useful. Veyr's active rematch presentation was additionally inspected using production geometry in an offscreen OpenGL ES render. Automated reachability supplements these representative views; this was not a manual visit to every tile or every camera angle.

## Performance and limits

Final CPU preparation/mock-GL submission probe (not real-device FPS):

| View | First sample | Warm median | Draw calls |
|---|---:|---:|---:|
| Desktop tutorial near | 1,401 ms | 6.85 ms | 111 |
| Desktop tutorial wide | 3,107 ms | 11.5 ms | 301 |
| Phone-sized tutorial wide, reused cache | 275 ms | 12.9 ms | 293 |
| Mainland wide | 8,784 ms | 20.75 ms | 264 |

Representative draw counts are unchanged from the pre-polish probe. Cold mainland preparation remains noticeable; this run does not claim it is eliminated. No new creatures, lights, particles or replicated entities were added. Castle floor subdivision is static cached geometry. Exact armor mesh/loading and staff clearance regressions passed. Physical mobile GPU measurements and a sustained authenticated hosted 39-player exercise remain outstanding.

## Asset findings and remaining review

See `ASSET-AUDIT-PHASE-3.md` for primary source links and conditions, and `asset-inventory-phase3.json` for hashes. KayKit, recorded standard Quaternius packs and Kenney have license evidence; QAL content has incorporated-game restrictions. Game-icons and the two DM-913 bosses require attribution, now reachable in the credits page. CH0SAN, the archer/props download, CGTrader acquisition/packaging, treant and individual Poly Pizza records, music acquisition and legacy raster art still require the specified evidence/review. Unknown is not illegal and is not clearance. No clearly unauthorized commercial-game rip was established. Those documentation gaps must be resolved or assets replaced before a serious commercial release.

## Publication scope

Generated shared catalog is byte-equivalent to the prior release; no server logic, protocol, account data or save schema changed. This is a compatible client/content update, so publication keeps the game open under `AGENTS.md`. No account reset or destructive cleanup is part of Phase 3. Final commit, GitHub main update and deployment results are reported after those operations complete.
