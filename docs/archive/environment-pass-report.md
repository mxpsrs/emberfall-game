# Veldren environment and camera pass — 17 September 2026

**Later owner correction:** `DOOR-CAMERA-REPAIR-2026-09-17.md` supersedes the automatic pitch assistance and occupancy-only roof behavior described below. The camera now remains at the player's chosen angle; opening a door hides the roof and upper floors. It also records the restored visible castle gates and the 233-door access audit. The original performance and visual evidence below describes the v124 environment pass, not a new certification of every later camera view.

Status: implementation and local release validation finished; **full requested acceptance is not certified**. The strict table below records FAIL where the required measurement or walkthrough was not completed, rather than substituting a narrower test. This supersedes any blanket “finished” wording.

## Changes

- Inventoried all 108 static models now in the two installed environment bundles (104 before restoration). Inspected the original pinned KayKit pack catalog, including unused architecture; inspected representative imported meshes and their bounds.
- Restored four modules from the already-used CC0 KayKit Medieval Hexagon pack: curtain wall, timber fence, watchtower and tower base. No new environment pack was introduced. Unused restored bridge/windmill variants were removed before release to avoid shipping unnecessary geometry.
- Sunspire, Ironcrown and Bough Palace now use authored curtain walls, proper corner/gate towers, connected masonry, gate arches, upper windows and authored tiled roof sections. Wall runs cover exactly the existing collision tiles and leave openings unchanged.
- All 13 settlements inherit authored fences, wells, appropriate regional roof variants and preserved modular walls/windows/doors. Dwarven workshops gain stone terraces; elven roof directions and profiles vary. Civic groves use the installed authored TwistedTree model. These are variations within compatible sets, not indiscriminate asset mixing.
- Briar Haven’s Magic School gains a recognizable roof tower with Veldren Relic detailing. Existing space, services, terrain, NPC positions and door approaches are preserved.
- All seven overworld bridges use the installed authored KayKit bridge, fitted to the existing walking deck and bank connections. Mesh vertices follow the established deck profile; collision/path data was not moved.
- Exposed ordinary mine boundaries use authored boulders and masonry retaining faces; timber braces remain intentional beam geometry. Boss caves retain their existing authored rock/masonry and entrance assets at full height.
- Removed camera-facing wall removal and waist-high replacement walls. Castle towers/curtain walls and cave walls retain their geometry during orbit and entry. Roof visibility is separate: only actual building occupancy, or the occupied castle room, removes its covering. Exiting restores it.
- Added bounded, smoothed camera-pitch assistance using nearby building bounds and a short terrain ray, checked at 10 Hz. Projection, picking and rendering share the assisted pitch. Manual camera preference and authoritative/shared state are not changed. No architecture transparency system is introduced.
- Fixed a Fairy Lands terrain bug: a road color vector contained two components instead of three, producing malformed terrain vertex buffers. Added stride/finite-data regression coverage.
- Fixed capture tooling that silently fell back to another location on blocked positions; added explicit scene checks and corrected tutorial/quest review fixtures. Replaced misleading captures before retaining evidence.
- Reapplied the existing shelter/quarry footings after road and foundation blending. All six goblin shelters and 29 quarry work props now pass a level-footprint check; all five quarry ramps remain unchanged. The correction starts after deterministic world placement, preserving the exact shared catalog and object IDs.

## Primitive audit and provenance

See `ENVIRONMENT-PRIMITIVE-AUDIT.md`, `ENVIRONMENT-ASSET-INVENTORY.json` and `ENVIRONMENT-PACK-CATALOG.json`.

Newly used KayKit modules come from the same pinned source as the existing town bundle: KayKit-Medieval-Hexagon-Pack-1.0, commit `84fa4e91af6a88989be7c99e0891cede11f2ca38`. The additive importer records each original path. Bundled KayKit and Quaternius license/credit files remain intact. Quaternius modular walls, roofs, rocks, trees and furniture are reused from the existing credited library.

Remaining deliberate primitives include terrain, paths, water, floors, hidden technical volumes, timber braces, cloth awnings/tents, custom Spirit/Relic symbols, cut stone, foundations and fitted stair treads. Their form has a structural or artistic purpose. The category audit is not a counted ledger of every visible primitive in the entire repository.

Existing unrelated permission gaps in `ASSET-AUDIT-PHASE-3.md` remain: CH0SAN warrior; exact archer download/prop terms; individual CGTrader acquisition evidence; Treant/Poly Pizza source receipts; music acquisition records; legacy raster/landing-art provenance. Presence in the repository is not permission evidence. No asset was declared an unauthorized rip or deleted on suspicion. Existing CC BY attribution for the dragon/insectoid models remains necessary and preserved.

## Visual evidence and scope

`environment-review/locations.json` records 107 review positions. The 18 retained contact sheets contain final or corrected views; detailed JPEGs show Briar Haven, all three castles, Willowcross, Aelindor, the school exterior/interior, Pinewatch Mine, a river bridge, Firstlight square/kitchen and the Sanctum arena. All three castles were inspected from front, rear, left, right, elevated and courtyard views. The regional architecture captures were refreshed after the final roof changes.

Reviewed settlement centers: Crownreach, Greyhaven, Briar Haven, Willowcross, Stoneford, Ironhollow, Deepforge, Copperdelve, Stonehearth, Aelindor, Moonwillow, Fernwatch and Silverbrook. Other samples include five quarries, mine/crypt/cave entrances, main-chain quest locations, seven bridges, Firstlight, four boss approaches, the Fairy Lands, goblin settlement, human/elven forests, dwarven foothills and a main road. Ten interior positions were rendered. Some castle-library/hall detail images precede the final roof recolor; final castle sheets supersede them for roof color.

Native ES2 captures use production geometry, shaders, atlas and lighting. They verify rendered output, not mouse/touch traversal or physical-device FPS. Browser review used the software fallback and included settlement/school interiors, entry/exit and camera controls. The single-frame browser review surface had slow drawing/timeouts; it is not evidence of smooth continuous orbit. The 844×390 landscape render is an offscreen layout/camera-size sample, not a physical-phone result or a full mobile UI screenshot. Temporary review pages were removed before building.

The automatic world audit covered 339 scenes and found zero tree/foundation violations under its checks; it is not a claim that every scene was visually walked.

## Final measured sample

`environment-review/measurements.json` is generated by `scripts/qa/measure-environment.cjs` from the instantiated production world and production geometry builders.

- House profiles were counted by race, footprint, visible variant and door orientation. The largest identical share is 12.5–33.3% in the eleven settlements with multiple homes. Fernwatch and Silverbrook each have one home, so their mathematical share is 100% without a repeated house pair. The ledger retains these exceptions explicitly.
- Measured 24 rendered objects in world units: fifteen human/dwarf/elf buildings, all three castles and six furniture/work props. Building heights are 4.20–8.85 units, castles 11.80, bench 0.48, table 1.07, well 2.25 and barrel 0.82. Full three-axis bounds are retained; the door-width field records the established one-tile navigation opening, not a separate mesh aperture measurement.
- Of 3,954 decorated-object placements, 3,937 (99.57%) have finite support heights with no more than 0.25 units of terrain variation across their center and footprint corners. Seventeen sloped placements remain in the ledger. This measures support anchors, not every rendered contact vertex; it does not certify absence of every buried or floating mesh.
- Of 680 room contexts, 654 (96.18%) contain furnishings whose placement reason, anchor and allowed room usage agree. This is semantic furnishing coverage, not a timed human recognition study.
- All 28,979 distance-weighted samples of the final `organicRoads` network have visible road influence or a bridge deck. The retired axis-aligned `realmRoads` precursor was excluded because its straight chords have been replaced by the final curved routes.
- Final shelter/quarry regression: 35/35 footprints are level and all five access ramps are preserved. The separate final footing contact sheet supersedes earlier quarry/camp views for terrain support.

## Performance

Values are median instrumented CPU frame/submission times in milliseconds, before → after. They are not GPU FPS. Original raw samples, including cold setup and orbit spikes, are retained in `environment-review/performance.json`.

| Scene | CPU median before → after | Final-frame draw submissions before → after |
|---|---:|---:|
| Briar Haven | 28.03 → 30.20 | 147 → 147 |
| Ironcrown | 132.29 → 20.35 | 198 → 142 |
| Dense forest | 75.76 → 14.87 | 53 → 53 |
| Crownreach | 143.62 → 35.18 | 167 → 167 |
| Freight Mine | 17.92 → 17.14 | 132 → 132 |
| Zoomed-out world | 37.39 → 38.84 | 237 → 231 |
| 844×390 landscape | 18.59 → 19.11 | 112 → 87 |
| Pinewatch Mine | 6.66 → 6.29 | 273 → 89 |

Host load and cache behavior affect these samples; large apparent improvements are not advertised as device speedups. No measured median increased by 15%. A final run after the footing repair is retained in `environment-review/final-performance.json`: Briar Haven 27.03 ms, Ironcrown 19.85, dense forest 17.16, Crownreach 36.04, Freight 17.35, Pinewatch 5.25, wide world 37.33 and landscape 15.75. These also remain below the baseline plus 15% limit. Removing yaw-dependent architecture cache variants reduces repeated rebuilding. Pinewatch submits more vertices (414,948 → 626,532) but fewer draws and did not increase measured CPU time. Real GPU/mobile profiling remains required.

## Tests and regressions

149 relevant test files were run. 148 initially passed; the built-assets check failed because the old generated Worker predated the edits. After rebuilding, that test passed: all 96 startup resources parse/load, cache URLs match and conditional/partial responses work. Targeted final retests cover environment architecture, all 188 settlement buildings, civil settlements/castles, walking/doors, desktop rendering, mobile camera inputs, terrain/bridge travel and world style. Exact results and earlier failure history remain in `ENVIRONMENT-TEST-RESULTS.json`.

Additional environment regression checks cover 20 buildings × 10 roof cycles, all three castles at four camera headings, identical wall/collision tile coverage, preserved towers during room entry, no camera mutation of save/shared fields, assisted-pitch screen picking and finite Fairy Lands terrain buffers.

The final source also passes `environment-architecture`, `environment-footings`, `terrain-travel`, `prop-placement` and `built-assets`; exact results are in `environment-review/final-release-tests.json`. The final build exports the same 4,737 shared entities with no generated Worker/catalog changes.

The full suite includes quests, tutorials and cooking, banking, combat, Spirits, staff idle, equipment, accounts/saves, trade/follow/drop behavior, shared trees/stumps/regrowth, shared doors, day/night, teleports and replicated actions. Two authenticated local-client tests pass. The local 39-client test completed 120 rounds over 30 seconds, 6,474 requests, zero late rounds, 4,641 peer checks and 39 saved characters. This uses local in-memory SQLite and **does not certify live hosted D1 capacity**.

Discovered/fixed: automatic structural disappearance; proximity-only roof removal; stale roof-height cache on exit; software roof underside artifacts; incorrect capture locations/scene fixtures; malformed Fairy Lands terrain data; stale generated release bundle. Rejected an initial thin-boulder mine treatment after visual review and replaced it with broader authored boulders and masonry retaining faces. No new game-console errors were identified in the reviewed browser logs; browser-extension metadata errors were separate. No server protocol, authoritative catalog, account or save reset is part of this change.

## Strict acceptance A–Q

PASS is limited to the cited evidence. FAIL includes incomplete required verification; it does not necessarily mean a gameplay defect was observed.

| Test | Result | Evidence / remaining requirement |
|---|---|---|
| A Castle completeness | PASS | All three castles rendered at six required views; authored major walls/towers/gates; exact wall coverage; invariant exterior geometry on orbit/room entry. |
| B Settlement readability | FAIL | All 13 centers reviewed and navigation tests pass; timed five-second primary-entrance review and percentage-based clearance/clutter measurements were not completed for every settlement. |
| C Architectural variety | PASS | Counted final house profiles: maximum identical share 12.5–33.3% in all eleven settlements with multiple homes. The two one-home settlements have no repeated house pair; their 100% mathematical share is explicitly retained. |
| D Simple geometry | FAIL | Major castle walls/towers, bridges, school landmark, fences/wells and mine faces upgraded; category ledger exists, but the requested full-world 90% primitive replacement accounting is not certified. |
| E Scale consistency | PASS | Measured 24 production render bounds across the two packs and intentional custom forms; proportions are consistent with the existing player/world scale. Door, furniture access and route regressions pass. Exact bounds and the navigation-opening scope are retained in the measurement ledger. |
| F Floating/buried objects | FAIL | Enumerated 3,954 placement footprints; 99.57% meet the support-height tolerance, and all 35 repaired shelter/quarry footprints pass. This anchor sample does not establish the required rendered-mesh contact percentage. |
| G Path/entrance clearance | PASS | Unchanged authoritative collision, civil/quest navigation, doors, bridge travel and resource audits pass. |
| H Road continuity | PASS | All seven bridges reviewed; 28,979/28,979 distance-weighted samples on the final curved route network retain visible road influence or bridge deck. Navigation and bridge travel regressions pass. |
| I Prop density | FAIL | Appropriate semantic furnishings cover 654/680 room contexts (96.18%), with retained protected circulation. This does not establish the requested human functional-space recognition percentage. |
| J Camera occlusion | FAIL | Structural invariance, bounded pitch, projection/picking and roof restore tests pass; complete continuous 360-degree visual traversal at every specified sample and smooth browser/mobile tracking are not certified. |
| K Roof/interior | PASS | Twenty buildings × ten code-level cycles, ten rendered interior positions, room-specific roof state, preserved walls and local-only state. Not ten manual browser traversal cycles per building. |
| L Multiplayer consistency | PASS | Two authenticated local-client integration and shared-state regression tests; rendering state remains local. Not a simultaneous hosted visual walkthrough. |
| M Landmark recognition | PASS | Distinct school roof tower, three authored castle silhouettes/tower families and visible mine/cave entrances in retained captures. |
| N Visual repetition | PASS | Reviewed major-world sample has varied building roofs/trees and no new repeated decorative spam; long modular wall runs are intentional boundaries. |
| O Performance | FAIL | Eight local CPU/submission comparisons pass the approximate 15% median target; physical-phone/GPU performance and sustained hosted load remain unverified. |
| P Collision failure | PASS | Navigation/door/bridge/quest regressions pass; new visual modules fitted to unchanged authoritative collision. |
| Q Visual defect limit | FAIL | No new critical defect established by completed tests, but incomplete continuous camera/entrance/scale review prevents certifying the full requested defect threshold. |

Ten of seventeen strict acceptance entries pass. No MINOR defect list is asserted as exhaustive. The unresolved entries above are verification gaps, not invented cosmetic defect locations. Full environment acceptance remains open until those checks are completed. Physical-device performance, sustained hosted 39-player capacity and the older asset permission gaps are separate outstanding limitations; this client environment release does not certify them.

## Publication

The repaired source is intended for the connected private GitHub repository on main and the existing public Veldren site. Exact source commit, GitHub commit and deployment status are reported with the delivery, rather than embedding an unverified future hash here. Player accounts and saves are preserved. Client-only rendering/terrain-color changes do not require a maintenance disconnect; generated authoritative catalogs were unchanged by the build.

Automatic approval review initially blocked GitHub upload. The owner then explicitly authorized the upload in this conversation on 17 September 2026. The destination is the verified private `mxpsrs/emberfall-game` repository, branch `main`; the normal synchronization flow is authorized. Exact completion is reported with delivery after the remote tree is verified.
