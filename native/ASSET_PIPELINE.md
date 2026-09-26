# Phase 2 asset and rendering pipeline

Status: in progress. Phase 1 remains accepted at
`f49ef4896b910a57bfc3dbd56948fcebca830c30`. Work branch:
`phase2-asset-rendering-wip`, created and independently verified at that exact
commit before implementation. Nothing is deployed or merged into main.

## Implemented registry checkpoint

`veldren::AssetRegistry` owns persistent asset definitions, dependency and reverse
indexes, transactional manifest validation, revision/generation state, and
transient dependency leases. It compiles into the existing C++/WASM core and the
native CMake library. Asset registry exports extend the existing ABI without
changing Phase 1 Scene or gameplay behavior. The browser bridge performs IO and
marshalling; it does not implement registry/dependency decisions.

Stable existing IDs (`briar:*`, `rebuilt:*`, `creature:*`) remain valid. Derived
mesh/collision/skeleton/clip IDs extend their owning model identity. Identity is
independent of source hashes, which change on reimport. Source paths are import
metadata, not Scene references. Native records retain names, types, source and
derived paths, SHA256 hashes, import settings, dependencies, bounds, validation
metadata and quality-variant fields. Runtime users, load state and generations
are excluded from the exported persistent registry document.

The initial manifest contains 754 actual Veldren records: 172 models, 196 meshes,
196 collision bounds, 18 skeletons, 130 clips, 10 textures, two compatibility
materials, 29 audio records and one prefab. The build-time compatibility exporter
reads existing packed libraries. These records explicitly report legacy import
status; their presence is not canonical GLTF validation or PBR completion.

Both runtime and editor initialize the same registry from the same manifest.
Modular building resolution reads canonical model identities through the native
registry and retrieves the existing decoded payload. Immutable browser metadata
snapshots are cached; 1,000 repeated model reads issue no additional WASM commands
or registry scans. Procedural captured/linked geometry remains a separate
compatibility path pending renderer synchronization.

A root acquisition holds each transitive dependency once even across diamond
edges. Multiple instances share dependency records. Release rejects unbalanced
calls; last-use release marks loaded records pending release. Load completion
requires a lease; unloading leased assets is rejected. This is native lifecycle
accounting, not yet a claim of Filament GPU resource sharing. Source invalidation
increments generations through the reverse graph. Manifest replacement validates
duplicates, missing dependencies, cycles, IDs, hashes and bounds before changing
live state, and preserves active roots.

## Checkpoint verification

- `make -C native asset-test wasm wasm-test`: passed with a fresh WASM build.
- `node tests/asset-registry.mjs`: passed in runtime and editor contexts using
  the actual WASM module and a real Quaternius wall from the current catalog.
- `node tests/native-runtime.mjs`: passed.
- `node tests/native-editor-runtime.mjs`: passed.
- `node tests/world-building-components.cjs`: passed.
- `node tests/editor-context.cjs`: passed.

Registry checks cover 100 shared dependency leases, release, invalidation,
transactional rejection, native graph roundtrip, cached model reads and teardown.

## Acceptance still outstanding

Canonical GLTF/GLB import; real full-kit validation; canonical PBR materials and
texture processing; Scene/Filament synchronization; GPU ownership and sharing;
resource stress tests; browser/desktop derived variants; reimport; editor asset
browser and bounded thumbnail generation; final fresh builds, visual checks and
affected regressions. Phase 2 is not complete at this checkpoint.

## Canonical source importer checkpoint

`asset_import.cpp` implements GLTF/GLB 2.0 decoding in C++. `asset-import` supplies filesystem IO with source-root containment. Canonical output retains nodes, parent/child hierarchy, exact local/world matrices, meshes and primitives, indexed typed streams, UV channels, colors, joints/weights, morph targets, materials, image definitions, skins/inverse binds and animation channels/interpolation. Triangle strips/fans are converted with winding preserved. Missing normals are generated and reported. Accessor strides, normalized components, sparse accessors and matrix packing are decoded explicitly. Bounds and spheres are computed during import, including transformed default-scene model bounds.

Validation rejects malformed containers, unsupported required extensions, out-of-range storage/indices, missing dependencies/UVs, invalid material references, zero normals/geometry, malformed skeleton references and animation shapes/times. PNG chunk CRC/header checks and JPEG structure/dimensions run before output. Full pixel decode remains a texture-stage responsibility. Unsupported point/line primitives are classified as recoverable exclusions; a mesh with no triangle primitives fails. Required Draco, Meshopt and BasisU extensions currently fail explicitly. Tangents are preserved and checked; missing normal-map tangent generation remains pending in the material pipeline.

Real corpus: the complete 176-model Quaternius Medieval Village Standard kit, both full-body humanoids and 16 hair/eyebrow sources, both UAL1 files (43 clips each), and all 11 checked-in Kenney GLBs. The checked-in derived catalog includes all 176 modular pieces, two humanoids, the non-root-motion UAL1 library, and 11 vegetation/prop GLBs (190 models). Full original input provenance and explicit character URI aliases live in `art/external/quaternius`.

The native importer emits the model's registry definitions and dependency graph. Build-time Python orchestrates IO and splits embedded image bytes into content-addressed files; it does not decode geometry or decide PBR semantics. Shared image bytes are written once. Image records currently retain source-model identities; GPU content/variant sharing is a later checkpoint. `build-asset-registry.py` merges canonical definitions over the prior packed catalog while retaining remaining packed compatibility records.

Runtime/editor `VeldrenAssets.loadModel(id)` resolves a canonical model via its registry record, shares an in-flight fetch and immutable decoded document across users, and acquires the native dependency closure. `releaseModel(id)` drops the CPU document and unloads unleased metadata after the final user. This is exercised against real derived modular geometry in both runtime and editor WASM tests. Current world rendering still uses packed geometry adapters; the Scene-to-Filament migration has not yet been accepted.

Recovery checkpoint preceding this work: `501ac03c68a818a952dd7d5b8bd9e39ca58734bb` (asset registry).
