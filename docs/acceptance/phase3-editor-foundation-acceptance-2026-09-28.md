# Phase 3 mature editor foundation acceptance — 28 September 2026

Status: **COMPLETE**. This is the formal closeout of the completed Phase 3
implementation. It preserves the accepted Phase 1 Scene/component architecture
and Phase 2 asset/rendering pipeline; it adds no Phase 4 work.

- Repository: `mxpsrs/emberfall-game`.
- Branch: `phase3-editor-foundation-wip`.
- Accepted Phase 2 base: `9e72e514610f6e8de01ae782e406e10fc5a8443a`.
- Starting remote HEAD, independently checked before changes:
  `550c443e116a471dbd64cef22cd0f329114bb279` —
  `Complete Phase 3 editor foundation local acceptance`.
- Focused panel-regression repair checkpoint:
  `133d771a65a0691984e1757a57273db898ff52bf`.
- Final formal commit message: `Complete Phase 3 mature editor foundation`.
- Completion date: **2026-09-28**.

The technical record remains in [docs/acceptance/native-phase3-acceptance.md](native-phase3-acceptance.md).
The chronological implementation record is [docs/architecture/editor-foundation.md](../architecture/editor-foundation.md).
Historical pending-gate statements there are superseded by this acceptance.

## Accepted implementation

| Area | Completed behavior |
| --- | --- |
| Command architecture | C++ `EditorHistory` mutates the canonical `Scene` and `WorldDocument` directly. Stable entity IDs, graph/component indexes, affine transforms and serialization remain native. Browser code supplies editor UI/input and derived projections. There is no second editable world or save store. |
| Undo/redo | Begin/execute/commit/cancel groups continuous gestures into one transaction. Mixed entity, prefab, building and terrain edits retain ordered history, exact undo/redo, rollback, dirty-state tracking and saved boundaries. |
| 3D gizmo | X/Y/Z and plane translation, three rotation rings, axis scale and uniform scale use the actual viewport camera and a bounded Filament overlay owner. |
| Transform settings | World/local modes, object/selection-center pivots, translation/angle/scale snapping, selected-root grouping and full affine preservation are integrated. |
| Selection and picking | Canonical ray picking, overlap cycling, additive selection, selection bounds, inherited hide/lock and an incrementally maintained BVH operate on native entities. |
| Hierarchy | Native graph expansion, filtering, rename and command-based reparenting preserve world transforms and stable identity. |
| Inspector | Native component fields, local transforms, references and prefab actions use validated commands. Locked branches reject mutation. |
| Prefabs | Scene-scoped definitions and linked instances retain internal links, placement, independent overrides, versioned updates, intentional additions/deletions, revert and unpack. Changes undo as native transactions and persist in WorldDocument. |
| Modular buildings | Building Edit converts generated buildings into canonical module entities. Placement, snapping, part transforms, linked wall/door openings, duplication/deletion and undo share native command history. |
| Canonical asset browser | Existing Phase 2 catalog identity, provenance, model/material/texture resource owners and imported previews are reused. Canonical model placement and prefab catalog entries author native MeshRenderer entities. Preview objects remain transient. |
| Terrain | A completed brush stroke creates one native command in the existing WorldDocument terrain field. Terrain and entity edits share history; rejected commits restore the preview; undo/redo restores exact terrain and saved-state boundaries. |
| Editor separation | Independent editor startup, input, camera, scene selection and frame loop preserve character state and omit gameplay simulation, player presence and character autosave/controller requests. |
| Save/reload | Save blocks concurrent authoring while the existing endpoint persists and rereads the document. Exact content verification precedes the saved marker. Revision conflicts, legacy compatibility and account/character isolation remain intact; fresh load restores the native document and clears session history. |
| Read-only rendering | Building rendering leaves authored height fields unchanged. Canonical understory construction occurs before drawing, preserves existing edits, pauses during gestures/save verification and creates no user history. Drawing does not mutate the native Scene. |

The former camera-anchor, building render-write, understory render-write and
terrain reload blockers remain resolved. A final populated browser rerun exposed
a separate DOM refresh error: removing a focused Inspector field synchronously
committed it and re-entered `replaceChildren`. A focused Chromium regression
reproduced the same exception before the repair. Panel refreshes now finish the
current DOM replacement before servicing a nested refresh request. The regression
checks both Inspector and hierarchy fields, current values, exactly one commit
per edit and zero page errors. This small UI repair changes no native command,
Scene, asset, camera, renderer or persistence architecture.

## Final verification

All 23 final verification invocations below passed. The native
and editor suite contains 12 checks; the remaining commands verify the full build,
delivery, persistence, geometry, real DOM focus handling and graphical workflows.
Exact exit codes, durations where recorded and output are retained in
[closeout-results.json](../qa/phase3-editor-foundation/closeout-results.json).

```sh
make -C native editor-test test wasm-test
node tests/editor/editor-commands.mjs
node tests/editor/editor-prefabs.mjs
node tests/editor/editor-building-history.cjs
node tests/editor/editor-terrain-history.mjs
node tests/editor/editor-selection.mjs
node tests/world/building-assembly.cjs
node tests/world/world-buildings-scene.cjs
node tests/editor/editor-camera.cjs
node tests/editor/editor-context.cjs
node tests/editor/editor-frame.cjs
node tests/editor/editor-scenery-streaming.cjs
npm run build
node tests/rendering/built-assets.mjs
node tests/editor/editor-production.mjs
node tests/editor/editor-local-persistence.mjs
node tests/editor/editor-geometry.mjs
node tests/browser/editor-panels-browser.mjs
node scripts/qa/phase3-gizmo-browser.mjs
node scripts/qa/phase3-authoring-browser.mjs
VELDREN_BROWSER_STAGE=terrain node scripts/qa/phase3-terrain-play-browser.mjs
VELDREN_BROWSER_STAGE=reload node scripts/qa/phase3-terrain-play-browser.mjs
VELDREN_BROWSER_STAGE=play node scripts/qa/phase3-terrain-play-browser.mjs
```

A fresh `make -B -C native wasm` also passed after compiler-path recovery. The
final `make -C native editor-test test wasm-test` then passed on that exact binary.
`EMXX` selected the restored Emscripten 3.1.6 toolchain. For browser reproduction,
set `VELDREN_PLAYWRIGHT` to the installed Playwright entry point and select the
installed Chromium binary (`VELDREN_CHROMIUM` where supported). The three terrain
stages use the same `VELDREN_BROWSER_RESTORE` disposable fixture and generated
terrain checkpoint. None of these environment settings changes the assertions.

The final Worker is **66,511,949 bytes** with **470
assets**, below 64 MiB. The built-asset check verifies all **124 startup resources**,
JavaScript/JSON parsing, cache URLs, exact canonical response bytes and licensed
audio/ranges. The full native generated-world fixture retains original ownership
and geometry and leaves Scene revision unchanged during rendering, then restores
the complete serialized document exactly after unload/load.

The normal build verifies original texture hashes and all 102 cached profile
outputs, exports the accepted registry/shared catalogs and bundles the Worker.
It does not bypass asset generation steps or raise the 64 MiB limit. Missing
local source textures were restored only after exact committed Git blob and
content-hash comparison. The native WASM rebuild reproduces the committed binary
byte-for-byte; no engine source or binary change is part of this closeout.

The recovered environment initially had compiler executable/path issues. Those
were corrected in temporary environment wrappers outside the repository, then
the required native checks were rerun. This is environment recovery, not a
product regression or an omitted failing gate.

## Graphical and persistence acceptance

| Gate | Final result |
| --- | --- |
| 3D handles | Move, rotate and scale visibly render through WebGL; zero page errors; overlay teardown succeeds. |
| Populated authoring | 656 entities in the initial tutorial Scene; hierarchy, Inspector, exact undo/redo, reparenting, native prefab actions and grouped Firstlight Smithy editing pass. |
| Authoring save/reload | Verified save at disposable revision 9; fresh editor reload restores the edited wall exactly and retains prefab instance/definition metadata. |
| Populated overworld | Rendered screenshot inspected; finite Filament camera eye/center follows detached navigation and ground picking returns valid land. Character state and navigation history stay unchanged. |
| Terrain input/history | Real pointer stroke changes terrain; native undo restores the exact previous terrain and clean saved boundary; redo restores the exact stroke. |
| Terrain save/reload | Verified save at disposable revision 10, with 29 height nodes; separate fresh editor/backend load restores the exact terrain. |
| Editor isolation | No character/player/social/activity controller requests during either editor workflow. |
| Authenticated `/play` | Starts successfully in tutorial, native ABI 19; loads the same saved terrain exactly and retains object/quarry/service native ownership. |
| World input/connection | Real canvas click completes; the connection remains alive; gameplay screenshot inspected. |
| Browser errors | Zero page errors in the final focused, authoring, terrain, reload and play runs. |

The failed pre-repair authoring run is not counted as a pass. The focused DOM
test reproduces the failure before the repair, and the final populated rerun
passes after it. Screenshots are generated under ignored `.qa/phase3/` and
`.qa/phase3-gizmo/`; the structured receipt above contains no production data.

All browser checks use Chromium 134 headless shell with SwiftShader and a local
built Worker. The populated editor/play viewport is 1440×900; the isolated gizmo
fixture is 800×600. The existing workflows use Playwright 1.62.1 through an external entry point
selecting the installed Chromium binary. Native compilation uses GCC 13.3 and
Emscripten 3.1.6; JavaScript tests use Node 24.19.0. The temporary launcher only selects the installed browser; it changes no
acceptance assertions or application behavior. The account, sessions and SQLite
database are disposable; production services and data are never contacted.

## Native editing performance

These measurements are retained from the completed Phase 3 performance run on
the unchanged implementation, not presented as a new benchmark or hardware FPS.
The actual-WASM fixture contains 259 scenes and 20,856 entities, including 15,496
overworld entities.

| Operation | Median | 95th percentile |
| --- | ---: | ---: |
| Native transform command | 0.030 ms | 0.076 ms |
| Cached ray picking | 0.403 ms | 0.740 ms |
| Picking after a transform | 0.539 ms | 0.643 ms |

One 100-update transform gesture produces one undo record and exactly restores
its initial transform. Cold document load measured 8.47 s, cold hierarchy read
0.95 s and initial picking-index creation 1.30 s. Reproduce the native measurement
with `node scripts/qa/phase3-native-performance.mjs <exported-world.json>`.

## Known limitations

- History is session-only and limited to 256 transactions per Scene; reload
  clears it. Saved document content persists independently.
- Prefab definitions are scene-scoped. Nested linked instances must be unpacked
  before capture. Placement previews display imported-model members;
  procedural/captured members appear after placement. Customized children removed
  from a template remain loose instance children.
- Cold Scene/hierarchy/index costs remain as measured above. The results are
  local functional/CPU evidence, not hardware-rendered FPS, DOM-latency guarantees,
  Safari/iPhone/Android/device acceptance or sustained hosted-capacity evidence.
- The authenticated `/play` result is startup, saved-terrain/native-ownership,
  world-input and connection smoke coverage. It does not measure movement distance,
  certify every gameplay interaction or establish 39-player hosting capacity.
- The underlying engine mechanism behind the former divergent lexical camera
  binding remains unconfirmed. Finite shared anchors and correct camera/picking
  behavior are verified; no speculative root-cause claim is made.
- Earlier game-wide balance discrepancies and unrelated historical tests are
  outside this scoped editor closeout. No gameplay formula was changed to satisfy
  an editor test.

## Delivery and scope

This closeout changes formal acceptance records, their verification evidence,
and the narrowly reproduced panel-refresh regression with its focused test. The final commit preserves the verified remote parent and all
other repository blobs. The branch is updated on GitHub and its remote HEAD and
required documents are independently checked after the update; a local commit
alone is not treated as delivery.

**Nothing was deployed or published. Nothing was merged into `main`. Phase 4 was
not started. No production accounts, player saves or production worlds were
modified.**
