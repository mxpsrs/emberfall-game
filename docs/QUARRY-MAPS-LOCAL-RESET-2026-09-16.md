# Quarry maps and local account files — 16 September 2026

The owner requested deletion of the running source checkout’s local account files, explicitly excluding the hosted database, and named surface quarries with the existing Mining icon on the maps.

## Local account reset

The existing local server uses `scripts/local-storage.mjs`: character JSON files in `player-saves/` and local account/password/session/social data in `server-data/veldren.sqlite`. These are ignored runtime data, not committed source. An initial search overlooked this implementation; it was corrected before acting.

Verified no process held these files open. The current checkout contained **zero accounts, zero character saves and zero sessions**, with no player JSON files. Removed `veldren.sqlite` and its WAL/SHM sidecars. No local account files remain. No hosted database, hosted sessions, cloud backup, maintenance state or production reset endpoint was changed. Clearing this checkout does not reset hosted players or other computers’ local games.

README now explains a complete local reset: stop the server, delete both local storage folders, restart, then register again. Removing JSON files alone preserves login credentials. The local-storage integration test also exercises full deletion, rejected old login, revoked old session, registration with a previous username and no previous character progress.

## Surface quarry discovery

All five authored quarries now have one named Mining service marker each, derived from the real quarry and ore objects:

- Ironhollow Crown Quarry
- Copperdelve Cut
- Crown Masonry Quarry
- Deepforge Regional Quarry
- Old Stoneford Cut

Markers and names appear on the full atlas, zoomed maps and nearby minimap. The existing attributed `mine` pickaxe artwork is reused. The “Mines & quarries” filter and accessible location list include the sites, their actual ore types and Mining requirements. Navigation targets the usable south access ramp, rather than the pit or a fictitious interactable. Closed-door handling and the tutorial travel restriction remain in effect.

Existing surface ore, skill levels, rewards, depletion and respawns are unchanged. Quarry names do not depend on individual ore availability. Atlas kingdom labels avoid service markers after visual inspection found Aurelia covering the Old Stoneford icon.

## Verification

Focused checks cover quarry labels/icons at desktop and landscape canvas scales; scaled touch selection; scene preservation; minimap visibility; paths from all five ramps to every surface ore node; tutorial gating; existing map services; castle/floor navigation; two authenticated clients harvesting and observing quarry depletion/respawn; and local account persistence/reset.

The actual production canvas renders are generated under ignored `.qa/quarry-maps/` by `tests/quarry-maps.cjs` and visually inspected. This is offscreen canvas and local authenticated integration evidence, not physical-phone or hosted-capacity certification. All seven focused checks pass, including the production build’s 92 startup resources. See `qa/quarry-maps-2026-09-16.json` for the final test result.

The publication changes map presentation only. No hosted schema, server behavior or shared catalog changes are required, so the game stays open during publication under the owner’s maintenance clarification.
