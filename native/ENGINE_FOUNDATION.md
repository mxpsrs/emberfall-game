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
states are synchronized from those transforms. Generated static props now migrate into the native Scene with focused
components. Their JavaScript views read immutable native snapshots, and every
persistent write goes through a native Scene operation. Other categories still
use temporary editor-only RuntimeBinding mirrors; those mirrors do not migrate
runtime ownership and cannot be counted as completion.

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
record. `MeshRenderer.asset` is extracted when available. Runtime binding
entities give generated objects and buildings stable IDs and route editor
transforms through the graph while the legacy arrays remain the gameplay
projection. Unchanged generated entities are transient and are stripped before
serialization; only authored scene entities and sparse world edits are saved.
Scene entities with supported MeshRenderer assets also create read-only
renderer proxies from their hierarchy's world transform. The editor can move,
rotate, scale, duplicate, delete and restore scene-authored entities. Transform
edits are converted back to parent-relative local transforms; hierarchy and
component fields are retained on save. Component fields do not yet have an
editor panel.
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
is still required to verify this boundary in a graphical browser.

## Procedural world ownership audit

The audit below covers the browser runtime and its generated scene data, not
just the C++ actor demo. It was checked against the active scripts loaded by
`dist/index.html` and the shared-world worker. The first migrated collection is
the generated static `type: 'prop'` subset of `objects`: after generation it is
converted to native Scene entities, and the old prop interface becomes a
Scene-derived projection. Other object categories, buildings, world metadata,
and specialized geometry remain on legacy ownership paths. This partial
migration does not yet make the complete generated world canonical.

| Collection / state | Created and populated by | Current owner and consumers | Saved / networked | Scene equivalent and status |
| --- | --- | --- | --- | --- |
| `objects` (active scene), `worldScenes[scene].objects` | `dist/game.js` seeds starter objects and `add`/`spawn`; `dist/world.js` and later generators populate scene objects | Generated static props only: temporary generation records are converted by `world-ownership-runtime.js` into Scene entities. The compatibility array holds proxy views whose transforms/components read Scene state and whose persistent writes go back to Scene. Other objects remain array-owned. Gameplay/render/editor loops still use this object interface, so they need further component-index integration | Static props use deterministic generated entity IDs and WorldDocument persistence. Existing legacy IDs are retained as private aliases for old object lookups. Other object saves/network identity remain mixed | Static props have Transform, MeshRenderer, WorldDecoration, GeneratedProp, Interactable, optional Collider, optional Placement/QuestMarker components. Parent hierarchy is World → SceneGroup → prop. Migrated; derived compatibility view remains. NPCs, resources, and other objects are not migrated |
| `buildings` (active scene), `worldScenes[scene].buildings` | `dist/game.js`, `world.js`, then settlement, civilization, tutorial, walk-in, prop-placement, and editor/building passes | Plain arrays. Renderer, collision/pathing, interior/door links, map queries, building assembly, and editor read/write these records | Editor edits may persist as v2 entities plus a v1 compatibility record. Generated buildings are not serialized as scene state or replicated as full network state | Partial authored editor entities; generated buildings have no canonical runtime entity/component ownership |
| `worldScenes` and scene metadata (`title`, `entry`, `exit`, `lair`, `race`, etc.) | `world.js` and later tutorial, lair, civilization, relic, and quest generators | Plain registry remains authoritative for metadata and non-migrated arrays; Scene is authoritative only for converted static props and authored v2 entities | Scene name can be present in character saves; complete generated registry and metadata are not yet saved as a world scene | Browser Native Scene API is connected, but metadata is not yet mapped into focused scene components. Not migrated |
| `decor`, `floorChunks`, `roads`, `roadBuckets`, ecology/layout records | Lair and tutorial/world geography/ecology generation | Per-scene arrays/maps or module maps. Renderers, movement/terrain queries, room/cave rendering, and generation passes consume them | Primarily regenerated; no canonical entity/component serialization. Some are derived caches; authored road/structure descriptors may affect world behavior | Derived caches can remain after migration; authored spatial features need explicit components or a documented generated-source model. Not migrated |
| `wallTorches` and lighting candidate lists | `world-lighting.js` and scene-lighting queries | Torch arrays and per-frame candidate lists feed renderer lighting | Regenerated; persistent light state is not saved as scene components | Per-frame candidates are derived. Placed/generated persistent lights lack canonical `Transform` + `Light` entities |
| Spatial indexes (`worldObjectIndex`, buckets, ID/order maps, navigation/road caches) | `world.js`, navigation, terrain, ecology, and geography queries | Derived from legacy arrays or generator structures; used by gameplay and rendering | Not serialized or network identity | These may remain derived caches, but their source must become Scene/component indexes. Currently they index legacy state |
| Spawn definitions embedded in `objects` (NPCs, monsters, encounter actors, spawn points) | `add`/`spawn` and scene/lair/encounter generators | Same object arrays; native actor bridge imports only active actor motion state | Shared actor state uses catalog/entity identifiers; permanent definitions and transient spawned actors are not consistently separated in browser data | No complete `SpawnPoint` + typed definition entity migration. Native actor entities do not replace world spawn definitions |
| Gatherables embedded in `objects` (trees, ore, fish, crops and other resources) | `add` plus procedural ecology/geography/world passes | Same arrays; gathering, depletion/respawn, proximity queries, renderer, and shared-world catalog consume records | Some depletion/respawn/ownership state is server-managed; identity compatibility still depends on legacy object/catalog IDs in places | No complete `Gatherable`/resource-state component migration. Preserve server catalog identity during migration |
| Collision and interaction state embedded in objects/buildings or separate geometry records | World geometry, building/civilization/prop placement, doors, quest triggers, and object generation | Gameplay pathing/blocked checks, interaction, editor, renderer picking, and shared-world rules consume it | Only selected gameplay state is saved/networked; generated geometry is rebuilt | No complete entity-owned `Collider`, `Interactable`, `DoorState`, or trigger path. Terrain formulas and derived collision may remain caches sourced from canonical data |

**Identity audit:** `dist/game.js` has a numeric `serial++` for core object IDs;
additional world/quest generators keep separate serial counters, some content
uses catalog IDs, and editor building fallback IDs include a list index. The
spatial index also records insertion order for draw/query ordering. These are
not a safe universal persistent entity identity contract. Network-visible
state must preserve established catalog IDs through an explicit stable
entity/catalog mapping; array order must not become persistent identity.

**Persistence model:** generator configuration, deterministic seed, and source
content are generation inputs. For migrated static props, the first generation
is saved into canonical Scene entities; a `WorldGeneration` marker makes the
saved catalog authoritative on later boots, so deleted props are not restored
by regeneration. Subsequent editor saves persist resulting Scene state.
Existing character saves remain separate. This is implemented only for static
props; other categories still regenerate from legacy sources.

**Compatibility APIs currently present:** generated static `type: 'prop'`
entries in `worldScenes[*].objects` are controlled one-way Scene projections;
their persistent writes update canonical components/transforms. The rest of
`objects`, all `buildings`, and related consumers remain legacy-owned and
directly mutable. `world-edits-runtime.js` still applies authored changes to
construction objects before static-prop conversion and still builds v2 render
proxies. `wallTorches` and spatial/navigation caches remain derived or
regenerated; some sources are still legacy.

## Integration debt and verification limits

The browser's gameplay behavior still operates on the legacy object projection;
those gameplay systems have not all been ported to C++. The native desktop
representative actor slice and browser editor transforms use scene entities,
but the full browser render pipeline is not yet driven by the C++ graph as
Filament entities. This is a Phase 1 foundation, not completion of the larger
browser gameplay conversion.

Full-repository verification: the production bundle builds, the C++ native and
WebAssembly ABI tests pass, the browser bridge loads the generated WASM core,
and all four CMake tests pass, including the asset-dependent desktop test and
headless desktop smoke test. The production asset audit and scene-format,
runtime-renderer, production-worker persistence, local persistence, editor
context/frame, generated-world binding and scene-backed editor transform tests
also pass. The headless desktop
smoke reports 2560x1440 output, 4096 shadows, 900-unit draw distance and 512
visible actors. A graphical browser boot has not been run in this verification
pass.

## Current migration verification — 26 September 2026

Work continues on `phase1-engine-foundation-wip`, based on
`1e8c09fd98ed709531f688daf3383e6beb415348`. Earlier restored files were
ported with a three-way merge, preserving the newer C++ combat formulas.

- **Verified / compatibility bridge only: generated static props.** 3,698
  props across the full 259-scene registry use native entity/component state.
  Read views observe native transform, component, hierarchy and deletion
  operations, including parent rotation/scale. Native entity snapshots are
  immutable and cached by revision. Renderer/navigation caches are invalidated
  from Scene change notifications. Array membership still needs its final
  controlled-collection gate; embedded structural metadata is migrated alongside
  its owning building/structural category.
- **Migrated; controlled read views, validation continuing: buildings.**
  `dist/world-building-scene.js` maps building roots, settlement groups, rooms,
  wall tiles, doors, floor surfaces, ramps, decks and attached prop relationships.
  Transform ownership is native. The full generated test covers 235 buildings,
  2,312 child parts and 234 doors. Representative geometry parity, rotation/scale
  propagation, door catalog IDs, floor surfaces, modular edits and the native
  save/unload/load round trip pass. Module mesh transforms live on child entities;
  captured geometry/material variants are asset data, never transform authority.
  The procedural building renderer receives component-derived geometry inputs
  and the canonical world matrix. `worldScenes[*].buildings` is now a frozen
  derived list. Active `buildings` remains a disposable scene-selection cache.
  Editor/browser interaction and broader generated-building coverage remain
  verification gates. Startup now enables this migration after static props.
- **Migrated: lair decorations and materialized understory.** 259 placed lair
  decorations use native Transform, MeshRenderer, WorldDecoration, Material,
  Interactable and Collider state. Streamed plants become native entities the
  first time their deterministic chunk is materialized; saved chunks are
  authoritative. Decoration membership is a controlled read-only projection.
  Renderer/collision/editor reads use native transforms. Spatial render indexes
  follow edited plant positions; duplicate/delete and batched parent edits
  invalidate derived indexes and meshes. Unmaterialized understory remains a
  documented generator input, not a second mutable world authority.
- **Migrated: road segments.** 4,697 generated segments across the overworld
  and Firstlight are native RoadSegment/TerrainSurface entities under Road
  network groups. Stable IDs depend on source descriptors, not list order.
  Frozen compatibility lists read endpoints and widths from native transforms
  and components. Terrain shading buckets, ecology road grading, navigation,
  minimap and atlas caches refresh after relevant native edits and reloads.
  Firstlight's previously lazy street construction finishes before ownership
  transfer. Deleted saved roads are not recreated. Settlement planning sketches
  remain generation inputs; they are not the live road network.
- **Not migrated:** non-prop object categories, standalone structural geometry,
  lights, spawn definitions, gatherables, and scene metadata.

Native ABI 14 adds individual entity snapshots and world-space transform edits.
Parent-relative affine transforms survive upsert, and WorldDocument revision,
timestamp and extra fields (including terrain) survive save/load. Revisions
remain monotonic across reset. The saved catalog is authoritative for migrated
categories; generation markers prevent deleted entities from reappearing.

Commands verified on this checkout before building migration:

- `make -C native test wasm wasm-test`: pass, including fresh Emscripten build.
- `node tests/native-runtime.mjs`: pass.
- `node tests/world-static-props-scene.cjs`: pass; native edits, 3,698 props,
  deterministic identities, hierarchy, and save/unload/load.
- `node tests/editor-camera.cjs`: pass.
- `node tests/world-scene-runtime.cjs`: pass.
- `node tests/world-scene-runtime-binding.cjs`: pass; this only covers legacy
  editor mirrors and does not prove full generated-world ownership.
- `node tests/building-assembly.cjs`: pass before new building migration.

Spirits are retired. `dist/spirits.js` is an inert compatibility shim. The
combat-claims expectation is ordinary shared magic/combat; active spirit
attacks must not be reintroduced to satisfy an obsolete test.

### Phase 1 completion gates

- [x] Native graph, component index, hierarchy and serialization core.
- [x] Editor/runtime context separation in automated tests.
- [ ] All generated categories are Scene-owned with controlled membership.
- [ ] Building/modular renderer, collision and editor migration verified.
- [ ] Roads, decorations, lights and metadata migration verified.
- [ ] Permanent spawn definitions separated from transient live actors.
- [ ] Gatherable lifecycle and network catalog identities verified.
- [ ] Full generated-world save/unload/load comparison.
- [ ] Complete affected regression suite, fresh final build.
- [ ] Real `/play` and `/editor/` interaction on the new build.
- [ ] All remaining compatibility APIs are controlled one-way views.

**Phase 1 is NOT COMPLETE. No completion commit or production deployment has
been made.** Previous verification claims above are historical unless repeated
in this current-checkout list.

Additional current-checkout verification:

- `node tests/world-buildings-scene.cjs`: pass — 235 buildings, 2,312 parts,
  234 doors; native ownership, representative render parity, attached prop/door
  movement, scaled/rotated surfaces, modular edits and save/unload/load.
- `node tests/world-building-components.cjs`: pass — focused component
  dimensions, wall transforms, door portal parenting, module duplicate/delete,
  and canonical persistence.
- `node tests/combat-claims.mjs`: pass — ordinary level-26 exclusivity,
  level-27 shared attack/hit/magic, and owner-disconnect release. No spirits.
- A rejection test exposed disabled C++ exception catching in the browser
  build. The standalone module now uses `-fwasm-exceptions`; a fresh
  `make -B -C native wasm wasm-test` and `node tests/native-runtime.mjs` pass.
  Invalid component/transform/reparent upserts leave the Scene and revision
  unchanged. This is engine error handling, not a JavaScript fallback engine.

### Recoverable remote checkpoints

The initial 49-file checkpoint is on GitHub branch
`phase1-engine-foundation-wip` at
`89557c6623a93b3812c2a59310a9c218379d4502`, with the exact message
`WIP: Phase 1 procedural world migration checkpoint`. The remote Git tree was
verified equal to the local tree. Further substantial categories must be
committed and uploaded to this branch. Do not deploy or merge into main.

Scenery verification: `node tests/world-scenery-scene.cjs` passes canonical
lair collision/renderer transforms, immutable collection membership, streamed
chunk persistence, moved/duplicated plants, batched cache invalidation and
save/unload/load. `node tests/world-buildings-scene.cjs` has also verified the
full generated set of 235 buildings, 2,312 parts, 234 doors and 259 decorations.
No graphical browser interaction is claimed by these headless tests.

The scenery follow-up was verified on the remote at
`d2cfa89f48c900f9f6b1d1ab33166558240e90e8`.

Road checkpoint verification:

- `node tests/world-roads-scene.cjs`: native road ownership, terrain shading
  and height parity, parent rotation/scale, width edits, cache rebuilding,
  duplicate/delete, persistence and source-order-independent identities.
- `node tests/world-buildings-scene.cjs`: full generated migration plus native
  save/unload/load, now including all 4,697 road segments and Firstlight streets.
- `node tests/terrain-travel.cjs`: bridge travel, terrain picking, banks,
  floors, coastline and continuous road coverage.
- `node tests/editor-context.cjs`, `node tests/editor-frame.cjs` and
  `node tests/world-scene-runtime.cjs`: pass.

Phase 1 is still incomplete. Remaining work includes
scene metadata, standalone structures, spawn definitions versus live actors,
gatherable lifecycle/catalog identity and the remaining controlled collections.
The final graphical `/play` and `/editor/` verification gate remains open.

- Current road checkpoint: `npm run build` passes with 203 bundled game assets.
  This built locally only; nothing was published or deployed.

Light checkpoint verification (ABI 15):

- Permanent wall torches, fires, ranges/furnaces, lanterns and luminous scenery
  now persist as Scene entities/components. C++ resolves point lights from the
  component index, world transform, ancestor activation and day/night intensity.
- Fixture meshes and emitters follow the same native transform. Permanent
  fixture catalog IDs and existing gameplay references are preserved; runtime
  player fires retain their transient expiry and are excluded from serialization.
- `make -C native test wasm wasm-test`, `node tests/native-runtime.mjs`,
  `node tests/world-lights-scene.cjs` and `node tests/editor-camera.cjs`: pass.
- `node tests/world-buildings-scene.cjs`: pass with 1,282 permanent lights, in
  addition to the building/scenery/road totals above, including save/unload/load.
- Focused tests cover mesh/emitter alignment, parent scale/rotation, day/night,
  native color edits, catalog identity, duplicate/delete and saved-catalog boot.

This is a Phase 1 checkpoint; graphical verification and remaining ownership
categories are still open. No publication, deployment or merge was performed.
