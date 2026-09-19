# Engine contract and compatibility map

The required target is the user's current Tauri/Rust Vervesis environment, custom Rust engine and native Filament renderer. No current implementation contract was accessible in this workspace. The available Vervesis.zip and accompanying workflow/handoff documents describe an older Electron/Three implementation. They were inspected read-only and were not used to invent a new contract.

No manifest, scene, component, behavior, renderer, UI, networking or export API is asserted to exist. “Unknown” below means implementation unavailable for inspection, not a verified defect in Vervesis.

| Contract area | Evidence available | Current outcome |
| --- | --- | --- |
| Project manifest / asset registry | Old Veldren dist/data/asset-registry.json is a browser catalog, not proof of a Rust format | Native format unknown; no competing manifest introduced |
| Scene / entity / component serialization | Complete Veldren source snapshots and standard glTF visuals | Engine schema, extensibility, IDs and migrations unknown |
| Coordinates / transforms | Legacy map x,y becomes render x,z; Y up; +Z forward; heading atan2(dx,dz), radians; row-major 3x4 affine transforms | Preserved in evidence and converted to glTF matrices; native handedness, physical units and conventions unknown |
| Models / materials | Native glTF data plus old WebGL procedural shaders and a 64-tile atlas | glTF candidates validate; Filament material, transparency, lighting and shader support unverified |
| Animation / equipment | Named hierarchies, inverse binds, weighted meshes, actual clips, action timing, head/hand sockets, fitted variants | Native animator, events, attachment and customization interfaces unknown |
| Game behavior | Source logic and 122 structured data bindings | Supported Rust extension/lifecycle/scripting interfaces unknown |
| UI / input | Current HTML/CSS/SVG and browser focus/input behavior | Exported-game UI and text input APIs unknown; Tauri editor UI is not assumed |
| Collision / terrain | Height grids, bridge walk heights, static blocked grids, object footprints, dynamic relationships | Engine physics/navigation/terrain representation unknown |
| Networking / saves | Existing worker modules, catalog, authenticated local tests, account/save revisions | Native HTTP/cookie/stream/storage interfaces unknown |
| Runtime / export | No current Rust runtime binary, SDK crate, sample or Windows exporter supplied | Play mode, standalone launch and packaging blocked |

## Veldren systems

| System | Implemented migration content / evidence | Native work still required |
| --- | --- | --- |
| Continent, settlements, interiors, caves and quarries | All source scenes, fixed IDs, metadata, entries/exits, static regions and parts | Convert through actual scene/terrain schema; instantiate with correct units and materials |
| NPCs / creatures / spawns / quest phasing | Source IDs, stats, spawn/home positions, quest metadata and actor models | Bind supported behavior lifecycle and server ownership; preserve per-player visibility |
| Movement / camera / pathfinding | Baseline controls and navigation source; static collision and walk surface exports | Native input/camera implementation and dynamic obstacle handling |
| Combat / skills / gathering | Data, baseline modules, real available clips and local worker regressions | Native state machines; authoritative event handling and unchanged action timing |
| Inventory / equipment / customization | Item tables, fitted male/female assets, raw masks, sockets and representative presets | Runtime equipment rules, palette/material overrides, quiver and weapon alignment, independent actor animation |
| Banking / trade | Existing game/server rules and test evidence retained | Native panels and transactional protocol adapter |
| Dialogue / quests / tutorial | Dialogue and quest data; source closures preserved as non-executable references | Port transitions/callbacks through approved engine behavior interface |
| HUD / login / settings / chat / spellbook | Existing DOM/CSS, 91 standalone SVGs, current raster UI and audio | Approved game UI widgets, focus, text entry and tooltip behavior |
| Authentication / character loading / saves | Existing API and database schemas remain unchanged | Native secure session persistence, compatible save revisions, loading/conflict/disconnect behavior |
| Shared actions / doors / trees / drops / fires | World relationships and current server protocol; two-client observer tests | Native replication, server clock interpolation and remote animation/appearance |
| Scene transitions / resource cleanup | Baseline transitions and portable content | Shared Play/export lifecycle, caching, unload and repeated transition tests |
| Windows packaging / performance | Local resource closure verified in a clean asset-only copy | Engine exporter, native executable, clean-machine launch, measured hardware and 39-actor rendering workload |

## Active rendering versus retained legacy code

The actual page loads 76 scripts. The fixture records their complete order in world-content.json. draw resolves to draw3d in view3d.js. Its painter3 is replaced by renderer-gl.js with the WebGL painter, GPU skinning and instancing; the CPU fallback remains. realmFaceData/realmIndexedData and model transforms are later grounded by world-depth.js. Model, avatar and creature behavior is further changed by realms-rebuilt.js, creatures.js, world/civilization layers, item-models.js, character creation and later UI/social scripts. The last prop3 wrapper is ore-identity.js; building3 resolves through civilization-world.js. Source-only sprite render tests do not demonstrate the active renderer.

The giant model JavaScript files contain imported indexed meshes, rigs, weights and sampled animation. They are decoded as genuine source data. Older functions and the four legacy KayKit palette rigs remain available for reference; they are not mislabeled as the active character renderer. Current fitted equipment and authored source equipment are distinct exports.

dist/ contains authored game code, model bundles, shaders, HTML and CSS. scripts/build.mjs creates server output and regenerates selected game artifacts. Only dist/server and known cache/build directories are disposable under the existing repository conventions.

## Authority boundary

Render nodes never become authoritative gameplay records. Scene identity stays independent from model selection. Existing worker authentication, account IDs, save revisions, shared catalog IDs, receipts/generations, scene scopes, world time and server-owned combat remain the reference. No administrator credential or server-only token is part of the migration content.
