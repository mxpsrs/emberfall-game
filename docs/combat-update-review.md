# Staged combat, sound, and Forest Giant release

The owner requested that each finished batch be published as it completes. This
batch releases the available native creature and ordinary-combat/audio work.
The four approved boss designs and the ordinary dungeon Ork remain gated until
their actual source files, animations, and environments have been checked.

## Released behavior

- Rats use one shared baseline throughout the tutorial and mainland: 8 health,
  maximum hit 1 instead of 2, and fixed level 1. No per-instance rat tuning.
- The starter simulation with a level-1 character and bronze dagger has a
  15.00-second median across 1,000 seeded fights. The 95th percentile is 29.70
  seconds because misses and accurate zero-damage rolls remain possible. The
  duration is a balance result, not a scripted timer. Stronger gear and skills
  shorten fights naturally.
- Enemy tiers are fixed. They do not grow to match the player's level.
- Fourteen ordinary enemy variants add 42 spawns across five hunting grounds.
- Three level-18 Forest Giants live in a mainland Elderwood grove with mature
  resource oaks, ferns, bushes, mossy boulders, log piles, and clear fighting
  space. These are ordinary monsters with bones/logs/coin drops and normal
  respawns. No boss marks, phases, or boss music.
- The rejected procedural boss mesh bundle is removed. Older quest enemies
  are ordinary Ruins guardian, Crypt guard, and Ashwatch guardian creatures;
  existing quest completion and cache flags remain intact. No empty boss lairs
  or unavailable boss cards are exposed in this batch.
- The Tournament plays on login/character creation. Medieval Opener plays in
  the tutorial and is assigned to future released bosses. Existing commercial
  use area music remains. Skill/combat sounds include 24 CC0 recorded clips
  and synthesized cues, with mute and separate music/effects/environment levels.

## Verification

Passed: all 36 tutorial lessons and one-way mainland departure; mainland spawn
flood/path checks; shared rat stats; 1,000 starter fights; preserved accurate
zero hits and misses; Forest Giant body targeting, native melee actions,
ordinary drops and retreat; audio transitions and sample loading; GPU and CPU
skinning and context-loss fallback; cross-device save round trips including
Forest Giant kill counts and legacy quest flags; build and all startup assets.

The Forest Giant's original FBX contains 7,340 triangles, 33 skin joints, and
10 native actions. All actions deform correctly; close-up and habitat captures
use the production geometry, texture atlas, and GLSL. See forest-giant-review/.
They are render captures, not claims about measured mobile GPU performance.

## Remaining batches

Original model download access still blocks the Colossus, Veyr, Varkesh, Xalith,
and Ork. Lair source is staged behind explicit release checks. Complete and
verify each one, then publish it without asking again for design or deployment
approval. The Colossus must remain stationary, switch among melee/ranged/magic,
and have exactly two phases; its second phase turns red and attacks faster.
