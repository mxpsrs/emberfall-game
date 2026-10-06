# October performance phase two: hidden-object culling

The Filament renderer now skips complete static instances whose conservative
bounds are wholly covered by current opaque geometry. The existing native
partition, frustum and LOD results remain authoritative inputs. This is a
presentation pass; it does not remove canonical Scene entities or edit collision,
doors, accounts, character saves, stable IDs or editor history.

The asset worker derives bounded triangle/quad coverage from the actual native
render plans. Only the standard opaque PBR material contributes coverage. Masked
foliage, transparency, skinning, material overrides and reflected transforms fail
open. Adjacent triangles may share an exact edge; projected concave unions never
contribute coverage. Merging preserves face winding; GPU-culled backfaces cannot
contribute coverage. The largest surfaces are selected within the plan's polygon
limit so small decorative trim cannot displace solid walls.

The pass uses an underfilled 160-by-90 camera depth grid: all four corners of a
cell must lie strictly inside one solid polygon, and its stored depth is the
farthest polygon vertex. A target is skipped only when every cell of its expanded
projected bounds is covered by closer geometry. Doors, windows, silhouettes and
near-plane crossings retain uncertain objects. No building AABB becomes an
occluder. A shadow caster also needs coverage in the sunlight projection, expanded
by ten world units for shadow bias, filtering and sunlight angle; otherwise it is
retained. Point lights in this renderer do not cast shadows.

Each canonical model retains at most 128 coverage polygons; a whole-building
plan retains at most 512. The latter's coverage bytes count toward its existing
allocation budget. Raster and query work share a bounded check count and time
allowance (1.5 ms mobile / 2.5 ms desktop). These are scheduling allowances, not
hard guarantees for JavaScript wall time. Exhausted or missing coverage retains
uncertain objects. Exactly unchanged camera, geometry inventory and copied
transforms may reuse a result. Camera/source/terrain changes invalidate reuse in
that frame. Editor views bypass the pass. `VELDREN_OCCLUSION = false` provides a
runtime comparison switch; diagnostics report actual removed renderables, guarded
casters, reused results and budget limits.

The October 6 correction handles a deadline before candidate collection finishes.
Previously, a scheduler pause before the first candidate could cache an empty
result as complete and leave culling inactive for an unchanged view. Collection
now reports exhaustion and cannot populate the reuse cache. The next frame retries
the same camera and inventory. The regression first failed against the published
source, then passed with this correction.

## Verification

- The independent visibility oracle checks 17,120 rays through 214 culled bounds
  in solid-wall and opening fixtures, with no false culls in those samples.
- Tests cover openings, backface winding, masked/transparent materials, near-plane crossings,
  reflection, zero budgets, in-place transforms, source removal, exact reuse and
  both positive and negative sunlight coverage.
- The real native asset worker transfers bounded coverage buffers. The actual
  Filament WASM NOOP Scene removes two hidden canonical renderables, restores
  both, and releases all GPU/dependency leases on retirement.
- The production renderer's late-frame integration removes one hidden terrain
  renderable behind a real native wall plan. Moving the camera, entering editor
  mode or removing the wall restores it immediately. Existing static-transform
  acceptance still records zero steady transform uploads and terrain samples.
  Its occlusion clock is controlled so host CPU contention cannot determine the
  expected Scene count. A forced deadline restores the object, then an unchanged
  camera retries and removes it once the clock permits work. This fixture checks
  scheduling behavior and Scene integration, not real elapsed performance.
- Building LOD, camera cutaway, editor history, native visibility and terrain
  grounding regressions pass. [verification.json](verification.json) records the
  receipts and built release provenance.

Filament NOOP does not render pixels. These fixtures prove software integration
and measured renderable removal, not town-wide GPU savings or phone FPS. Rendered
visual comparison, physical phone timings and 39-player hosted capacity remain
unverified. Phase three asset delivery work is outside this change.
