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
