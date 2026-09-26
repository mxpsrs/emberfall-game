# Veldren engine foundation (Phase 1 work in progress)

## Ownership and hierarchy

`veldren::Scene` owns nodes by stable string ID. Controllers, components and
renderers refer to IDs; a Filament or desktop render handle is never a saved
world object. Roots and each parent's child list preserve explicit insertion
order, and depth-first traversal uses that order. A node stores name, parent,
children, local position/quaternion/scale, active flag, metadata and component
fields. World and inverse affine matrices are cached. Changing a local transform
marks only its descendant branch dirty. Queries recompute the dirty ancestor
chain iteratively, including deep hierarchies. Parent activity is inherited.

Reparenting can retain the full world matrix. Rotated nonuniform scale can
produce shear; an optional local affine matrix retains it exactly. Callers
editing local TRS clear the affine override explicitly. `remove` requires either recursive
destruction or promotion of direct children to roots with their world matrices
preserved. Duplication allocates new IDs and copies components and subtree.
Generated IDs have a persisted high-water mark, so deletion followed by reload
does not reuse them.

## Components and lifecycle

Each entity owns a map from stable component type key to version-tolerant JSON
fields. `component_type` lists the current engine capability keys. Components
do not own nodes, render handles, actors or other components. A type index
supports iteration without scanning all entities. Removing a component or
destroying an entity removes it from the index. Gameplay and rendering systems
can then read only the components they need. Local transform is the node's
intrinsic Transform capability and has one implementation, with serialized
`transform` data. `SceneSession` owns only context-specific selection and
camera state; selection clears if its entity is deleted.

The native desktop demonstration migrates the existing C++ actor simulation's
player, villagers and wolves into scene entities with MeshRenderer, Animator,
and representation components. Simulation updates scene transforms, and render
states are synchronized from those transforms. The full procedural browser
world remains behind a compatibility adapter.

## World format and migration

`veldren.world` version 2 contains revision, updatedAt, ordered scenes, and
optional authored terrain. Each `veldren.scene` version 2 contains name,
ordered entities, an optional nextEntityId high-water mark, IDs, parent IDs,
active flags, local transforms, components and metadata. Components may add
optional fields; unknown fields are retained. Asset references are stable
strings such as `briar:lantern`. Account and character saves are separate.
The native JSON codec reads and writes floating-point numbers with the classic
locale and `max_digits10`, keeping serialized scenes locale-independent and
compatible with Emscripten libc++ versions that lack floating-point
`from_chars` and `to_chars`.

For legacy version 1 editor edits, `LegacyWorldEdit.change` keeps the authored
record. `MeshRenderer.asset` is extracted when available. Runtime rendering
converts authored scene transforms to the existing procedural object and
building shape until those generators move to scene-backed entities. Scene
entities with supported MeshRenderer assets also create read-only renderer
proxies from their hierarchy's world transform. The editor can move, rotate,
scale, duplicate, delete and restore scene-authored entities. Transform edits
are converted back to parent-relative local transforms; hierarchy and component
fields are retained on save. Component fields do not yet have an editor panel.
The editor API stores version 2 and exposes a version 1 compatibility view. A
legacy save merges changed records into existing entities while retaining parent
links, other components and metadata. A direct version 2 save can author
hierarchy and components. Production uses the existing `editor_world` row and
revision compare-and-swap; no account or character table is modified. Local
development uses `editor-data/world-scene.json` and the deployable mirror at
`dist/world-scene.json`; old edit files are retained as compatibility mirrors.

To migrate without changing the input:

```sh
make -C native build/scene-migrate
native/build/scene-migrate editor-data/world-edits.json /tmp/veldren-world.json
```

The optional four-argument form selects one named scene. The tool reparses and
round-trips output before writing it. The existing 29 tutorial edits have been
migrated and checked against the browser adapter.

## Editor and runtime contexts

`/editor/viewport.html` has an explicit editor context and separate startup,
frame loop, camera, input, selection and overlays. It generates the world and
loads editor scene data without running character authentication, the player
movement loop, combat, multiplayer presence or character autosave. The normal
`/play` boot path remains the runtime context. The old world generation and
renderer definitions are currently shared. The editor-frame checks confirm
that the editor context skips player authentication, movement, combat, presence
and character autosave while keeping visual frames active. A normal browser boot
is still required to verify this boundary in the complete production bundle.

## Integration debt and verification limits

The browser's procedural `worldScenes` arrays and legacy rendering adapters
are not yet scene-owned in C++ or synchronized as Filament entities from the
new component graph. Only the native desktop representative actor slice is
scene-owned. The WebAssembly build and ABI test pass with Emscripten 3.1.6. The
CMake configure/build and scene-core and desktop-scene tests pass. The
asset-dependent desktop test and headless smoke test cannot run because this
verification workspace is missing the checked-in atlas and other large assets.
The production bundle and normal browser boot also remain unverified because
this workspace contains only a partial repository snapshot, without the full
production scripts and browser assets.

Verified here: native core/scene/desktop-scene tests, the WebAssembly build and
ABI test, the CMake build and asset-independent scene tests, `make -C native -B
desktop`, and the scene-format, runtime-renderer, production-worker persistence,
local persistence, editor-camera, editor-context and editor-frame tests. The
current code is not a completed Phase 1 release foundation until the production
bundle, asset-dependent desktop tests and normal browser runtime have been
rebuilt and verified from the full repository.
