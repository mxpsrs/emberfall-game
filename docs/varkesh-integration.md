# Varkesh the Blightwing — September 13, 2026

The owner's original `prowler-dragon-variant-rig.zip` now supplies Varkesh in
Blightwing Roost. The uploaded Blender file works with the Blender 4.5.3 and
Python 3.11 runtime installed during the insect work. The original archive and
Blender file are preserved, and embedded scripts remain disabled.

## Model and motion

[Prowler Dragon Variant Rig by DM-913](https://sketchfab.com/3d-models/prowler-dragon-variant-rig-7ee71aaf323d426bbbdf28d73d55bbd9)
uses [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution and
modification notices appear in the game's art credits.

All 19,436 triangles in the supplied body survive; UV and normal seams produce
12,390 runtime vertices. Its 125-bone control rig includes 94 weighted bones.
The neck, tongue, spine, tail and wing fingers have curved B-bones. Their
evaluated segments produce 234 weighted runtime joints, divided into cached
draw batches that fit the existing WebGL 1 shader. The original mesh and
character design are retained. The gameplay origin lies near the chest, so
the long tail does not displace the combat target behind the body.

The original Diffuse16 color map and Alpha2 cutout map supply the body; eyes
keep their original color map. Full Blender normal, roughness and material
shading are not reproduced by the game's diffuse renderer.

Five source action records were inspected. `Action.001` and `Action.002` show
flight and landing, `PoseLib` is a static pose, and `Walk Loop` and
`Walk Loop.001` show locomotion. They are not a supplied combat set. The runtime
uses the complete `Walk Loop`, frames 1–118, retaining all three steps and its
matching loop endpoints. Running retimes that same cycle. Distance-based gait
progress accounts for all three steps instead of squeezing them into one stride.
The flight/landing records are documented but are not used as combat actions.

| Runtime motion | Duration | Provenance |
| --- | --- | --- |
| Idle | 3.2 s | New breathing and small wing/tail movement |
| Walk | 4.875 s | Complete original Walk Loop |
| Run | 3.3 s | Original Walk Loop, retimed |
| Fangs | 1.55 s | New pullback, open jaw, strike and recovery |
| Breath | 2.3 s | New inhalation, jaw opening and exhalation |
| Hit | 0.55 s | New head and torso recoil |
| Death | 2.8 s | New grounded chest collapse and settling |

Blender's preserve-volume deformation differs from the game's four-weight
linear skinning. Bind positions and split normals are compensated against the
original evaluated grounded stance. Every delivered action is sampled against
Blender and recorded in `boss-candidates/varkesh-blender-audit.json`. Before
byte-weight quantization, the largest sampled difference is 0.4484 game units
at an extreme death-pose vertex; 99% of sampled death vertices differ by less
than 0.076 game units. Ordinary idle, bite and breath errors are smaller. These
are measured approximations, not claims of identical deformation or shading.

## Encounter and verification

Varkesh is a fixed level 30, single-phase boss with 108 HP and a maximum hit of
6. At close range he uses a marked fang strike; farther away he uses blighted
breath. Each warning locks its direction, the matching animation reaches its
impact pose when the warning expires, and stepping aside or behind him clears
the affected sector. Breath effects use a socket on the original head bone.
Recovery completes before he resumes approaching the player.

Blightwing Roost has a connected mainland entrance, clear approach and arena,
rock formations, nest, pools, trees and a visible exit. Defeat places 105 coins,
three hunter's marks and configured materials on reachable ground. The first
clear adds 120 coins. Retreat heals and resets the fight; respawn takes 60 seconds.

Production offscreen ES2 renders verify the actual model, split skin palettes,
animation, warning sector and roost. Automated checks cover native loop seams,
finite deformation, collapsed torso, head socket, aim locking, dodge boundaries,
bite/breath impact timing, connected entrances, loot, reset and respawn. These
are rendering and game-logic checks, not browser-input or iPhone performance tests.

The insect's original model, seven gameplay actions, Brood Hollow, drops and
respawn also pass the existing Xalith checks. The server's presence whitelist
now includes Veyr, Varkesh and Xalith alongside the Colossus; two-account checks
confirm player discovery inside each lair and rejection outside its map bounds.
No account reset or save-schema change is part of this update.
