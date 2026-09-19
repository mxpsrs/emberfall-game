# Veldren Phase 1 Asset Audit — 2026-09-19

## Scope

This audit covers the current `mxpsrs/emberfall-game` repository and focuses on production assets, legacy visual files, runtime paths, provenance, and the new central asset pipeline.

## Key finding: no standalone 3D model files are currently present

The repository currently contains **no** `.glb`, `.gltf`, `.fbx`, or `.obj` files.

Current production model data is primarily embedded in large JavaScript libraries, including:

- `dist/assets/realms/models.js`
- `dist/assets/realms/monsters.js`
- `dist/assets/realms/approved-creatures.js`

These are registered as embedded model libraries and explicitly marked as not editor-accessible. They are a migration target for Phase 2 rather than being misrepresented as standalone model files.

## Current production runtime images retained

The following current runtime visual assets remain:

- `dist/assets/realms/atlas.png` — active realm texture atlas
- `dist/assets/realms/armor-icons.png` — active equipment/UI image
- `dist/assets/spirit-portraits.png` — active spirit UI image
- `dist/assets/landing-world.webp` — active landing-page artwork

Documentation and QA images under `docs/` were intentionally retained as source/review material. They are not runtime production assets.

## Confirmed legacy runtime sprite sheets removed

The following old sprite-sheet/rendering assets were removed after verifying they are not referenced by the current core runtime:

- `dist/assets/characters.png`
- `dist/assets/environment.png`
- `dist/assets/heroes.png`
- `dist/assets/items.png`
- `dist/assets/monsters.png`
- `dist/assets/poses.png`
- `dist/assets/spirits.png`
- `dist/assets/terrain.png`
- `dist/assets/walking.png`

These belonged to older image/sprite-driven rendering paths and should not be exposed as current Veldren production assets.

## Runtime path audit

The current `dist/` text runtime was audited for:

- absolute Windows paths
- `file://` paths
- deleted legacy PNG references
- third-party runtime asset URLs

No machine-specific filesystem paths or third-party runtime asset dependencies were found.

External URLs that remain are limited to:

- licensing/provenance references
- source attribution
- canonical Veldren site metadata

Those are intentionally retained.

## Licensing and provenance retained

Existing attribution/provenance remains in place, including:

- `dist/assets/realms/CREDITS.txt`
- `dist/assets/realms/BESTIARY-LICENSE.txt`
- `dist/assets/realms/FANTASY-PROPS-LICENSE.txt`
- `dist/assets/realms/CH0SAN-provenance.json`
- `dist/assets/realms/fantasy-outfits-provenance.json`
- `dist/assets/realms/action-motion-provenance.json`
- `dist/assets/realms/textured-trees-license.txt`

## Central asset registry

Authoritative registry:

`dist/data/asset-registry.json`

The registry uses stable asset IDs and project-relative paths. Current embedded model libraries are explicitly represented instead of being hidden in source code.

## Asset manager

Runtime manager:

`dist/asset-manager.js`

The manager provides:

- registry loading
- asset lookup by stable ID
- caching
- de-duplicated in-flight loads
- image loading
- binary/audio loading
- JSON/text loading
- embedded-library awareness
- model-loader registration hooks for future GLB/GLTF integration
- structured error reporting with asset ID, path, missing dependency, and referencing object

It is initialized from `dist/index.html` immediately after `startup.js`.

## Automated integrity check

`tests/asset-registry.mjs` validates that:

- asset IDs are unique
- paths are project-relative
- no runtime asset path is remote
- registered files exist
- removed legacy sprite sheets are not reintroduced into the registry

This check should run as part of the production build.

## Phase 2 migration boundary

Phase 1 does **not** claim that standalone model assets exist when they do not.

Phase 2 must externalize or replace the embedded production model libraries with real editor-accessible model files and convert runtime object rendering to consume those registered assets.
