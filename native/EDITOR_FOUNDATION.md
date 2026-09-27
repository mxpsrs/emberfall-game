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
