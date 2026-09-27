# Phase 3 editor foundation

In progress on `phase3-editor-foundation-wip`, created and independently verified
on GitHub at accepted Phase 2 commit
`9e72e514610f6e8de01ae782e406e10fc5a8443a` before implementation.

## Native command checkpoint

`EditorHistory` mutates the accepted `Scene` directly. It retains before/after
node deltas, sibling/root order and stable created IDs. There is no editable
shadow world. Commands support local/world transforms, create, delete subtree,
duplicate subtree, rename, reparent with world preservation, activation,
component addition/removal/fields and model/material references. The browser
resolves references through the existing native Phase 2 registry.

Begin/execute/commit/cancel groups continuous gestures; 300 native transform
updates create one undo record. Undo/redo restores components and their indexes,
hierarchy, exact affine transforms and deleted subtrees. Failed transactions
roll back. Saved-state tokens track dirty state across undo/redo and branching.
History is limited to 256 transactions per Scene and is session-only; persistent
results remain in the existing canonical WorldDocument. Document load clears
history, while verified Save retains it.

The existing editor's canonical transform, duplicate/delete and primary history
controls dispatch these commands. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z work both in the
editor shell and viewport, excluding text fields. Renderer projections receive
batched native mutation notifications; drag updates use transform invalidation.

Verified: `make -C native editor-test test wasm-test`, actual-WASM
`tests/editor-commands.mjs`, native runtime/editor tests, editor context/camera/
frame tests, and the Phase 2 registry test in runtime/editor contexts.

This checkpoint is not Phase 3 acceptance. The legacy building/terrain workflows
have not yet been integrated with the command foundation. Proper 3D gizmos,
canonical picking/multi-selection, hierarchy/inspector, prefabs, modular building
authoring and full populated-world graphical/persistence acceptance remain.
No deployment, main merge, production data writes or Phase 4 work is included.

## 3D transform checkpoint

Original ray/axis/plane math drives X/Y/Z translation, XY/XZ/YZ planes,
three rotation rings, axis scale and uniform scale. Local orientation removes
inherited stretch from handle axes; commands preserve the full affine matrix.
World/local, object/selection-center pivots and translation/angle/scale snapping
are explicit editor settings. A gesture snapshots only selected root matrices
and commits one command, including multi-selection.

Handles and selection bounds use a bounded Filament vertex buffer, an unlit
editor material, the real viewport camera and a separately submitted overlay
view. The owner releases its resources on unload. Existing terrain-relative
entities use the same grounding offset as the accepted renderer; persistent
transforms remain canonical. Select mode no longer starts an implicit 2D drag.

Canonical ray picking, overlap cycling, additive selection and inherited
editor-only hide/lock state are connected. A cached BVH handles ray queries.
The hierarchy now reads the Scene graph, supports expansion/filtering/rename
and command-based reparenting; the general inspector edits native components.
These newer panels still require the broader category acceptance workflows.

Authored canonical MeshRenderer draws reuse Phase 2 model/material/texture
resource owners in both contexts. Asset edits choose that render path; model
material overrides and shadow flags have managed resource ownership.

Verified focused tests include native command/controller affine cases, geometry
math, selection/filtering, model/material/lifecycle regressions and editor camera/
context/frame regressions. A Chromium WebGL test shows all three 3D handle modes
with zero page errors. The built populated Firstlight Isle editor test performs
a real pointer drag, confirms one history entry and exact undo/redo, and keeps
the player-independent editor context. Full Phase 3 graphical acceptance, prefab
and building workflows, persistence and /play acceptance are still outstanding.

Remote command checkpoint: `b565855ff658d674448bd616255a9854f78a9111`.

## Selection validation checkpoint

Editor-only hiding now reaches legacy world objects, buildings, native modular
pieces, bridges, structural walls/rooms, scenery and light emitters without
changing canonical active state. Locked branches reject hierarchy/Inspector
mutation and cannot be selected. Native component validation rejects malformed
vectors, non-boolean flags, empty mesh references and unsupported light types.
Duplicated subtrees now remap internal component references and receive unique
catalog/generation identities; source entities remain unchanged.

Shortcuts: W/E/R choose Move/Rotate/Scale outside Camera mode. C toggles Camera
mode, where WASD moves and Q/E zooms. Shift+WASD navigates quickly in every tool;
arrows rotate/tilt. F focuses, Delete/Backspace deletes, Ctrl/Cmd+D duplicates,
Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redoes. Escape cancels the
current gesture and returns to Select. Text fields retain normal editing keys.

Remote 3D gizmo checkpoint: `a86290a21cd6c25c38e2d76fb4b570f08a39b68e`.

## Prefab and modular command integration checkpoint (2026-09-27)

Building projection writes now dispatch native `replace`, transform and delete
commands after editor startup. Building Edit conversion, creation, part changes,
duplicate/delete and placement are grouped in the same history as the general
Inspector and 3D tools. The old separate building history is removed. Selecting
a module selects its canonical entity; dragging uses the 3D handles. Linked
openings inherit their host wall transform. Save rejects unfinished gestures and
blocks edits until the persisted document has been reread and verified.

Native prefab definitions are versioned `PrefabDefinition` components on inactive
Scene roots. Each `PrefabInstance` stores the definition reference, stable node
mapping and inherited base. Templates are immutable snapshots, not another
editable world. Native create/instantiate/update/revert/unpack commands retain
internal links, preserve instance placement and field overrides, propagate new
children and retain intentional local deletions. Updates undo as one transaction.
Removed customized branches remain loose instance children; unchanged removed
leaves are deleted. Nested linked instances must be unpacked first. Definitions
and instance state persist in the existing WorldDocument with no new save store.

The Inspector exposes prefab actions and the asset catalog lists definitions.
Imported models can be placed through canonical MeshRenderer commands. Imported
placement previews share Phase 2 Filament resources and are never saved as
entities. Prefab previews use their imported model members.

Focused actual-WASM tests cover prefab internal links, independent overrides,
update/undo/redo, added/deleted children, revert, unpack and serialization. The
building fixture checks that multiple native projection writes form one exact
undo/redo transaction. General command, camera, context and frame checks pass.
The populated-world graphical workflow and final Phase 3 acceptance remain
pending at this checkpoint. Nothing is deployed or merged into main.

## Authoring and terrain checkpoint

The populated built editor has passed hierarchy selection, Inspector name and
transform edits, exact undo/redo, world-preserving reparenting, prefab actions,
conversion/editing of Firstlight Smithy, grouped building undo/redo, verified
WorldDocument save, and exact reload. No gameplay-controller requests or browser
page errors occurred. This exercise found and fixed validation of linked interior
entities during building conversion and stale building context after rollback.
Prefab instances now preserve authored root scale/rotation when placed; deleting
a referenced definition is rejected. Added children and removed branches have
actual-WASM coverage.

Terrain now commits one native command per finished brush stroke in the existing
WorldDocument terrain field. Terrain, Inspector and building operations share
ordered history and saved-state tracking. The browser heightfield is a render/
brush projection; a rejected commit restores the preview. Native validation
checks coordinates, height limits, duplicate cells, materials and size limits.
Rollback and undo/redo restore both document terrain and its projection. The
standalone terrain brush fixture retains local history for testing outside the
editor; the production editor always installs the canonical command owner.

An editor scene selector changes the rendered scene and camera focus without
changing character state. Scene histories remain separate; document dirty state
aggregates across scenes. Save retains history and blocks concurrent writes until
the reread matches. A final graphical terrain/scene-selection and /play regression
is pending at this checkpoint. The work remains on the Phase 3 branch only.

Run focused checks with `node tests/editor-commands.mjs`,
`node tests/editor-prefabs.mjs`, `node tests/editor-building-history.cjs`, and
`node tests/editor-terrain-history.mjs`. `scripts/phase3-authoring-browser.mjs`
checks populated authoring and save/reload; `scripts/phase3-terrain-play-browser.mjs`
checks scene selection, a real terrain pointer stroke, the saved-state boundary,
terrain reload and /play against a disposable local Worker/account/database.
Set VELDREN_PLAYWRIGHT to a local Playwright entry point if it is not installed
in this checkout. These scripts do not write production data.

## Incremental picking checkpoint

On a 20,856-entity saved document (15,496 overworld entities), editing previously
invalidated all picking bounds and non-transform edits reread the entire Scene.
Selection now patches affected canonical records, updates descendant bounds when
a parent transform/activation changes, and refits existing BVH branches. Creation,
removal, reparenting, undo/redo, hide/lock and scene/load changes have actual-WASM
coverage. Asset registry reload still performs a full bounds refresh.

The native microbenchmark measured post-transform picking at 0.54 ms median and
0.64 ms p95. Cold document/index costs and the scope of these measurements are
recorded in `PHASE3_ACCEPTANCE.md`. These are not rendering FPS or hosted-capacity
claims. Toolbar/viewport undo also finishes an active terrain stroke before
reversing it, so a transient brush cannot survive a history change.
