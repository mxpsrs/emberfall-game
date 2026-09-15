# Quest fights and single combat

Owner-requested changes: completed quest fights disappear per player; every monster below level 27 refuses a second combatant with “Someone else is fighting that.” Level 27 and above retain shared combat.

The renderer, world selection, minimap, combat actions, shared snapshots and combat effects use the player's quest state. Exporting the world also exports the same phase predicate to the server. Main-story lookout and shade, Oathbound Watcher, Ruins guardian, Ashwatch guardian and story Veyr all disappear after their required fight. Normal wolves and other wildlife used for kill-count objectives remain normal creatures. Veyr rematches require an explicit Huntsman crossing; leaving or defeating Veyr clears this opt-in.

Server compare-and-swap transactions enforce the under-27 claim for attacks, damage and spirit hits. A zero-damage attack still claims the monster. Existing NPC disengagement releases a claim when its player leaves range or presence expires. Client feedback also rejects selecting an already claimed monster, and clears a queued attack rejected by the server.

Validation: combat-claims.mjs (26/27 boundary, attacks, spirit hits, disconnect release); quest-fight-phases.mjs (all quest fights, same client/server rules); authenticated quest-shared-credit.mjs (two accounts, real animated kill, private loot, save/reload, observer respawn and completed-player suppression including stale snapshot); shared-world.mjs (combat, doors, loot, resources); mountain-quest.cjs (both chapters and repeat hunts); built-assets.mjs.

No account reset or database migration. This server update requires the system-update countdown, maintenance lock, publication, then reopening. Local integration is not a physical-device check or hosted 39-player capacity certification.

Spirit art: the owner rejected both generated portrait sets and Ækashics. No replacement from those candidates is included. Only free-for-commercial-use artist-made candidates may be offered next; appearance remains an unresolved art choice. Cutscenes remain on hold at the owner's request.

Published as v108 at 2026-09-15T09:04:20.164475Z. Runtime source: `c885614f7ca24040e44c986985f4e623fe5cd9d6`. Deployment: `appgdep_6aa909ff69548191a3eb03f7020370bf`. Maintenance request: `quest-fight-claims-20260915`; warning/countdown and lock preceded publication.
