# Approved creature and lair integration — work in progress

This is a saved development checkpoint, not a published update. The four approved
boss models have not yet been imported, and the old encounter roster still needs
replacement. Do not publish this checkpoint as completed boss integration.

## Imported asset

Forest Giant uses the creator's original Tree02 FBX and light albedo from
[Tennessippi Studios' Free Treant Pack](https://tennessippistudios.itch.io/treant-pack),
licensed CC0. The conversion preserves the original 7,340 triangles, 33 skin
joints, and ten native actions. `tests/approved-creatures.cjs` verifies finite
deformation and actual motion across every imported clip. The slower walking
alias uses the source Run animation; it is not a separately authored walk.

The game asset loads through `approved-creatures.js`. Visual review, normal
Forest Giant spawns, and the forest habitat remain to be completed.

## Environment work

`lairs.js` establishes separate scenes and themed scenery using the game's
existing authored environment meshes. It includes a crystal foundry for the
Colossus, an arcane sanctuary for Veyr, a mountain roost for Varkesh, an amber hive
for Xalith, and ordinary Ork camps in dungeon workings. Theme lighting is wired
into the renderer. This scenery is an initial implementation, not visually
approved or fully navigation-tested.

## Remaining integration

- Obtain and inspect the five remaining original model packages and their clips.
- Replace the rejected boss bodies and visible names; preserve saved quest flags.
- Place each approved boss in its own lair. Forest Giant and Ork stay ordinary
  enemies, without boss rewards, phases, or boss music.
- Finish safe mainland approaches, return points, scenery collision, and journal
  navigation. Verify saved characters can leave every lair.
- Implement the stationary Colossus with exactly two phases; the second turns
  red and has a faster attack cycle. Verify reset, hit radius, and all three
  attack styles against the imported model's real animation coverage.
- Verify gameplay and visual presentation at mobile and desktop sizes, then
  publish the completed update. Keep misses and accurate zero-damage hits.

Epic Games sign-in was selected for Sketchfab and currently requires a human
verification check. CGTrader's separate Google consent remains unapproved:
automatic approval review rejected sharing the user's name, profile picture,
and email with CGTrader. Do not retry that consent without explicit approval.
