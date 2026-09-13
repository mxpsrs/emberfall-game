# Emberfall release checkpoint — September 13, 2026

The owner authorized asset selection/downloads and incremental publication of
tested work. Version 52 published the sound/combat/Forest Giant batch. Version
53 published native Orks and their dungeon. The current source adds Firstlight's
new town layout and the fully integrated Runeforged Colossus.

Firstlight now owns its roads and building plans. Its square has cobbles, a
well, two market stalls, benches, planters, lanterns and a noticeboard. The bank,
kitchen, smithy, school, shrine and training yard occupy distinct parts of the
island. Ash has an expanded grove of level-one trees around the timber trail. Original
mainland lots remain independent. Layout version 2 moves old apprentices safely
to the square while preserving their current lesson and belongings. All 36
lessons pass through actual routes and interactions, ending with the one-way
crossing to Briarhaven. Mainland characters cannot re-enter Firstlight.

The Colossus retains Icebronze's 10,344 triangles, original texture and skin,
and its two native takes (idle and anima). A single native action gesture is
used for melee, ranged and magic with distinct game effects. The package does
not contain separate style clips or a death take. Death uses a held native pose
with game-authored crystal shatter and dissolve. No extra native clips are claimed.

The boss stays on a solid pedestal in the Crystal Crucible. Below half health
it turns red and its attack cycles become 25% shorter. Exactly two phases are
enabled. The lair has stone columns, runes, crystals, rock boundaries and a
clear approach. Tests cover all styles, dodging space, melee reach, accessible
loot, first-clear rewards, retreat/scene resets and a blue 60-second respawn.
The hunting journal still links to ordinary hunting grounds.

Native render checks use the production geometry, textures, shaders and
animation palettes in an offscreen ES2 context. They verify graphics output,
not browser input or device GPU performance. A 9-creature animation check also
verifies buffer reuse, both shadow/color palettes, recolor/dissolve resets and
fallback deformation. All 1,000 seeded starter-rat fights retain zero damage
and misses: median 15 seconds, p95 29.7 seconds, zero deaths in that sample.

## Remaining assets and access

- Veyr: original Demon.fbx and orb materials downloaded. The 26 takes (25
  actions plus A-pose) are inspected. Demon_tex.rar body textures are missing;
  the FBX contains no embedded textures. Several takes contain repeated cycles
  that need a reviewed single-cycle trim. Do not publish incomplete materials.
- Varkesh and Xalith: original Sketchfab packages remain unavailable. Epic
  verification failed after the owner's approved attempt and was reported.
  Stop retries and do not work around the challenge.
- CGTrader sign-in succeeded after the owner explicitly approved Google profile
  sharing. Its downloads emitted browser protocol errors despite some completed
  transfers. A browser security restriction blocked a download-status check;
  do not probe internal download-manager pages or alternative control channels.

The remaining three lairs stay gated. Native Forest Giants and Orks remain
ordinary monsters without boss phases, marks or boss music. Only selected
bosses get multiple styles/phases. Do not revive rejected procedural bosses or
retired names. Continue with commercially usable originals when available;
the owner's asset and publication authorization persists.
