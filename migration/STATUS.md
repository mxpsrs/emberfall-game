# Veldren migration status: incomplete

Only mxpsrs/emberfall-game was modified. Vervesis, live services, production accounts and player saves were untouched. Baseline: 439dfaaea6e144ab9f2e8ab30304f9c34c1915b2. Branch: migration/vervesis-native-assets-2026-09-19.

## Implemented

- 869 individual adapted game GLBs: characters, creatures, fitted and authored equipment, item displays, environment pieces, legacy rigs and representative appearance presets. These contain genuine source geometry and available skinning/animation data, not replacement demonstration meshes.
- 1,297 reusable static world mesh parts and 363 glTF regions representing 9,004 scenery/building entities. Their extras retain stable links to gameplay identities.
- Deterministic snapshots of all 339 source scenes, 10,270 objects, 235 buildings, 122 data bindings and 33 source behavior references; terrain, bridge walk heights and resolved static navigation grids. This is conversion evidence, **not a Vervesis scene format or executable gameplay port**.
- 113 individual Nature/Tree authoring GLBs, original source packs, pinned KayKit acquisition, local atlas textures, 91 SVG icons, existing raster UI art, 29 audio files and license/provenance records.
- Reproducible recovery, conversion, comparison, dependency validation and branch-scoped CI. Full source originals remain separate from adapted production candidates.

## Executed checks

- Khronos validation: 2,642 recovered/authoring glTF/GLB files, zero errors. Authoring sources retain 76 warnings. Preserved original source files are reported separately: 24 Nature files produce 2,191 errors; repaired authoring derivatives pass. Original bytes remain unchanged.
- Independent geometry/topology comparison for 869 models; 424 source-renderer pose samples pass, maximum vertex displacement approximately 0.00000804 game units. CPU contact sheet visually inspected. This checks geometry/poses, not native Filament material equivalence.
- Independent world comparison: 339 scenes, 10,270 entities, 161,570 scalar fields, 239 building relationships, 8,136 terrain samples and 4,068 navigation samples; no mismatches.
- Clean-copy asset closure and static-to-gameplay identity checks pass. This is not a native packaged build.
- Authenticated two-client tests against the real worker modules and isolated in-memory SQLite pass with the full current HTML script order: server-owned combat, observer actions, gathering, teleports, doors, trade, delayed effects and authority checks.
- Baseline suite: 149 runnable scripts; initially 144 passed, with five failures. Focused rechecks pass server status after an isolated baseline build and main-story progression with a longer timeout. Three failures remain: game.cjs, render.cjs and built-assets.mjs require removed legacy PNGs. The first runner also selected 11 non-runnable HTML/JS fixtures; those unsuccessful invocations remain in the raw report and are excluded explicitly in the runnable summary.

See machine-readable reports rather than treating this summary as proof of unexecuted functionality.

## Incomplete or blocked

Phase 1 is partial: native project conventions are unavailable, some original packs cannot be fully recovered, and native material equivalence remains unverified. The 12 invalid source triangles in lair_veyr:object:6100018 (“Abandoned multi-site survey chart”) are excluded with an explicit defect report.

Phase 2 is blocked at actual integration. Current Rust/Filament manifests, schemas, SDK, supported behavior/UI/network interfaces and a runnable sample were unavailable. The accessible Vervesis archive is an older Electron/Three implementation. No unsupported format, engine, JavaScript runtime, Tauri website wrapper or native loader hook is passed off as implementation.

Phase 3 is blocked: no Vervesis launch, native gameplay regression, Windows export, native frame-time/memory measurements, cleanup verification or 39-actor rendering test was performed. Hosted capacity for 39 authenticated players remains unverified.

Read ENGINE-CONTRACT.md, VERVESIS-HANDOFF.md and README.md. The overall migration does not meet the user's final acceptance criteria.
