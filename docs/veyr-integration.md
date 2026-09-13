# Veyr the Mindbreaker — September 13, 2026

The Shattered Sanctum now contains the approved Veyr model and complete boss
encounter. This adds a level 20 fight between the ordinary early hunting grounds
and the level 42 Colossus. Both have fixed stats. Forest Giants and Orks remain
ordinary monsters.

## Original model and motion

[Demon Creature with Weapon by andriichykrii](https://www.cgtrader.com/free-3d-models/character/fantasy-character/demon-creature-with-weapon-25-animations-2-skins)
was recovered through its authenticated CGTrader download page. `Demon.fbx`,
`Demon_tex.rar` and `Ball_tex.rar` arrived despite a browser download-handle error.
Both full archives passed extraction checks. No internal download-manager access
or security-check workaround was used.

The runtime retains all 17,244 source triangles: 15,080 for the body and 2,164
for the orb. The original default body and orb color maps occupy separate atlas
tiles. The source contains 26 takes, including the A-pose. Ten runtime clips use
reviewed windows from the original actions; the repeated source takes are not
sped up into multiple strikes. The original orb bone remains a child of Hand.R.
Removing unused skin-cluster entries leaves 44 weighted clusters and 46 hierarchy
nodes, within the existing GPU budget.

| Runtime motion | Original take | Source interval, seconds |
| --- | --- | --- |
| Idle | Idle1 | 0–2.4 |
| Walk | Walk1 | 0–1.2 |
| Run | Run1 | 0–0.8 |
| Orb strike | Punch2 | 0–0.8 |
| Alternate strike | Punch1 | 0–0.8 |
| Jumping slam | Punch3 | 0–1.6 |
| Rift eruption | Shoot1 | 0–2.4 |
| Mindbreak pulse | Telepathic | 0–2.4 |
| Damage | Get-damage | 0–1.2 |
| Death | Death | 0–2.6 |

The import audit records original file and texture hashes, action names, source
windows and impact points. The importer interpolates fractional window boundaries
with normalized quaternions. CGTrader Royalty Free (no AI) incorporation applies;
the public game contains converted runtime data, without original FBX or archives.

## Fight and sanctuary

The watcher phase alternates native melee strikes and targeted magic eruptions.
Below half health, Fractured mind adds a telepathic ring with a safe center and
safe outer area, plus the native jumping slam. Attack poses reach their reviewed
impact points when the ground warning expires. Veyr can approach between attacks;
the Colossus remains anchored. Neither boss gains player-dependent scaling.

The sanctuary has an intact walkable floor, connected masonry boundaries,
ruined arcades, archive alcoves, crystal basins and an arcane orrery. Its central
arena stays open for movement. Foreground masonry fits its tile width independently
of its cutaway height, avoiding gaps between wall sections.

The first clear awards 80 bonus coins. Each defeat drops 70 coins, three hunter's
marks and the configured materials on reachable ground. Veyr plays his native
death action and respawns after 60 seconds. Retreat and scene changes reset the
fight; existing character saves and account credentials are unchanged.

## Verification

- Actual production geometry, textures, shaders and animation palettes rendered
  for native strikes, casting, death and the sanctuary. These are offscreen ES2
  render checks, not browser-input or device-performance tests.
- Encounter checks cover connected entrances, arena routes, solid scenery,
  warning/impact alignment, ring safe areas, both phases, loot, reset and respawn.
- Original geometry, separate materials, hand-bound orb and finite poses pass
  import checks. The renderer handles ten simultaneous creatures with unchanged
  geometry buffers, both shadow/color palettes and a low-capability fallback.
- The 1,000 seeded starter-rat fights retain misses and accurate zero-damage
  rolls: median 15 seconds, p95 29.7 seconds, zero deaths in that sample.
- The encounter test now advances its wall clock together with respawns and
  actually dodges the Colossus warnings, removing random rescue-related failures
  from the lair assertions.

Varkesh and Xalith remain gated. Their official Fab listings are recorded in the
roster, but their original Blender packages remain unavailable after the security
check. Neither an empty lair nor an unapproved replacement model is published.
