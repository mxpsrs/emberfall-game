# Veldren release checkpoint — September 13, 2026

The owner authorized asset selection/downloads and incremental publication of
tested work. Version 52 published the sound/combat/Forest Giant batch. Version
53 published native Orks and their dungeon. Versions 55–57 published Firstlight, the Colossus, the direct account-reset protocol and the tutorial-video follow-up. The current source also integrates Veyr and the Shattered Sanctum, Xalith and the Brood Hollow, and Varkesh and Blightwing Roost.

Firstlight now owns its roads and building plans. Its square has cobbles, a
well, two market stalls, benches, planters, lanterns and a noticeboard. The bank,
kitchen, smithy, school, shrine and training yard occupy distinct parts of the
island. Ash has an expanded grove of level-one trees around the timber trail. Original
mainland lots remain independent. Layout migrations move old apprentices safely
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

- Veyr is now complete: Demon.fbx and both texture archives recovered through
  the normal CGTrader download page. Archive contents verified. Original body,
  orb and default color maps imported; 26 source takes inspected, with ten
  reviewed runtime clips. The rig has 44 genuinely weighted skin clusters;
  unused per-mesh cluster entries are pruned. See `veyr-integration.md`.
- Xalith: owner-supplied `insectoid-monster-rig.zip` inspected and integrated.
  Full original mesh, body/wing color maps and curved rig retained. Missing
  gameplay clips were authored on that rig; see `xalith-integration.md`.
- Varkesh: owner-supplied `prowler-dragon-variant-rig.zip` opened and integrated.
  Original 19,436 triangles, native complete walk cycle, original color/alpha
  maps and 234 weighted curved segments retained. Five gameplay actions were
  authored on the original rig; see `varkesh-integration.md`.
- The Blender runtime installed during the insect work also opens the dragon.
  Do not ask the owner to replace the uploaded originals with FBX files.
  Earlier failed Epic security verification must not be retried or bypassed.
- CGTrader sign-in succeeded after the owner explicitly approved Google profile
  sharing. Its downloads emitted browser protocol errors despite some completed
  transfers. A browser security restriction blocked a download-status check;
  do not probe internal download-manager pages or alternative control channels.

All four selected boss lairs are open. The server accepts player presence in
all four, with scene bounds checked. Native Forest Giants and Orks remain
ordinary monsters without boss phases, marks or boss music. Only selected
bosses get multiple styles/phases. Do not revive rejected procedural bosses or
retired names. Continue with commercially usable originals when available;
the owner's asset and publication authorization persists.
