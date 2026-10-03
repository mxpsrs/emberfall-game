# Briar Haven review

The review build preserves the existing engine, native Scene, accounts, quests,
saved editor layer, and accepted building, actor, service, and structural IDs.
The overhaul is saved on `briar-haven-visual-overhaul-wip`. Production remains
unchanged; this package runs a separate local account and database.

## Run the review

Extract `Briar-Haven-Review.zip`, install Node.js 24 or newer, and run `npm start`
inside its `Briar-Haven-Review` folder. Open
`http://127.0.0.1:8787/preview`. The editor is available at
`http://127.0.0.1:8787/editor/` after opening the preview. Required dependencies
are included. `BUILD.json` records the exact source commit, source tree, and
built Worker SHA-256.

## Implemented

- One shared third-person camera pose drives rendering, projection, picking,
  native visibility, terrain obstruction, and building obstruction. The editor
  retains its independent camera.
- Twelve distinct building plans use the native modular assembly path from
  initial startup, including connected extensions and open work bays.
- Buildings have complete floors, roofs, linked doors, walkable stairs,
  supported loft furnishings, and occupancy-aware roof cutaways.
- Roads, civic destinations, a readable square, flower beds, low grass, forge
  activity, and settlement dressing support movement through the village.
- Canonical construction progresses under the existing desktop and mobile
  quotas even when compatibility draws are busy. Culled modules do not request
  render resources. Terrain height reaches modules and visibility bounds
  consistently.
- Renderer teardown removes material-backed character and compatibility draws
  before releasing their material dependencies, fixing an editor reload error.
- Existing generated/editor objects remain bound to their native identities;
  unrelated resource positions and gameplay systems are preserved.

## Evidence

The package includes actual production-Filament screenshots for the main
street, smithy/services, houses, Magic School, an occupied interior, and the
town edge, alongside the earlier saved baseline. These are browser renders,
not concept art. Capture resolution is 1920 × 1080 at device scale 1 and
world hour 11, with matching route coordinates and camera controls.

The earlier baseline captures contain incomplete loading/construction. They
show the earlier state but must not be used as a settled before/after frame
rate comparison. Final captures wait for resource loading and visible
construction to finish, then record 120 frames. Raw receipts accompany the
images.

| Check | Evidence |
| --- | --- |
| Twelve plans, accepted IDs, floors, doors, cutaways, loft furnishings, stairs, service access, serialization | `tests/briar-haven-overhaul.cjs` |
| Projection/picking, orbit, obstruction, camera recovery, editor separation | Camera regression suites |
| Canonical construction fairness, static reuse, module culling, terrain transforms, material-backed teardown | `tests/filament-static-transforms.cjs` and construction regressions |
| Actual pointer orbit/pitch/zoom, click-to-walk, rendered door picking, physical entry/exit, occupied cutaway, restored roof | `gameplay/result.json` |
| Inspector edits, undo/redo, hierarchy, native prefabs, grouped building edits, verified save and reload, gameplay isolation | `editor-result.json` |
| Scene geometry/catalog/identity preservation and exact save/unload/load | Native building and scene regressions |
| Native geometry, PBR materials, allocation/cancellation, repeated unload, desktop/mobile policy | Asset and Filament regression suites |
| Authentication, independent saves, movement/combat synchronization, editor access/revision/CAS | Built-Worker account, multiplayer, and editor checks |

## Performance and limits

This environment uses Chromium with a SwiftShader software GPU. Its timings
measure this environment, including software graphics submission. They do not
certify the requested 60 FPS desktop or 30 FPS physical-phone targets. The
Ryzen 5 1400 / RTX 2060 / 16 GB desktop, iPhone 15 Pro Max, and Galaxy S24 were
not available for direct measurement. GPU allocation figures are estimates,
not driver VRAM readings; the software GPU timer is not a hardware benchmark.

The broader prop-placement suite retains six failures for civic banker
counters already present in the accepted baseline. Briar Haven's furnishing
and service checks pass. Native C++ checks and the supplied actual-WASM tests
run here; rebuilding WASM requires `em++`, which is unavailable here.

No main-branch merge or production deployment is part of this review.
