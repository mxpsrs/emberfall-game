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
