# Phase 2 asset and rendering pipeline

Status: complete. Final acceptance and reproduction commands are in
[`PHASE2-ASSET-RENDERING-ACCEPTANCE-2026-09-27.md`](../docs/PHASE2-ASSET-RENDERING-ACCEPTANCE-2026-09-27.md).
The sections below preserve implementation history; their intermediate pending
gates are superseded by the final acceptance. Phase 1 remains accepted at
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

## Registry checkpoint's open gates (subsequently closed)

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
- Full generated-world regression against the rebuilt WASM: pass, preserving
  all Phase 1 ownership category totals, original geometry and catalog IDs,
  hierarchy propagation and exact 14,861,865-byte save/unload/load. Output is
  retained in `docs/qa/phase2-asset-rendering/world-regression.txt`.
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

## Native texture delivery profiles — 27 September 2026

C++ now defines and selects three explicit profiles: `browser-mobile` (256px,
8x anisotropy), `browser` (512px, 16x), and `desktop` (8192px, 16x). The offline
native processor derives content-addressed PNGs using the existing linear-light,
alpha-coverage and normal-map processing. It validates every encoded output
against the exact processed pixels. All full-resolution sources remain intact.
Python only supplies filesystem IO, cache keys and catalog bindings.

The 845 canonical image IDs resolve to 34 unique source/usage combinations and
102 profile jobs. The two browser profiles reference 68 outputs, shared across
IDs; their unique delivery payload is 10,816,137 bytes. Desktop keeps all original
encoded bytes for this corpus. Registry commands reject unknown profiles,
unavailable usages, stale source hashes, duplicate usage definitions and
out-of-budget dimensions. Processing verifies the derived SHA256, not the source
SHA256, when a browser fetches a variant. Source hashes remain import provenance.

The build consumes an explicit browser image allowlist. This excludes only
full-resolution images that have browser replacements, retains all models and
existing game resources, and keeps the 64 MiB Worker gate. The complete build
still fails that gate at **87 MiB** (down from about 180 MiB before profiles).
Legacy packed geometry and canonical models still coexist; delivery is not yet
accepted. No hosting configuration or deployment was changed.

Verification covers all 2,535 registered selections in both actual-WASM runtime
and editor contexts, native atomic rejection tests, and all 68 distinct browser
variants in actual WASM + Filament NOOP with shared GPU handles, hash/dimension/
mip-byte checks and complete release. The existing 34-source texture tests,
six PBR binary checks and 100 unload-cycle tests remain included. Browser profile
visual quality and canonical Scene submission remain acceptance work.

## Native PBR material plans and GPU lifetime — 27 September 2026

`AssetRegistry::material_plan` now resolves canonical material records into
content-keyed Filament plans. C++ chooses the six compiled lit/unlit and
opaque/mask/blend shaders; maps factors, emissive strength, alpha cutoff,
double-sided state, normal scale and occlusion strength; resolves profile
textures; and computes column-major KHR texture-transform matrices for UV0–UV7.
Sampler/filter mappings and neutral default textures are native decisions.
Equivalent materials with different stable IDs share the same content key.

`asset-materials.js` performs IO and Filament handle marshalling from those
plans. It shares shader binaries and immutable material instances, holds native
material dependency leases, and releases instances before their textures and
shaders. Exact leases, last-user cancellation, rejected loads, allocation errors,
late completion and teardown are handled. Asset disposal now invokes dependent
resource owners in reverse registration order.

Validation: native material tests exercise all 1,548 catalog/profile plans,
content sharing, UV transforms/channels, sampler mapping, emissive strength and
invalid type/profile/channel rejection. Actual WASM + Filament NOOP tests cover
both runtime and editor, all six shader variants, 26 distinct real materials,
100 concurrent shared leases, injected instance allocation failure, cancellation,
late asynchronous completion and 30 complete unload cycles. The rebuilt WASM
passes its ABI test. NOOP validation is not graphical acceptance.

The pinned Filament 1.77 JavaScript TextureSampler exposes one shared wrap mode,
not independent S/T setters. Mixed-axis wrapping fails explicitly in the adapter;
C++ preserves both intended modes. This limitation remains open. The current
material tests cover recoverable real textures plus native defaults; one original
source image is still unavailable in this restored local workspace. It remains
present in the verified GitHub checkpoint and is not removed or replaced.

Scene-driven canonical mesh submission, animation, browser/editor visual tests,
complete reimport/asset-browser work and the 87 MiB build-size blocker remain.
This material-resource checkpoint is not Phase 2 completion and changes no live
site, production data or main branch.

## Canonical geometry resource checkpoint — 27 September 2026

The native `asset_render_plan` validates canonical float/index streams, computes
geometry bounds, derives tangent bases using the normal map's UV channel and
transform, and emits deterministic content-keyed vertex/index packets. It retains
default-scene draw bindings, exact node matrices, skeletons and animation clips.
The browser marshals these packets to Filament; the Filament SurfaceOrientation
binding packs the native tangent basis into the backend quaternion format.

`asset-meshes.js` shares vertex/index buffers and PBR materials across exact model
leases. `asset-draws.js` maps native Scene transforms to render-only parent/child
entities, shares model resources across instances, releases surplus instances,
clears on Scene changes and retires invalidated generations. Disposal removes
renderables before releasing geometry, materials and textures. Skin streams are
uploaded and retained; animated draw submission still requires the pose stage.

Verification: `make -C native render-asset-test` passes 190 real models, 326
geometry packets/draw bindings, three skeleton-bearing assets and one animation
library; malformed indices, stale source identities and generations are checked.
`node tests/asset-meshes.mjs` passes actual WASM and Filament NOOP in runtime and
editor contexts: 100 shared instances, movement, deletion, Scene switch,
invalidation, allocation failure, cancellation, 20 unload cycles and teardown.
This is resource-stage verification, not graphical or full-phase acceptance.
Production frame wiring, animation, editor/reimport, delivery budget and final
visual acceptance remain in progress. No deployment or main merge occurred.

## Production frame canonical submission checkpoint

The game and editor now initialize the canonical material/model/draw owners.
Existing unchanged imported meshes carry their stable registry ID at the IO
binding boundary. The production Filament painter submits that ID and the native
Scene transform; the asset owner resolves submeshes and materials through C++.
Geometry modified by legacy procedural adapters remains explicitly on the
compatibility path. During initial asynchronous loading, the existing mesh is
displayed until the canonical draw is ready; source/model errors are surfaced.

Chromium 134 WebGL/SwiftShader renders the real Quaternius plaster wall with its
canonical PBR textures through the production painter and native geometry plan.
The screenshot was visually inspected. Page errors are empty and native/model/
material/texture disposal releases all canonical resources. Reproduce with
`node scripts/phase2-model-browser.mjs` (external Playwright is supported through
`VELDREN_PLAYWRIGHT`). Evidence is under `docs/qa/phase2-asset-rendering/canonical-*`.
Actual Filament runtime, unchanged-transform caching and registry tests also pass.

The previously unavailable source PNG is now recovered from the official free
Medieval Village pack and verified against its original SHA256. All 102 texture
profile outputs are available without changing image pixels or profile settings.
The full build still fails the unchanged 64 MiB gate at approximately 88 MiB;
final delivery, editor/reimport and overall acceptance are not complete.

## Delivery gate closed (2026-09-27)

The Worker now fits the existing 64 MiB limit at 63.3 MiB. Content-addressed
Brotli storage and ASCII basE91 embedding preserve response bytes. Source-only
sheets, replaced KTX2 files, shader source and unreferenced canonical model
versions remain in Git but do not ship in the browser module. All 190 canonical
models and both browser texture profiles remain available; no quality profile
was reduced. The build verifies every embedding roundtrip and repairs corrupt
compression cache entries. HTTP bodies remain ordinary bytes, with hosting
responsible for transport compression and audio byte ranges retained.

`node tests/asset-delivery.mjs` and `node tests/built-assets.mjs` pass, including
all canonical models/images, 123 startup resources, immutable versions, licensed
audio hashes and partial responses. The delivery report is generated at
`.qa/asset-delivery.json`. Full graphical/editor acceptance is still in progress.

## Reimport, LOD and rig resource checkpoint (2026-09-27)

`python3 scripts/reimport-asset.py STABLE_ID SOURCE [--aliases FILE]` runs the
native importer and validator, archives the original source and hash-checked
external dependencies, generates immutable canonical payloads and derived
texture profiles, then atomically publishes the runtime manifest last. Failed
imports restore prior manifests. Repeating an import is deterministic; changing
an external buffer changes the payload/provenance address even when the GLTF
JSON hash stays the same. Unnamed GLTF objects receive stable fallback labels.
The disposable-checkout reimport test exercises each of these cases.

Runtime/editor registry refresh validates before replacement, preserves stable
Scene IDs and live model roots, retires stale model generations, and notifies
catalog consumers. Invalid definitions leave the live registry intact. Removing
an actively leased root remains an explicit error; release that consumer before
removing its identity. This protects Scene and material users during reimport.

Native LOD validation supports ordered LOD0/1/2 distance thresholds and model
references. Alternative levels participate in dependency/reverse invalidation.
Production draws use native selection when a model declares alternate levels;
current imported content retains authored LOD0. Models load on demand, share
in-flight work, release off-screen resources after a short grace period, and
clear immediately when switching Scene. This is a streaming foundation, not an
authoring pass that invents lower-detail art.

Native render plans now emit validated bind-pose bone matrices. Filament receives
joint/weight streams and uploads matrices after renderable construction, avoiding
the 1.77 JavaScript builder's temporary-matrix-pointer lifetime bug. Missing bone
references, negative weights and invalid weight sums fail before GPU submission.
Skeleton names, inverse binds and all 43 UAL1 clips remain unchanged in canonical
data; existing animated gameplay controllers retain their Phase 1 behavior.

Native tests cover all 190 catalog models, 326 geometry/draw packets, three
skeleton-bearing assets, deterministic packets, invalid indices/bones/weights,
and generation changes. Actual Filament tests cover skinned construction,
100 shared model instances, failure/cancellation, Scene switching and complete
release. Registry reload/LOD tests pass in both real-WASM contexts. The original
source corpus passes all 207 files, including both 43-clip UAL1 variants.

## Canonical editor catalog and previews (2026-09-27)

The asset browser lists all 190 canonical models alongside compatible existing
assets and shows stable identity, bounds, generation, source provenance and
validation. Canonical building-part cards receive the same metadata. Imported
assets without an existing placement controller remain available for inspection;
they do not silently enter an incompatible gameplay workflow.

`editor/asset-preview.js` owns one offscreen Filament engine. It marshals the same
native render/material/profile packets as production, renders actual textures,
and releases model/material/texture leases after copying pixels. Inspector work
is coalesced by request generation, thumbnail requests are serialized, and the
UI cache remains capped at 180 small canvases. Reload Assets fetches an unversioned
fresh registry, updates catalog metadata and invalidates cached thumbnails.
Legacy/procedural assets retain their established CPU preview path.

`phase2-editor-assets-browser.mjs` passes in actual Chromium WebGL: plaster wall,
round-tile roof and bind-pose avatar visibly render with textured geometry; each
capture leaves zero model/texture GPU bytes. Teardown destroys the preview
engine and its objects. Screenshots and measurements are checked in under
`docs/qa/phase2-asset-rendering/editor-*`. The complete built game/editor workflow
is the final acceptance gate still running at this checkpoint.

## Final Phase 2 acceptance (2026-09-27)

All scoped foundation gates passed. The final built editor renders its world and
canonical inspector simultaneously, refreshes asset definitions through the
unversioned manifest, and produces a new visible preview after reload. The final
world crop contains 35,727 distinct colors, with zero page errors and zero editor
player-controller requests. The complete built game/editor workflow also passes
startup, transform, duplicate/delete, save and a fresh editor boot retaining the
saved native entity. These checks use a disposable local database/account.

Canonical materials now disable Filament's default UV flip, matching native image
rows across all imported UV channels. Both renderers select their engine's GL
context before `beginFrame` and again at submission: frame setup can flush commands,
and Filament's convenience binding bypasses its JavaScript context selector.
Preview capture waits for successful frames, preserves aspect ratio, cancels stale
generations and releases its asset leases. Actual two-engine WebGL checks cover
wall, roof and bind-pose avatar previews while the other engine continues drawing.

The final Worker is 66,380,266 bytes (63.3 MiB), below the unchanged 64 MiB gate,
with 462 assets. Delivery verifies canonical payloads, the current native WASM,
all six current material binaries, editor source versions, 123 startup resources
and licensed audio/ranges. Native, texture/material/model lifecycle, reimport,
LOD, animation compatibility, mobile-sized renderer and full generated-world
regressions pass. Evidence and limitations are recorded in the linked report and
`docs/qa/phase2-asset-rendering/`. No Phase 3, deployment or main merge is included.
