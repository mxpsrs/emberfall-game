# Modular characters and renderer performance

The live Filament path now assembles the authored body, clothing, hair and beard
into shared indexed geometry with bone attributes. Animation uploads the bone
palette instead of deforming and uploading every character vertex on the CPU.
The software creator preview retains the reference CPU animation path.

Universal Base Characters imports include both bodies, both buzzed hair variants,
parted hair, long hair, buns, beard and eyebrows. Saved hairstyle IDs 0–3 remain
stable; buns use ID 5. Retired non-Quaternius hairstyle ID 4 displays the authored
side part, and the retired shaped beard displays the authored beard. Generated
scalp caps are removed. Top and bottom each offer None, which retains the authored
body and underwear without adding clothing geometry. Explicit body, eye and eyebrow channels protect the eyes
from body/clothing tint. Eye color changes the iris mask and preserves unmasked
whites/pupils. The assembled character now binds the original body, eye and hair
PBR materials per primitive, including their base-color, normal and roughness
textures. Skin tint uses an explicit per-pixel mask that protects the supplied
underwear, identified from the author's two underwear texture variants. Iris and
hair controls use separate material instances; textures and shader resources are
shared. The software creator/equipment previews also sample the original textures
per pixel. Existing modular clothing keeps its atlas compatibility material.

Humanoid and creature clips sample fractional frames with shortest-arc spherical
rotation interpolation. Idle motion, locomotion and combat no longer round phase
or blend weight into visible steps. Actor transitions blend from the last displayed
joint pose, including an interrupted transition. Movement, stopping and heading
use elapsed-time exponential smoothing. Clip selection and gameplay event times
retain their existing behavior.

Canonical geometry fetch, parsing, native WASM render planning and stream decoding
run in a cancellable worker. GPU construction retains the existing bounded frame
queue and mobile two-load limit. Registry leases invalidate only affected cached
records. Static assemblies reuse composed transforms until a part, root or terrain
revision changes. Nine scenery models have material/UV-aware distance detail,
reducing their combined triangles from 31,938 nearby to 16,784 far away, with the
original bounds and native LOD policy retained.

Settings performance recording includes CPU simulation/scenery/drawing timings,
resource/streaming counters and asynchronous GPU elapsed time where the browser
supports disjoint timer queries. Unsupported/disjoint timings remain unavailable.

## Validation

Actual WASM/Filament NOOP tests cover bone matrix conversion, palette upload reuse,
geometry allocation, terrain revision transforms, mobile streaming limits,
cancellation, stale-source rejection, invalidation, repeated travel/unload and
resource teardown. Character tests cover both frames, supplied hairstyles,
equipment/clothing, saved appearance compatibility, iris isolation and skin tint.
Actual local browser WebGL and software previews were visually inspected for both
frames, light/dark skin, supplied hair and the original underwear. Animation tests
exercise 111 moving clips, quaternion sign equivalence, stopping from a mixed gait,
interrupted transitions and creature pose continuity. Combat/action regression
checks preserve loot, respawn, burial commits and projectile release/impact timing.
LOD tests verify native selection, finite geometry, reduced index
counts and conservative bounds. GPU timer tests cover unsupported browsers,
bounded asynchronous queries and disjoint resets.

The prior v233 cooked-world 20-frame CPU harness compared v232 with that renderer
update; these figures do not measure this subsequent material/animation change:

| Measurement | v232 | Updated |
| --- | ---: | ---: |
| First frame | 5,285.6 ms | 4,668.2 ms |
| Following 19 frames, mean | 288.2 ms | 251.5 ms |
| Following 19 frames, median | 245.3 ms | 255.3 ms |
| Following 19 frames, worst | 1,009.2 ms | 565.6 ms |
| Character drawing, 100 calls total | 1,016.6 ms | 455.0 ms |

These are synthetic CPU timings using Filament NOOP, without browser layout,
GPU rasterization or a physical phone. They do not certify gameplay FPS, hosted
player capacity, or a Genshin/Warcraft-sized world. Terrain grading and native
scene reads remain substantial CPU costs. On-device recording is required to
measure the remaining bottleneck and the actual GPU/frame-time effect.
