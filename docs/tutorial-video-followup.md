# Firstlight recording follow-up — September 13, 2026

Reviewed the supplied 7:32 recording across its full timeline using sampled
frames, then inspected the affected source and rendered the changed game models.
No audio transcription or real-device browser verification is claimed.

## Fixed in this batch

- The furnished square and its civic building lots now have a shared, level
  finished surface. Twelve-tile earth slopes blend the developed ground into
  the island. Coastal water, the surrounding natural terrain, and mainland
  elevations retain their existing rules. All three civic foundations and every
  half-tile of the square are checked for a common elevation.
- Around 7:00, completion was followed by a disconnect and an island reload.
  Presence used an obsolete layout-version check and could announce the mainland
  before saving completion. All scene changes now wait for pending saves, and
  replies to old-scene requests cannot overwrite the new scene or disconnect it.
- Rowan now uses the native magic gesture, sends motes toward the player, and
  opens two rings around their feet. The crossing fades to the mainland and
  finishes with an arrival effect. Gameplay is locked during the sequence;
  completion/rewards/destination are saved together. A cast interrupted by a
  reload can resume from the final lesson. Duplicate activation cannot grant
  rewards twice. Remote tutorial skipping also includes Rowan's cast.
- Around 4:02, Equipment replaced the bag. Its main button now opens the shared
  equipment/character/stats window beside the usable bag. The tool belt appears
  inside that window. Bank, workshop and equipment windows temporarily reclaim
  the icon rail's horizontal space, with their close controls restoring it.
- Tutor portraits now use their world appearance, body type, hair and clothing.
  Vale wears iron armour with his face uncovered in both views. Rowan keeps the
  same appearance on the mainland. Around 5:02, the narrow banker conversation
  was caused by the open bag reducing dialogue width; conversations now keep the
  same broad frame. The island bank is named Bank of Firstlight.
- The food lesson explains why full health keeps the food for later, matching
  the no-consumption behavior visible around 2:22.

## Verification

The complete 36-lesson route passes with item targeting, gathering, crafting,
combat, banking, spirits, the casting delay, one-way completion and reload
recovery. Deferred HTTP tests cover every island layout version, a previous
save still in flight, a late island presence rejection, and a real save failure.
Equipment interaction and explicit item-use checks pass. Audio checks cover
29 cues, recorded foley, and area/music transitions. Production geometry and
shaders were rendered for the level square and Rowan's casting pose; all tutor
portraits were rendered through the production portrait painter.

## Other work retained

Rats retain the globally tuned approximately 15-second starter encounter and
zero-damage hits. The installed skill/combat sounds, two supplied music tracks,
Forest Giants, Orks, their dungeon, and the Colossus lair remain in the game.
The existing direct global-reset protocol is retained; this release runs no reset.

Veyr still needs the original Demon body textures. Varkesh and Xalith still need
their original rigged model packages. The earlier provider access restrictions
remain unresolved; those three incomplete lairs stay gated. See the existing
lair integration checkpoint for the exact asset/access history.
