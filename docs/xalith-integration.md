# Xalith the Broodmother — September 13, 2026

The owner supplied `insectoid-monster-rig.zip`. Its original `Bugoid2.blend`
opens successfully with embedded script execution disabled. Xalith now occupies
the Brood Hollow, an amber hive cavern reached from the Moonwillow area.

## Original asset and animation coverage

[Insectoid Monster Rig by DM-913](https://sketchfab.com/3d-models/insectoid-monster-rig-01323e4b2563430f9da85cd255b6e176)
uses [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution,
source links and modification details are in the game's art credits, reachable
from the adventurer's handbook. No replacement creature mesh was generated.

The body has 6,603 source vertices and 13,156 triangles. All triangles survive
conversion; UV seams and split normals produce 9,094 runtime vertices. Editor
text-label meshes are excluded. Original body and wing color/opacity images use
separate atlas tiles. Other creatures' atlas pixels remain exactly unchanged.
The game's existing diffuse/cutout renderer does not implement Blender's full
bump, normal, subsurface or translucent material setup.

The source rig has 84 bones, including 69 weighted bones. The spine, neck,
abdomen and four main wings use curved B-bones. Baking their original segments
and pruning unweighted segment endpoints produces 157 weighted runtime joints.
Three cached mesh batches fit the existing 80-joint WebGL 1 shader. All original
triangles and their converted weights remain present across those batches.
The CPU fallback deforms the complete rig directly.

The source actions are **PoseLib**, frames 1–35 at 24 fps, showing landing and
settling, and **PoseLib.001**, a static one-frame pose. They do not constitute a
walk/attack/death set. The grounded final PoseLib pose supplies the starting
stance for seven new **Veldren-authored** motions on that same skeleton:

| Motion | Duration | Purpose |
| --- | --- | --- |
| Idle | 2.8 s | Breathing, jaws and small wing movement |
| Walk | 1.1 s | Alternating planted and lifted feet, counter-swinging arms |
| Run | 0.78 s | Longer stride and higher foot clearance |
| Left scythe | 1.45 s | Windup, cleave and recovery |
| Right scythe | 1.45 s | Alternate cleave |
| Hit | 0.50 s | Brief torso and head recoil |
| Death | 2.3 s | Body rolls onto its side; IK controls fall with the rig |

The conversion uses the game's four-weight linear skinning in place of
Blender's preserve-volume skinning. The largest sampled positional difference
before byte-weight quantization is 0.1173 game units, in running; source-space
and per-clip figures are recorded in `boss-candidates/xalith-blender-audit.json`.
This is an approximation, not a claim of identical Blender shading/deformation.
The slow idle cycle samples at 12 fps with runtime interpolation; the six
action/movement clips retain 24 fps sampling. This keeps the embedded Worker
below the observed 64 MiB hosting limit. The build now enforces that limit
before packaging. Gameplay loops return to their starting poses, and split GPU deformation
matches the full CPU reference. The exporter script reproduces the authored
motion and does not overwrite the original upload.

## Encounter

Xalith remains a fixed level 62, single-phase melee boss with 236 HP and an
11-point maximum hit. She alternates the two scythe clips. Each 1.15-second
ground warning ends at the reviewed 53% animation impact point, followed by
0.70 seconds of recovery. Players can step beyond the marked circle.

The cavern keeps a clear approach, open arena, amber eggs, rocky boundaries,
nest and visible exit. Each kill places 240 coins, five hunter's marks and the
configured materials on reachable ground. The first clear adds 248 bonus coins.
Death, a 60-second respawn, retreat healing/reset and returning to the mainland
use the existing encounter system. No account, save-schema or combat-roll
changes are included. The dragon is outside this asset integration.

## Verification

- Original source hashes, action inventory, hierarchy and conversion metrics
  are retained in the import and Blender audit records.
- Production-engine offscreen ES2 renders cover stance, walking, scythe windup
  and impact, death, and the cavern. These are graphics checks, not browser
  input tests or measurements on the owner's iPhone.
- Xalith checks cover all seven motions, loop boundaries, full geometry,
  material separation, split-palette equivalence and the collapsed death pose.
- Encounter checks cover the connected mainland entrance, melee approach,
  clear arena routes, exit, single-phase behavior, warning/impact alignment,
  reachable loot, first-clear reward, reset and respawn.
- The existing renderer check passes with 11 simultaneous creatures, reusing
  geometry while applying all palettes to shadows and color. The limited-GPU
  fallback also draws Xalith. Existing encounter checks pass.
