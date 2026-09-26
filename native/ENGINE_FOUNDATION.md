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
Scene-derived projection. Buildings, scenery, roads, lighting, metadata, city
structures, permanent actor definitions and gatherables have since migrated as described
below. Remaining categories still prevent complete generated-world ownership.

| Collection / state | Created and populated by | Current owner and consumers | Saved / networked | Scene equivalent and status |
| --- | --- | --- | --- | --- |
| `objects` (active scene), `worldScenes[scene].objects` | Procedural generation, then category migrations | Static props, building doors, permanent fire/cooking fixtures and exits are native projections. Actors combine native definitions with unsaved live state. Remaining categories and mixed array membership still need migration | Migrated entities persist in WorldDocument; fixtures, doors and exits retain network catalog IDs | Native Transform and focused components own migrated data. Other service objects, mixed collection membership and full actor render integration remain unfinished |
| `buildings` (active scene), `worldScenes[scene].buildings` | Settlement, civilization, tutorial and building generation | Native building roots and child entities; frozen compatibility lists feed renderer, collision, doors and editor | Canonical graph serialization, including building parts, modules and door state | 235 building roots, 2,312 parts and 234 doors migrated. Remaining standalone architecture is a separate category |
| `worldScenes` and scene metadata (`title`, `entry`, `exit`, `lair`, `race`, etc.) | World, tutorial, lair, civilization, relic and quest generators | Registry remains a runtime context container. Metadata, dimensions, navigation references and lair settings project native components | WorldDocument stores SceneInfo, SceneBounds, SceneNavigation, SceneEnvironment, LairLayout and entry/exit entities | Metadata migrated; realm labels share SceneInfo. Existing buildings retain native associations; retired mine shells are not restored |
| `decor`, `floorChunks`, `roads`, `roadBuckets`, ecology/layout records | Lair, tutorial, geography and ecology generation | Native decorations, materialized plants and road segments; renderer/spatial caches are derived | Migrated records serialize; saved catalogs and materialized chunks are authoritative | 259 decorations and 4,697 roads migrated. Unmaterialized plants remain deterministic construction input; standalone structures remain open |
| `wallTorches` and lighting candidate lists | Lighting generation, then native migration | Frozen torch views and Scene-owned fixtures; C++ resolves world-space point lights, activation and day/night intensity | Permanent Light components and fixtures serialize; player fire expiry remains transient | 1,282 permanent lights migrated. Runtime candidates are derived from native component queries |
| Spatial indexes (`worldObjectIndex`, buckets, ID/order maps, navigation/road caches) | `world.js`, navigation, terrain, ecology, and geography queries | Derived from legacy arrays or generator structures; used by gameplay and rendering | Not serialized or network identity | These may remain derived caches, but their source must become Scene/component indexes. Currently they index legacy state |
| Spawn definitions (NPCs, monsters and encounter actors) | Construction generators, then `world-spawn-scene.js` | 770 native SpawnPoint entities with typed definition components; separate unsaved live views feed gameplay and the C++ actor bridge | WorldDocument stores permanent definitions. CatalogIdentity retains existing server IDs; health, timers and movement are transient | Native definitions and fresh saved boot verified. Mixed membership and full authored actor rendering remain open |
| Gatherables embedded in `objects` (trees, ore, fish and crops) | Construction generators, then `world-gatherable-scene.js` | Native Gatherable definitions, transform/collider/appearance components and a separate C++ resource session; compatibility views feed current gameplay | WorldDocument stores definitions and CatalogIdentity. Native depletion/replica receipts are transient; private farming remains in character saves | 4,372 resource definitions migrated with established catalog IDs, native lifecycle, transformed resource collision and renderer adapters. Mixed membership remains open |
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
Existing character saves remain separate. The same authoritative-catalog
pattern now covers the migrated categories listed above; remaining categories
still regenerate from legacy sources.

**Compatibility APIs currently present:** generated static `type: 'prop'`
entries in `worldScenes[*].objects` are controlled one-way Scene projections;
their persistent writes update canonical components/transforms. Building,
scenery, road, light, metadata and structure projections now follow native
entities. Actor views explicitly separate definition edits from unsaved session
state. The mixed `objects` collection and unmigrated categories remain mutable. `world-edits-runtime.js` still applies authored changes to
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
- **Migrated: permanent lights, fixtures and scene metadata.** See the ABI 15
  light, metadata and editor initialization checkpoints below.
- **Migrated in subsequent checkpoints:** city structures and 770 permanent
  spawn definitions; see detailed verification below.
- **Still open:** gatherables and other non-prop categories, bridges/quarry
  geometry, mixed collection membership and full authored actor render transforms.

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
- [x] Roads, decorations, lights and metadata migration verified in automated tests.
- [x] Permanent spawn definitions separated from transient live actors.
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
standalone structures, spawn definitions versus live actors,
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

Scene metadata checkpoint:

- `SceneInfo`, `SceneBounds`, `SceneNavigation`, `SceneEnvironment` and
  `LairLayout` now own generated descriptions, dimensions, navigation references
  and lair layout/environment settings. Entries are child entities with native
  transforms; exit references reuse canonical stairs or point to migrated exit
  entities. Scene/realm/lair APIs read and write this shared data.
- Runtime realm titles and kingdom labels no longer depend on a retired exterior
  building shell. Existing buildings retain canonical cross-scene references.
  Retired shells are not reintroduced into the render or building catalog.
- Permanent exits preserve catalog IDs and use native transforms in rendering.
  Saved metadata markers prevent procedural regeneration from replacing edits
  or resurrecting deleted exits. Actor spawning and live encounter state remain
  a separate, unfinished migration category.
- `node tests/world-metadata-scene.cjs`: pass — native edits, shared views,
  entry parent rotation/scale, existing stair references, exit render transforms,
  retired exterior labels, guarded membership, unload/load and fresh saved boot.
- `node tests/editor-context.cjs`, `node tests/editor-camera.cjs`,
  `node tests/world-scene-runtime.cjs` and
  `node tests/world-scene-runtime-binding.cjs`: pass.

Editor native initialization checkpoint:

- The editor viewport now schedules the native loader in editor context. It
  exposes only Scene operations and teardown, allocates no actor transfer buffer,
  and exposes no gameplay stepping, rules, inventory or combat API. The existing
  editor render loop continues without player simulation.
- Startup reports a missing native initialization promise immediately. Previously
  the viewport omitted the loader required by all Scene migrations.
- `node tests/native-editor-runtime.mjs`: pass against the actual WASM module;
  native transforms, light queries, graph persistence, no gameplay exports called,
  and exactly-once teardown. Runtime bridge and editor context/camera tests pass.
- A combined unload exposed a stale exit view in the light projection. The light
  adapter now drops deleted entities from other migrated categories safely;
  `node tests/world-lights-scene.cjs` covers this cross-category regression.


Integrated verification on the editor initialization checkpoint:

- `VELDREN_SCENE_CONTEXT=editor node tests/world-buildings-scene.cjs`: pass.
  The real editor-mode WASM bridge migrates 235 buildings, 2,312 parts,
  234 doors, 259 decorations, 4,697 roads, 1,282 lights and 259 scene metadata
  records, then verifies hierarchy edits and exact native save/unload/load.
- The light, metadata and editor initialization checkpoints were independently
  confirmed on GitHub as `f303e92fdd927afbe1640c00821af407a57a48a4`,
  `8e9c1af51c9ed756c2e09335da30baa68e08e43d` and
  `14ec160f0e8f8048156713c2979706e113582ef4`, respectively.
- Phase 1 remains incomplete: standalone architecture, permanent spawn
  definitions/live actor separation, gatherables and remaining mixed collection
  membership still need migration. The graphical play/editor verification gate
  remains open. Nothing was deployed or merged into main.
- Fresh `npm run build` and `node tests/built-assets.mjs`: pass on the editor
  initialization code. 205 bundled assets, all 112 startup resources, WASM
  delivery, JavaScript/JSON parsing, source byte parity and cache validation
  pass. The local Worker bundle is 63,436 KiB; no hosting action was performed.

Standalone architecture checkpoint (ABI 16):

- Native indexed footprint queries resolve transformed rectangles through the
  Scene hierarchy, including nonuniform scale, ancestor activation and reload.
  Browser collision uses these queries for migrated walls and stair openings.
- 791 wall runs, 34 rooms, 16 interior floors, 9 gatehouses and 18 guard walk
  surfaces now persist as native entities. Gate towers own their walls, ramp
  endpoints and decks. Gate arches have independently editable transforms.
  Structure maps and surface lists are controlled derived views.
- All nine generated gatehouses retain their original geometry. Focused tests
  cover moved/rotated/scaled tower collision and walk heights, stair openings
  and borders, room queries, copied hierarchy references, deletion and reload.
- `make -C native test wasm wasm-test`, native runtime/editor bridge tests,
  `node tests/world-structures-scene.cjs`, `node tests/world-buildings-scene.cjs`,
  editor context/camera and world scene runtime tests pass. The combined world
  retains the previous building, decoration, road, light and metadata totals
  through exact native save/unload/load.
- This covers city walls, gatehouses, interior floor rooms and stair wells.
  Bridges, quarry terrain configuration, permanent spawns, gatherables and
  remaining mixed collection ownership are still open. Arbitrarily rotated
  stair-hole visual clipping and graphical play/editor verification remain
  limitations; exact native footprint collision is verified separately.
- No deployment, publication or merge into main was performed.

Permanent spawn definition checkpoint:

- 770 generated NPC/monster definitions now live in native Scene entities.
  SpawnPoint, ActorDefinition, ActorAppearance, CombatStats, EncounterDefinition,
  Dialogue, QuestMarker and ActorPlacement separate their permanent concerns.
  CatalogIdentity retains existing network IDs; source-derived entity IDs are
  captured before editor overlays and do not depend on unrelated array order.
- A live view combines those definitions with unsaved session state. Health,
  movement, combat timers, animation caches and multiplayer receipts do not
  write to WorldDocument, including nested mutations. C++ actor motion still
  runs in its separate transient Scene. Existing lexical gameplay references
  forward to the live view. Disabled definitions stay unavailable to gameplay.
- Spawn/home transforms follow native building parents. Native transform edits
  reset only the live pose; component edits do not reset combat. A document
  reload recreates transient defaults. Saved spawn deletion remains authoritative
  on a fresh boot. Actors created during play are not permanent definitions.
- Runtime and editor startup both enable this migration. Editor definition and
  transform edits write through the native Scene; preview health stays transient.
  Spawn entities retain the existing gameplay-linked duplicate/delete protection.
- `node tests/world-spawns-scene.cjs` passes actual WASM actor stepping, state
  isolation, hierarchy/home transforms, source-order identity, catalog mapping,
  lexical references, editor authoring, unload/load and fresh saved boot.
  `node tests/world-buildings-scene.cjs` passes all 770 generated definitions,
  original catalog IDs/health/positions/home coordinates, previous category
  totals and exact combined native save/unload/load.
- The actor renderer and gameplay still consume compatibility views. Full
  authored actor scale/orientation rendering and graphical interaction remain
  verification/migration work; this checkpoint does not claim full native
  browser gameplay or Filament graph ownership. Gatherables, bridges/quarries
  and remaining mixed membership are also unfinished. Spirits remain retired.
- Structure checkpoint `aba0ea9a11de2f219b0d61c3c7d0fac4e2674cfe` was verified
  on GitHub before this category continued. No deployment or merge occurred.

Integrated structure/spawn verification:

- The permanent spawn checkpoint was verified on GitHub at
  `94e4ab52a83e8a3c13dc94654b1e9944f8a18835`.
- `VELDREN_SCENE_CONTEXT=editor node tests/world-buildings-scene.cjs` passes
  all migrated category totals, including 770 spawn definitions, original
  catalog identities, hierarchy edits and exact native save/unload/load.
- Integration found that the native structure draw stage was reachable only
  through the outdoor crossings pass. It now runs once from the common scene
  frame. The focused structure test executes the production frame through that
  stage and confirms finite geometry submission in both cellar and overworld.
  This is an automated frame-stage check, not graphical browser certification.
- Scene-format, runtime renderer, production/local persistence, editor
  context/frame/camera, runtime/editor WASM bridge and combat-claims tests pass.
- A fresh `npm run build` and `node tests/built-assets.mjs` pass after the frame
  fix: 207 bundled assets, all 114 startup resources, JavaScript/JSON parsing,
  source byte parity, cache validation and audio source checks. The bundle is
  63,481 KiB; assets are 56.23 MiB before hosting compression. An earlier audit
  correctly rejected a stale build captured while the frame fix was being
  written; the clean rebuild resolved that mismatch.
- Phase 1 remains incomplete. Next work includes gatherable lifecycle/catalog
  identity, bridge/quarry ownership, controlled mixed collections, authored
  actor scale/orientation rendering and graphical `/play`/`/editor/` checks.
  No game publication, deployment or merge into main was performed.


Gatherable ownership checkpoint (ABI 17):

- 4,372 permanent trees, ore nodes, fishing spots and crop plots now use native
  Gatherable, ResourceAppearance, ResourcePlacement, QuestMarker, MeshRenderer,
  Collider, Interactable and CatalogIdentity components. Harvest definitions are
  saved with the resource; missing legacy subtype IDs remain missing to preserve
  existing default-tree depletion behavior. Stable entity identities are captured
  before editor overlays. Saved deletion remains authoritative on a fresh boot.
- Depletion deadlines, regrowth, hit timers, collection state and shared-world
  replica receipts now live in a separate C++ resource session Scene. Atomic
  patches validate fields; timer ticks and tree lifecycle phases run in C++.
  Shared resources wait for server updates. WorldDocument and its revision are
  unchanged by these runtime events. Reload/removal clears stale resource state.
- Existing resource references forward to the canonical view. Farming plot keys
  retain their numeric catalog IDs and private progress stays in character saves.
  The editor exposes no resource gameplay API; preview state is transient.
- Native indexed collision preserves the legacy center/radius tile mask through
  ancestor rotation and nonuniform scale. Meshes and stumps consume the same
  native world transform; activation, visibility and collection are respected.
  Navigation/mesh caches are derived and invalidated by Scene edits.
- Focused native, WASM and browser tests cover lifecycle timing, shared tree
  views, catalog compatibility, farming isolation, affine rendering/collision,
  saved deletion, fresh boot, editor authoring and save/unload/load. Full generated
  world and build verification results are recorded after they complete below.
- The shared-world server protocol and account/character persistence schema are
  unchanged. Browser gameplay still consumes compatibility views; this does not
  claim complete native gameplay or graphical play/editor certification.
  Bridges/quarries, remaining controlled collections and authored actor rendering
  remain Phase 1 work. No publication, deployment or merge into main occurred.

Gatherable integration verification:

- Native C++ tests, standalone WASM ABI tests, runtime/editor bridge checks,
  focused gatherable tests and Scene runtime/binding tests pass.
- Full generated-world migration passes in both runtime and editor contexts:
  4,372 gatherables (4,171 trees, 130 ore nodes, 10 fishing spots, 61 crop plots),
  all existing catalog IDs and harvest definitions, representative resource
  geometry, previous category totals and exact native save/unload/load.
- Shared-client and loot-interaction tests, editor context/camera tests pass.
- A fresh build and built-asset audit pass: 208 bundled assets, all 115 startup
  resources, 56.24 MiB of assets and a 63,511 KiB Worker bundle. This is a local
  build only. No hosted capacity or graphical interaction claim is made.
