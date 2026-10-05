# Veldren prop placement — 16 September 2026

The owner requested a new, game-wide prop-placement pass and supplied a 134-second landscape recording. This changes contextual dressing, furniture, facing, collision and access throughout the existing world. It does not replace settlement plans, the restored HUD, combat/Spirit systems, quests or the lift-control lesson.

## Shared placement contract

`client/prop-placement.js` runs after the existing world, floors and lighting are constructed. It processes 680 room contexts across the overworld, Firstlight, existing interior scenes and the added castle/house/inn floors. The final audit includes 654 furnished rooms, 720 bookcases, five ranges, 370 chairs, 497 outdoor lamps, 30 market stalls and 42 interior service/workstation routes. A total of 3,956 props receive explicit anchors; 189 incompatible, duplicate or obstructing objects/decorative structures are rejected. These counts are recorded in `qa/prop-placement-audit-2026-09-16.json`.

The metadata catalog specifies model footprints, indoor/outdoor compatibility, room/zone purposes, wall requirements, anchor types, spacing and interaction clearance. Functional placement is deterministic. Candidate validation checks wall/window alignment, doors, circulation, stairs, buildings, roads, bridges, terrain, overlap and front access. Invalid optional dressing is omitted; missing required workstations fail validation rather than silently disappear.

Wall furniture faces inward and meets the actual wall plane with a small model offset while retaining integer gameplay coordinates. Beds have accessible sides; chairs face their associated tables; counters separate attendants from visitors. Counters and attendants can move together within their existing room, retaining stable NPC IDs. Civic bankers receive explicit customer counters. Library/study/council tables display research materials. The Ironcrown quest records are a reachable physical wall bookcase; their existing object ID and live-object journal guidance remain intact.

Outdoor lamps follow road shoulders and stay outside building footprints. Squares use deliberate civic focal points; market stalls face customer circulation. Storage uses service yards and courtyard edges. Quarry equipment groups around loading aprons. Small graded prop footings preserve the quarry access ramp. Goblin shelters face the camp, while barriers, tents and natural clutter leave the bridge clear. All fifteen goblins and six shelters remain.

Rendering applies placement orientation once, including later-added models. Lantern light positions follow rotated fixtures. Client navigation and the exported shared-server navigation use the same oriented prop footprints, avoiding the previous single-tile/radius mismatch. Required quest scenery remains at its authored gameplay anchors.

## Problems found and repaired

- The recording's goblin crossing had scenery occupying the bridge/approach. Removed obstructing clutter and relocated camp dressing to protected anchors.
- Bookcases and ranges could face or float away from walls; chairs could face away from tables. Corrected facing and actual model-to-wall offsets globally.
- Lamps could occupy roads or interiors; duplicate wells and poorly oriented stalls lacked consistent civic composition.
- Some service counters lacked usable staff/customer space. Relocated the complete station within its room and checked all service routes.
- A substring classifier treated **Stable feed** as a table. Word-boundary classification and a proper storage model now keep it on courtyard service edges.
- A legacy, non-interactive Hollow Gate arch intersected a Briarhaven residence. Architectural dressing is now rejected when it overlaps a usable building; the house and gameplay identities remain in place.
- Initial work-pad grading changed the Copperdelve ramp edge. Ramp geometry is explicitly protected and checked across all five quarries.
- The initial full sweep ran against stale compressed assets; rebuilt the Worker/assets/catalog and verified served bytes. The story test hit its 240-second budget under concurrent render load; a standalone run completed the walkthrough and all six fresh-runtime save restores without changing its assertions or timeout.
- The capture harness used saved playtime instead of the synchronized world clock for night shots. The QA clock now actually selects night; production day/night behavior is unchanged.

## Verification

Initial full sweep: 139 scripts, with 136 passing and the three issues above retained in `qa/prop-placement-initial-2026-09-16.json`. Focused geometry, story and built-output/shared-server rechecks are retained separately. `qa/prop-placement-final-2026-09-16.json` combines the full sweep with those final rechecks; it is not a second complete sweep.

Coverage includes movement, contextual input, camera, doors, all settlement entrances, visible floor transitions, the complete quest arc and lift rescue, guidance, skill gates, death/retry, banks, shops, equipment, drops, saves, tutorials, teleporting, following, trading after combat, chat and settings/logout. Two authenticated local clients verify shared combat and immediate animations even without a local target, all eight Spirit Unleashes, quarry resources, floor scenes and day/night synchronization. The 39-client local SQLite workload passes; it does not certify sustained hosted capacity.

Rendered and visually inspected 26 normal-camera views using production geometry/shaders: small house, two-story house, tavern, shop, library, great hall, castle bedroom, dungeon, Briarhaven square, Ironhollow street, quarry loading area, capital market, night street, goblin bridge, dwarven workshop, elven library, Firstlight kitchen, abandoned quarry, and Ironcrown council room, guard/stair hall, kitchen, barracks, armory, courtyard, private study and cellar. Re-rendered corrected exteriors and the house after follow-up repairs. Reproduce with `node scripts/qa/capture-props.cjs`.

Browser review used isolated production-script state at desktop 1280×720 and landscape 844×390 / 667×320. Actual click movement, native right-click menu, visible stairs to the upper chambers, bank deposit/withdrawal and shop access worked. Only browser-extension metadata errors appeared in the inspected console; no game error was observed. Some control calls timed out after delivering input, so subsequent visible state was checked. The preview used the software fallback; offscreen renders exercised GPU shaders. Physical-device gestures and sustained hosted multiplayer load remain unverified. Disposable review pages were removed before packaging.

## Release constraints

No account reset or schema migration. Stable quest/NPC identities remain. The shared collision/catalog changes require the in-game two-minute warning, confirmed maintenance lock, deployment, finishing the same maintenance request and an independent open-state verification. Mirror the exact source tree to private GitHub main without rewriting its existing history.
