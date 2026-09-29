# Phase 3 acceptance record

Updated: 2026-09-28. Branch: `phase3-editor-foundation-wip` in
`mxpsrs/emberfall-game`. Accepted Phase 2 base:
`9e72e514610f6e8de01ae782e406e10fc5a8443a`.

Status: **COMPLETE — final Phase 3 acceptance**. Populated
overworld rendering, camera navigation/picking, terrain pointer input, shared
undo/redo, verified save, exact fresh reload and the authenticated
`/play` regression pass with zero browser page errors. No deployment or main
merge is included. Hardware frame-rate and hosted-capacity limits remain below.

Formal closeout and the final verification results are recorded in
[PHASE3-EDITOR-FOUNDATION-ACCEPTANCE-2026-09-28.md](../docs/PHASE3-EDITOR-FOUNDATION-ACCEPTANCE-2026-09-28.md).
This document retains the implementation evidence and technical limits. Earlier
local checkpoints are superseded by formal acceptance. Phase 4 was not started.

## Ownership and behavior

C++ Scene and WorldDocument remain authoritative. The Phase 2 registry, imported
assets and Filament resource owners remain the render path. Browser code handles
editor input, panels and derived views; command history and prefab mutation run
in C++. There is no new editable world representation or persistence store.

The editor supports grouped native undo/redo; 3D translate, rotate and scale;
world/local axes, object/selection-center pivots and snapping; canonical picking,
additive selection, hierarchy filtering/reparenting and component inspection;
scene-scoped prefab creation/instances/overrides/update/revert/unpack; modular
building conversion, placement and part editing; asset placement; independent
camera/scene selection; and verified save with dirty-state tracking. Terrain
strokes use the same native command history as entity edits in their Scene.

History is session-only, limited to 256 transactions per Scene. Saved content
uses the existing WorldDocument route. Saving blocks authoring while the server
result and reread are compared; loading a document clears history. Dirty state
aggregates across scenes, and undo can return to the saved boundary.

## Implementation acceptance evidence (retained)

The evidence below records the completed implementation run. The final formal
rerun is summarized at the end and in the linked formal acceptance document;
its disposable revision and terrain-node counts differ from this earlier fixture.

| Area | Verification |
| --- | --- |
| Native history | Desktop editor tests and actual-WASM mixed commands, affine transforms, rollback, grouped gestures, asset validation and save boundary |
| Prefabs | Actual-WASM creation, authored root pose, internal links, independent overrides, updates, additions/removals, revert, unpack and exact round-trip |
| Building editing | Actual generated house assembly, snapping and openings; native linked interior parts; grouped module/door edits, duplicate/delete and exact undo/reload |
| Terrain | Actual-WASM shared entity/terrain ordering, native validation, no-op behavior, transaction rollback, rejected preview rollback and persistence |
| Picking and hierarchy | Actual-WASM incremental subtree updates, parent transforms, active state, inherited hide/lock, reparent/delete undo and scene/load invalidation |
| Graphics | Chromium WebGL renders all three handle modes and the populated tutorial/overworld; detached camera alignment, ground picking and a real terrain stroke pass; screenshots visually checked |
| Populated authoring | Hierarchy click, Inspector rename/position, undo/redo, reparent, prefab actions, Firstlight Smithy editing, verified save and exact fresh reload; no page errors or gameplay-controller requests |
| Gameplay regression | Authenticated `/play` starts in the disposable character’s tutorial scene, reads all 40 saved overworld height nodes exactly, retains native object/quarry/service ownership, accepts world input and remains connected with zero page errors |
| Persistence routes | Atomic v2 save, legacy preservation, concurrent save conflict, validation and account/character preservation in disposable local tests |
| Generated world | Building/road/light/structure/spawn/resource/bridge/quarry/service Scene ownership, unchanged Scene revision while rendering multiple building variants and the full overworld traversal after scenery preparation, and complete native round-trip |
| Build and assets | Fresh build; all 124 startup resources; JavaScript/JSON parsing, licensed asset records, byte-preserving delivery and runtime/editor ABI checks |

The populated authoring script saved revision 9 and reloaded both prefab metadata
and the edited wall exactly. It operates on a disposable local Worker, account
and SQLite database; no production account or world is changed.

The overworld browser check identified render-time height writes entering native
command history and repeatedly refreshing the Scene. All generated-building
render paths now leave authored height components unchanged, and the editor
rejects writes during drawing. The generated-world regression covers this
behavior. The graphical rerun now completes scene selection without changing
character state or creating history entries. The camera and scenery corrections
below complete the visible-ground and real terrain gesture checks.

## Camera and scenery corrections

The original camera function read non-finite `px`/`py` values in its Script scope
while the editor read `(42, 51)`. Direct terrain samples and a freshly evaluated
copy of the camera function were finite. Shared window-backed anchor bindings
restore consistent camera reads in Chromium without changing surface or camera
math. The underlying engine mechanism behind the former lexical-binding
divergence is unconfirmed. The fresh browser check now verifies finite Filament
eye/center coordinates, alignment while the detached camera moves, valid ground
picking, unchanged character state and zero navigation history entries.

With the camera working, a render guard caught lazy understory generation
inserting a canonical GeneratedChunk during drawing. Visible chunks are now
prepared before rendering. Append-only native construction preserves existing
entities, rejects active editor transactions and rolls back failed insertion.
It creates no user history. Editor preparation pauses during gestures and Save
verification; rendering only reads existing chunks. Gameplay uses the same
preparation step. These changes preserve the Phase 1 canonical ownership model.

The real pointer terrain test passes native undo/redo and the saved dirty-state
boundary, then saves 40 height nodes at revision 11 with a verified reread and
zero page errors. Its screenshot shows the populated overworld and brush. Browser
checks support resumable terrain, reload and play stages using the same
disposable fixture. The fresh editor reload restores the revision-11 terrain
exactly, with zero page errors and no character/player/social/activity requests.
The authenticated `/play` run also loads that exact terrain document, starts
without failure at native ABI 19, retains canonical object/quarry/service
ownership and remains connected after a real world-canvas click. Its screenshot
shows the tutorial character and populated world; it was visually inspected.
This is a load/input smoke check, not a measured movement-distance or FPS test.

The full generated-world regression passes unchanged Scene revision across
multiple building variants and an entire overworld draw after scenery preparation,
followed by exact serialization/unload/load. The actual-WASM scenery test passes
history isolation, preservation of existing edits, active-gesture rejection and
failed-construction rollback. Camera/context/frame, terrain history, selection
and all 124 built startup resources also pass.

Implementation checkpoint `1a6d075fc2b84c89cc8c682ef4c5105b9e8f437c` was
independently verified on the Phase 3 branch, including every file in its tree.
That implementation checkpoint used verified committed asset derivatives. During
formal closeout, all missing original canonical textures were restored with exact
hash matches and the normal `npm run build` passed without skipping generators.
It verified all 102 cached profile outputs (zero needed regeneration), produced
470 assets in a 66,511,949-byte Worker below the 64 MiB limit, and passed the
built-asset audit for all 124 startup resources. A fresh native WASM rebuild also
matched the committed binary byte-for-byte. The formal rerun also exposed a focused-field DOM refresh error in the editor
panels. `panels.js` now guards reentrant replacement and services a pending
refresh after the current replacement finishes. `tests/editor-panels-browser.mjs`
reproduces the original exception and verifies exactly-once Inspector/hierarchy
commits, current values and zero page errors after the repair. No native engine,
renderer, camera or asset-pipeline implementation changed.

## Native editing performance

The fixture is the saved populated WorldDocument: 259 scenes and 20,856 entities,
with 15,496 in the overworld. Measured with the actual WASM bridge in Node:

| Operation | Median | 95th percentile |
| --- | ---: | ---: |
| Transform command | 0.030 ms | 0.076 ms |
| Cached ray picking | 0.403 ms | 0.740 ms |
| Picking after a transform | 0.539 ms | 0.643 ms |

The 100-update transform gesture produces one undo record and restores its exact
starting transform. Cold document load measured 8.47 s, cold hierarchy read
0.95 s, and initial picking index creation 1.30 s. These are local measurements,
not rendering FPS, DOM latency, hardware-independent promises, or hosted capacity
certification. Incremental edits update affected entity records and refit their
BVH branches; they do not reread the full Scene or all model bounds.

## Practical limits

Prefab definitions are currently scene-scoped. Nested linked prefab instances
must be unpacked before capture. Prefab placement previews show imported-model
members; procedural/captured members appear after placement. Customized children
removed from a template remain loose children in the instance. History is not
persisted across reload. The browser still pays the documented cold scene/index
cost; hardware-rendered interactive frame-rate acceptance is separate from the
software-rendered browser checks here.

## Reproduction

- `make -C native editor-test test wasm-test` (requires C++20 and Emscripten).
- `node tests/editor-commands.mjs`, `node tests/editor-prefabs.mjs`,
  `node tests/editor-building-history.cjs`, `node tests/editor-terrain-history.mjs`,
  and `node tests/editor-selection.mjs`.
- `node tests/building-assembly.cjs`, `node tests/world-buildings-scene.cjs`,
  `node tests/editor-camera.cjs`, `node tests/editor-context.cjs`,
  `node tests/editor-frame.cjs`, and `node tests/editor-scenery-streaming.cjs`.
- `npm run build`, then `node tests/built-assets.mjs`,
  `node tests/editor-production.mjs`, and `node tests/editor-local-persistence.mjs`.
- `scripts/phase3-authoring-browser.mjs` and
  `scripts/phase3-terrain-play-browser.mjs`; set `VELDREN_PLAYWRIGHT` to a local
  Playwright entry point if needed, and `VELDREN_CHROMIUM` for an explicit browser
  binary. `VELDREN_BROWSER_STAGE=terrain|reload|play` runs resumable stages; use
  the same `VELDREN_BROWSER_RESTORE` fixture and generated terrain checkpoint. Output goes to `.qa/phase3/`.
- `node scripts/phase3-native-performance.mjs <exported-world.json>` for the
  native microbenchmark. It leaves the input unchanged.


## Final formal verification — 2026-09-28

The complete required native/editor suite, normal build, built-asset and
production/local persistence checks passed again during formal closeout. The
focused panel-refresh regression, 3D gizmo WebGL check, populated authoring and
terrain/reload/play workflows also passed. All final browser page-error lists
are empty. The final authoring save/reload passed at revision 9;
the final terrain save, fresh reload and authenticated play passed at revision
10 with 29 exact height nodes. The formal acceptance document and its structured receipt contain
the exact command list, current disposable revision numbers and limitations.
The earlier revision-9/revision-11 results above remain historical evidence from
implementation acceptance, not the final rerun's fixture identifiers.

The only implementation change during formal closeout is the reproduced
Inspector/hierarchy DOM refresh repair. The accepted native Scene, command,
asset/rendering, terrain, camera and persistence systems remain unchanged.
Nothing was deployed or merged into main, and Phase 4 was not started.
