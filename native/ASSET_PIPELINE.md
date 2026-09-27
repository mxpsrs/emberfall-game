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

Remaining: canonical model/material submission from Scene to Filament (the
world still uses packed geometry adapters), mesh/material GPU ownership,
browser/desktop derived variants and delivery budgets, complete reimport,
editor asset browser and bounded thumbnail generation, animation integration,
final full-world visual/stress checks, fresh build and affected regressions.
Importer, model lifetime and texture-stage evidence is recorded below. Phase 2
is not complete.

## Canonical source importer checkpoint

`asset_import.cpp` implements GLTF/GLB 2.0 decoding in C++. `asset-import` supplies filesystem IO with source-root containment. Canonical output retains nodes, parent/child hierarchy, exact local/world matrices, meshes and primitives, indexed typed streams, UV channels, colors, joints/weights, morph targets, materials, image definitions, skins/inverse binds and animation channels/interpolation. Triangle strips/fans are converted with winding preserved. Missing normals are generated and reported. Accessor strides, normalized components, sparse accessors and matrix packing are decoded explicitly. Bounds and spheres are computed during import, including transformed default-scene model bounds.

Validation rejects malformed containers, unsupported required extensions, out-of-range storage/indices, missing dependencies/UVs, invalid material references, zero normals/geometry, malformed skeleton references and animation shapes/times. PNG chunk CRC/header checks and JPEG structure/dimensions run before output. Full pixel decode remains a texture-stage responsibility. Unsupported point/line primitives are classified as recoverable exclusions; a mesh with no triangle primitives fails. Required Draco, Meshopt and BasisU extensions currently fail explicitly. Tangents are preserved and checked; missing normal-map tangent generation remains pending in the material pipeline.

Real corpus: the complete 176-model Quaternius Medieval Village Standard kit, both full-body humanoids and 16 hair/eyebrow sources, both UAL1 files (43 clips each), and all 11 checked-in Kenney GLBs. The checked-in derived catalog includes all 176 modular pieces, two humanoids, the non-root-motion UAL1 library, and 11 vegetation/prop GLBs (190 models). Full original input provenance and explicit character URI aliases live in `art/external/quaternius`.

The native importer emits the model's registry definitions and dependency graph. Build-time Python orchestrates IO and splits embedded image bytes into content-addressed files; it does not decode geometry or decide PBR semantics. Shared image bytes are written once. Image records currently retain source-model identities; GPU content/variant sharing is a later checkpoint. `build-asset-registry.py` merges canonical definitions over the prior packed catalog while retaining remaining packed compatibility records.

Runtime/editor `VeldrenAssets.loadModel(id)` resolves a canonical model via its registry record, shares an in-flight fetch and immutable decoded document across users, and acquires the native dependency closure. `releaseModel(id)` drops the CPU document and unloads unleased metadata after the final user. This is exercised against real derived modular geometry in both runtime and editor WASM tests. Current world rendering still uses packed geometry adapters; the Scene-to-Filament migration has not yet been accepted.

Recovery checkpoint preceding this work: `501ac03c68a818a952dd7d5b8bd9e39ca58734bb` (asset registry).

## Asynchronous model lifetime checkpoint — 27 September 2026

Continued from remote checkpoint `5af8892e323efdf7616c22e35df38f6d58bc7804`.
The browser IO bridge now exposes `leaseModel(id)` with a `ready` promise and
an idempotent `release()` bound to that exact request. The existing
`loadModel`/`releaseModel` interface remains available. Registry identity,
dependency counts and invalidation generations remain owned by C++.

Concurrent users share a single fetch and immutable document. Dependency
invalidation retires the cached generation; a new consumer fetches a fresh
document, while existing owners can finish with their previous immutable one.
Last release cancels pending IO. Failure, cancellation and retry release only
their own leases. Teardown cancels pending requests, and an epoch guard prevents
late fetch/JSON results or initialization failures from touching a new registry.
This closes stale-cache and teardown races before GPU resources are attached.

Verification on the actual checked-in WASM, in both runtime and editor modes:

- `node tests/asset-lifecycle.mjs`: shared fetches, exact/double release,
  dependency invalidation, cancel/reacquire, 100 concurrent failures, late
  network/JSON completion, teardown/reinitialize and 1,000 balanced stress leases.
- `node tests/asset-registry.mjs`: existing catalog, native graph and lease checks.
- `node tests/native-runtime.mjs` and `node tests/native-editor-runtime.mjs`: pass.
- `make -C native asset-test texture-test`: fresh native binaries pass, including
  all 34 real texture images in the recovered checkpoint.

The prior recovery checkpoint's checked-in WASM does not yet export its new
texture functions. Rebuilding that binary and compiling the material variants
remain required before the texture stage can be used in the browser. No GPU
lifecycle, graphical acceptance or overall Phase 2 completion is claimed here.
Nothing was deployed or merged into main.

## Native texture / Filament checkpoint — 27 September 2026

The production world and terrain atlases now use Veldren's C++ image decoder,
linear-light mip generation and texture storage. Browser startup fetches encoded
PNG bytes and waits for native initialization. The prior JavaScript mip
implementation is removed. Filament receives explicit RGBA mip uploads; its PNG
decoder remains unused. Existing mobile/desktop atlas sizes, anisotropic
filtering and shadow settings are retained.

The C ABI shares decoded pixels by source SHA256 and normalized processing
settings. Color space, normal-map processing, dimensions and alpha coverage are
part of the identity. An acquisition increments its native lease; the last
release frees the mip chain. Reacquisition gets a new monotonically allocated
handle, preventing stale references from aliasing later resources. A corrupted
source hash is checked even when matching pixels are already cached.

`asset-textures.js` maps native texture handles to one Filament texture per
engine. Repeated acquisitions share that GPU allocation; partial release keeps
it alive, last release destroys it, and registry teardown releases the entire
pool. Upload failure unwinds both the native lease and Filament descriptors.
`processTexture` only marshals encoded bytes, native metadata and pixel copies
between the two WASM heaps. Texture policy and mip decisions remain in C++.

The rebuilt `dist/native/veldren-core.wasm` includes the texture exports missing
from checkpoint `5af8892`. All six pinned Filament 1.77 PBR material binaries
(lit/unlit, opaque/masked/blended) are compiled and load successfully. The
canonical PBR model-binding stage remains unfinished; the atlases still use
the established world and terrain materials.

Verification:

- Native texture test: 34 real PNGs, 100 shared acquisitions per image,
  independent color/size variants, release/reacquire, malformed inputs and hashes.
- Fresh Emscripten 3.1.6 WASM build and standalone ABI test: pass.
- `tests/asset-textures.mjs`: actual WASM plus Filament 1.77 NOOP, both contexts,
  all 34 images and six material binaries, shared GPU handles, variants, upload
  failure cleanup, 100 repeated unload cycles and final teardown: pass.
- Model registry/lifecycle tests, native runtime/editor bridges, editor context,
  renderer contract, character parity and building components: pass.
- Filament runtime and 256-entity transform regression: pass; stationary
  geometry resubmits no transforms, one edited matrix updates one entity.
- `scripts/phase2-texture-browser.mjs`: actual Chromium 134 WebGL/SwiftShader
  renders the native-processed terrain texture, two resident textures totaling
  27,962,024 GPU bytes, no page errors, zero texture handles/bytes after teardown.
  Screenshot visually inspected. This is a focused local rendering check,
  not full `/play`/`/editor/` or physical mobile-device acceptance.

Source delivery now preserves canonical PNG bytes rather than converting them
to WebP and breaking native decoding/content hashes. A built-response regression
checks byte and hash parity for every canonical image once the bundle can build.

**Open build gate:** the fresh full production build fails the existing 64 MiB
Worker limit at approximately 180 MiB. Original canonical PNG sources alone
occupy about 80 MiB. The limit was not raised and no assets were silently dropped.
Browser-specific derived texture variants and an appropriate delivery selection
must resolve this before the full built-asset audit and Phase 2 acceptance.
The original sources remain available for native/high-resolution derivation.

Next: implement the browser/desktop texture variant pipeline and restore the
normal build gate, then canonical model/material submission, Scene-driven GPU
sharing/lifetime, reimport/editor integration and final acceptance. Nothing was
published, deployed or merged into main; no account or player data was changed.
