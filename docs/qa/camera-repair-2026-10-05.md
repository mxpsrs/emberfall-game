# Camera repair

The supplied phone recording showed the camera collapsing into the character
near the Magic School's walls and covering the view with foreground geometry.
Building collision could reduce the follow distance to 0.35 world units. Short
phone viewports also reduced the distance for the same saved zoom setting.

The camera now scales zoom with viewport height, preserves a usable 3.2-unit
distance around buildings, and eases structural obstruction changes in both
directions. Native buildings use their actual module geometry without a second
navigation-tile collision pass. Terrain retains its hard obstruction limit.
Manual orbit and pitch remain under the player's control; saved yaw zero now
survives reloading.

Foreground building parts, scenery, and cave or city wall chunks receive local
render cutaways. Geometry returns when the view clears. Software, GL, Filament,
and precise picking share that visibility. Residents, enemies, walkable floors,
asset capture, and the detached editor retain their appropriate behavior.
Building bounds and occluder transforms are cached and invalidated after edits.

## Validation

- 27 distinct focused regressions have passing results: the 24-test camera,
  renderer, picking, building, and editor run plus three build/delivery checks.
  Cutaway and creature-cache checks were rerun after the final scenery change.
- The native tour covered 228 walk-in buildings, all twelve Briar Haven plans,
  648 positions, and 10,368 camera poses at 1112×512 and 1920×1080. It exercised
  door approaches, interior walls, stairs, and lofts. No structural pose collapsed
  below the usable follow distance; the tour did not encounter terrain stops.
- The tour's 2,096 hidden module observations and 250,496 visible observations
  confirm that cutaways retain the surrounding architecture. Native world
  serialization and character progress remained unchanged throughout the tour.
- Viewport tests cover heights 240, 390, 512, and 1080. Input, projection,
  terrain picking, authored doorway openings, cache invalidation, renderer
  submission, creature rendering, and editor camera regressions pass.
- All 449 scripts parse; static imports and current documentation links resolve.
- The build succeeds. The delivered Worker is 67,102,593 bytes, below the
  67,108,864-byte hosting limit. Built asset bytes and startup recovery pass.
- SHA-256 comparisons confirm unchanged native world, construction graph,
  shared world catalog, and authored scene files after building. Existing cooked
  terrain cells were reused.

The uploaded recording establishes the reported failure. Automated checks cover
the repaired desktop and mobile camera behavior; authenticated live gameplay
and physical-phone visual acceptance after publication remain unverified.
