# Mainland navigation and editor recovery, 2026-10-04

The player report concerns mainland buildings after leaving the tutorial.
The affected landmark and original editor loading error code are unknown.

Navigation previously used the range of a tile's four corner heights as its
slope. A diagonal hillside with grade 1.1 therefore exceeded the 1.2 cutoff,
while the same hillside aligned with an axis remained walkable. Navigation now
measures the maximum gradient of the two triangles used by `landHeight`.
The existing steep-ground cutoff and bridge/quarry exceptions remain in use.

The editor previously scheduled its next frame only after preparation and
rendering completed. An exception could permanently stop its canvas. The frame
now reports the failed phase and always schedules the next frame. Project reads
retry temporary HTTP and network failures at most three times, with 250/500 ms
delays; authentication and missing-resource responses do not retry. Project
writes and account permissions are unchanged.

## Verification

- `tests/terrain-slope.cjs` exercises equal grades at five headings, actual C++
  WASM routes across those slopes, steep/creased ground and bridge/quarry rules.
- `tests/terrain-travel.cjs` and `tests/terrain-editor.cjs` cover bridge/deck
  picking, continuous banks, room floors, terrain changes and navigation edits.
- `tests/editor-frame.cjs` verifies recovery from preparation and draw errors,
  and preserves the editor's separation from player simulation and saving.
- `tests/editor-project-recovery.cjs` checks temporary HTTP/network recovery,
  bounded exhaustion, and immediate authentication/missing-resource failures.
- `tests/editor-context.cjs` and `tests/editor-native-startup.cjs` verify editor
  context and complete native startup with 259 canonical scenes.
- A complete Briar Haven editor probe with real C++ WASM, Filament NOOP and
  production terrain/model workers scheduled all 40 frames plus its initial
  frame after injected preparation and draw errors. Both failures were
  reported at the correct phase; no other runtime or terrain errors occurred.
  The terrain source matched its bake, residency stayed within budget, and
  night selected twelve point lights plus the sun. At completion, 250 terrain
  chunks and 36 model loads were still pending; this checks recovery during
  loading, not completed scenery or GPU appearance.
- `npm run build` and `node tests/built-assets.mjs` pass. The Worker is
  67,080,869 bytes, within the 64 MiB hosting limit. Inline sources and versioned
  asset responses match the production build.

## Mainland burial remains unconfirmed

Native checks sampled 228 mainland building footprints and compared the cooked
terrain mesh with the authoritative terrain surface. The largest sampled
terrain intrusion was approximately 0.012 units. Captured Briar Haven bank and
kitchen floor draw matrices put their floors approximately 0.045 units above
the terrain. The existing saved world was not edited to move any buildings.
These checks do not reproduce or explain the player's camera-dependent report;
an affected mainland landmark or in-game screenshot is still needed.

The checks execute C++ WASM and, where applicable, the native Filament NOOP
backend. They do not rasterize GPU pixels, certify PC/phone frame rates or prove
hosted capacity for 39 simultaneous playtesters.

This compatible client update preserves server logic, shared catalog, accounts,
characters, the saved world and hosting configuration. Publish with the game
open, following the owner's current maintenance scope in `AGENTS.md`.
