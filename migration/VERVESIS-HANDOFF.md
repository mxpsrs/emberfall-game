# Vervesis handoff — blocked contract access and native acceptance

Vervesis was not modified. This is an integration handoff inside Veldren, not a request to move Veldren asset recovery into the engine.

## Needed to resume actual integration

Provide read-only access to the **current Rust implementation**, its exact commit/version, a working sample project and runtime/export binaries or documented build prerequisites. Specifically:

1. Versioned manifest/asset/scene/component schemas, project root resolution, asset identifiers and import/cache rules; one project that opens in Play mode and exports successfully.
2. Coordinate handedness, units, forward axis, rotation order, quaternion and matrix conventions, parent transforms and large-world/terrain support.
3. Supported Rust game extension crate/API or approved scripting interface: lifecycle, entity lookup, deterministic update, messages/events, scene transitions and serialization.
4. Native Filament material/texture support; glTF skin/morph/animation limits; instancing, independent mutable animator state, attachment sockets, dynamic equipment, palette/color customization and resource ownership.
5. Exported-game UI/input system, including text input and IME, focus, pointer capture, tooltips, scrolling, chat and login. Identify implemented controller/mobile targets explicitly.
6. Terrain/collision/navigation APIs: heightfields, bridge walk surfaces, actor obstacles, dynamic doors/gates, collision footprints and path requests.
7. Supported network/session/streaming and secure local save/session interfaces. Veldren must retain its existing backend and authoritative protocol.
8. Windows export/launch procedure, packaged resource layout and bundled native Filament dependencies; parity with editor Play mode.

The absence of inspectable interfaces is the blocker. It is not evidence that each capability is absent from the private VS Code engine. Please classify each as implemented with a concrete sample/API, planned, or unsupported.

## Exact Veldren integration requirements

- Preserve source gameplay IDs and references. Standard glTF world node extras point to the independent JSON entity records. Model replacement must not change quest or server identity.
- Preserve 339 scenes, their transitions and source metadata. Static regions are editable visual exports, not runtime scenes. Terrain/navigation grids carry source conventions and triangle split information in world-content.json.
- Use the recovered skeletons and actual clips. Attachments and timing metadata are retained in GLB extras. Some source clips are sampled palettes with STEP timing; engine interpolation must be assessed against source parity. Do not silently map unavailable actions to idle.
- Keep animation state per actor. Existing rigs/assets may be cached, but pose/playback state must not be shared accidentally. Dynamic appearance, gender/race adaptation, staff grip corrections, armor fitting, bow/quiver behavior and weapon hand alignment require integration tests.
- Browser procedural materials (terrain, wood, stone, water, vegetation motion, lighting, cutaways and effects) do not become Filament shaders automatically. The glTF candidates preserve source/base attributes and atlas textures; this work has not implemented native shader equivalents.
- Dynamic actors, fires, gates, crops, fishing states, effects and ground cover are intentionally outside the static visual bake. Their source definitions are retained; native behavior is not implemented.
- Movement/combat/skills/inventory/bank/trade/dialogue/quests/tutorial and scene transitions still execute only in the reference browser client. Non-executable behavior-reference files document closures requiring a real port.
- Preserve session identity, save revisions, item/progression/permission data, receipt replay protection, shared entity generations, owner/private loot, quest scopes and synchronized server time. Do not accept a client's rendered pose as authoritative damage or movement.
- Existing worker modules remain the protocol authority. The local two-client test uses synthetic accounts and real worker code; it does not prove a native adapter or hosted capacity.

## Asset-specific unresolved details

- The supplied Demon texture RARs are truncated. Ten complete members were recovered, and the adapted boss GLB retains the existing game's geometry/rig/motion and atlas material. Missing source PBR channels cannot be reconstructed honestly from the archive.
- Original Nature glTFs contain 2,191 validation errors across 24 files. Original bytes are preserved; corrected authoring GLBs retain raw color values separately and pass validation. See source-validation-baseline.json.
- Six source object references point to older inline building objects rather than the current buildings array; the snapshots retain these inline relationships instead of inventing registered building IDs.
- Twelve triangles in the existing lair_veyr survey-chart prop have non-finite vertices. Only those invalid triangles are excluded. A content decision is still required for the missing shape.
- Some original third-party packages (including the complete Medieval Village/Modular Warrior/fantasy outfits/bestiary inputs) are absent from accessible history/archives. Genuine adapted geometry, rigs and available clips were exported from the current bundles. This does not recover original source information previously discarded by those importers.
- License records have different terms. The Bestiary evidence is QAL, while other supplied archives contain their own terms; CH0SAN permission evidence is a historical provenance assertion. Do not label the whole library CC0 or publish it as a standalone asset pack.

## Native acceptance still required

Use the actual shared runtime. Test account entry, existing/new characters, movement/camera/collision, interactions, combat/gathering, every UI panel, equipment, banking/trade, dialogue/quests/tutorial, transitions and save/reload. Run at least two authenticated native clients for local/remote appearance and synchronized actions. No production account resets.

Export and launch a Windows executable from a clean location with no original source paths or asset caches. Permit normal game API traffic and confirm zero third-party asset-host dependency. Verify edited assets/scenes behave identically in Play mode and exported games.

On documented hardware/settings measure startup and loading time, frame-time distribution, memory, instance counts and cleanup. Repeat transitions and character/equipment creation/removal. Include a 39-actor rendering workload; separately evaluate 39 authenticated hosted players. Until these tests execute, overall native migration remains incomplete.
