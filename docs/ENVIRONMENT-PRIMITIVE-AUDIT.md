# Environment primitive category audit

Baseline: 907e55149f765ac4acbc1a11ea75198df584ebc8. This is an inventory and work ledger, not an acceptance certificate.

The bundled mesh inventory records 108 static meshes (104 before restoration). The pinned KayKit source catalog records the original pack's additional modules; selected missing modules are restored from that same CC0 pack, not from a new pack. Existing Quaternius modular walls, doors, windows, rocks, trees, furniture and work props remain available. Whole miniature buildings cannot replace enterable rooms without reconciling doors and collision.

| Active geometry | Classification | Implemented treatment / rationale |
|---|---|---|
| Civil castle curtain walls and settlement walls | REPLACE | Authored masonry modules fitted to existing solid tiles |
| Civil castle corner towers and military watchtowers | REPLACE | Existing KayKit tower family |
| Castle gate frame | REBUILD | Authored stone modules around existing usable doorway; preserve animated leaf |
| Great hall upper shell | REBUILD | Modular stone walls, windows and authored roof sections |
| Magic School and civic exteriors | REBUILD | Existing modular walls remain; distinct roof and architectural details |
| Enterable house walls, doors and windows | KEEP — INTENTIONAL | Already Quaternius authored meshes; remove camera-dependent replacement with waist-high boxes |
| Roof surfaces and awnings | KEEP / REBUILD | Castle roofs use authored tiled meshes; regional homes mix authored tiles, fitted hips/curves and stone workshop terraces. Cloth awnings remain intentional planes |
| Bridges | REPLACE | Existing KayKit bridge with deck matched to current walking surface |
| Cave mouths | KEEP — INTENTIONAL | Existing authored boulder outcrops and real clearance; dark tunnel plane is intentional |
| Lair walls | KEEP — INTENTIONAL | Existing rock/masonry meshes; remove camera-dependent shrinking |
| Interior floors, terrain, paths, water | KEEP — INTENTIONAL | Continuous traversable surfaces and terrain geometry |
| Collision, interaction, triggers | HIDE / TECHNICAL | Preserve simple invisible collision and shared IDs |
| Quarry crane and cut-stone stock | KEEP — INTENTIONAL | Timber beam structure and quarried rectangular stone are appropriate forms |
| Stairs | KEEP — INTENTIONAL | Fitted treads match existing traversable ramps and landing heights; no suitable installed full staircase replaced the established layout |
| Farm fences and courtyard wells | REPLACE where procedural | Existing authored fence/well modules |
| Custom Spirit symbols, banners and civic emblems | KEEP — INTENTIONAL | Deliberate Veldren forms; no debug materials |

No asset is declared commercially verified merely because it is present. Newly restored KayKit modules use the already-recorded pinned source and bundled CC0 license. Earlier unrelated provenance gaps remain separate.

Ordinary mine faces now combine authored boulder groups and Quaternius masonry retaining faces. Timber braces remain structural beams. Detailed acceptance gaps are in ENVIRONMENT-PASS-REPORT.md; this ledger does not count every primitive instance.
