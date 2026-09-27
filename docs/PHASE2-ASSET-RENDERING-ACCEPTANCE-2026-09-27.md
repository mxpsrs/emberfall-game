# Phase 2 — Asset & Rendering Pipeline Foundation

Status: complete; all scoped acceptance gates passed. Scope is `mxpsrs/emberfall-game`,
branch `phase2-asset-rendering-wip`, based on accepted Phase 1
`f49ef4896b910a57bfc3dbd56948fcebca830c30`.

## Delivered foundation

- C++ owns canonical registry validation, dependency/reverse graphs, stable IDs,
  generations, reference accounting, import, render packets, PBR material plans,
  image decode/mips, profile selection and LOD decisions. JavaScript performs
  browser IO, editor UI and Filament handle marshalling.
- GLTF/GLB import retains node hierarchy/transforms, submeshes, UV channels,
  vertex colors, indexed geometry, skins/inverse binds, morph data and clips.
  The checked-in corpus contains 190 canonical models; the original-source
  acceptance covers 207 files, including both 43-clip UAL1 variants.
- Native geometry/material packets feed the production Filament Scene. Shared
  GPU resources have explicit leases, cancellation, generation replacement,
  failure cleanup, Scene-switch cleanup and bounded unused-instance retention.
  Filament automatic instancing is enabled for compatible shared geometry.
- Native bind-pose matrices render rigged canonical assets. The adapter uploads
  bones after construction to avoid a confirmed Filament 1.77 JS builder lifetime
  bug. Existing gameplay animation/controllers continue through their compatible
  Phase 1 path; 173 clip records remain available across canonical/legacy data.
- Desktop/browser/mobile profiles retain 8192/512/256 maximum source dimensions,
  correct color/data-map processing, normal renormalization and complete mips.
  The browser allowlist includes both browser profiles and excludes desktop-only
  texture payloads. Shared image content produces 102 unique profile outputs.
- Reimport keeps the model's stable identity, archives source dependencies,
  emits content-addressed payloads, rebuilds profiles and publishes the runtime
  manifest last. Invalid imports roll back. Runtime/editor reload rejects invalid
  manifests atomically and retires stale generations without rewriting Scenes.
- Native LOD0/1/2 definitions have validated thresholds, dependency links and
  production distance selection. Current art keeps authored LOD0. Demand loading,
  shared pending work, cancellation and release establish the streaming boundary.
- The editor catalog exposes every canonical model, bounds, provenance,
  generation and validation state. A single preview engine uses the production
  PBR/resource path, releases GPU leases after each capture, coalesces stale
  inspector requests and retains at most 180 thumbnail canvases. Existing
  placement workflows remain available; other imported assets are inspectable.
  Reload Assets refreshes the registry and invalidates thumbnail metadata.
- The complete browser delivery fits the unchanged 64 MiB Worker limit through
  lossless Brotli/basE91 storage and explicit source-only exclusions. Every served
  canonical model/image and the native binary retain exact bytes. HTTP transport
  compression remains the host's responsibility; audio ranges still work.
- Canonical materials disable Filament's default UV flip so every imported UV
  channel agrees with the native image origin. The world and preview renderers
  explicitly execute through Filament's JavaScript context selector, allowing
  both engines to draw in the same editor. Captures wait for successful frames,
  preserve their aspect ratio and discard work invalidated by reimport.

## Acceptance evidence

| Gate | Result |
| --- | --- |
| Native C++ core, Scene and desktop tests | Pass; desktop smoke runs 512 actors / 240 frames |
| Standalone WASM ABI | Pass; ABI 19 retained |
| Native registry, dependency and transactional tests | Pass |
| Original source importer | Pass; 207 real inputs, 86 clips across two UAL1 files |
| Canonical geometry | Pass; 190 models, 326 packets/draw bindings, three skeleton-bearing assets |
| Native image processing | Pass; 34 sources, malformed/hash rejection, mips, alpha/normal/data semantics |
| Native material plans | Pass; 1,548 plans across profiles |
| Runtime/editor lifecycle | Pass; shared loads, 1,000 balanced leases, cancellation, late completion, reinitialize |
| Actual Filament resource adapters | Pass in both contexts; 100 shared model instances, 28 material resources, repeated unload and complete teardown |
| Transactional reimport | Pass in disposable checkout; rollback, stable IDs, deterministic output and external-buffer changes |
| Registry reload and LOD | Pass in both actual-WASM contexts; invalid manifests leave state unchanged |
| Texture/animation regression | Pass; appearance parity, creature actions, weighted skinning (80 GPU bone addresses, zero pixel error), picking |
| Full generated-world regression | Pass; 235 buildings, 2,312 parts, roads/lights/actors/resources/bridges/quarries/services, hierarchy and roundtrip |
| Static transform/renderer regression | Pass; 256 initial transforms, zero steady transforms, one moved transform; mobile-sized Filament pass |
| Delivery | Pass; 462 assets, 63.3 MiB module, all 123 startup resources and canonical payloads byte-verified |
| Actual WebGL model previews | Pass; plaster wall, roof and skinned avatar, visible textured pixels and zero retained asset GPU bytes |
| Built game/editor graphical workflow | Pass; startup, selection, transform/duplicate/delete, save and fresh editor reload; zero page errors and zero editor player requests |
| Final material/capture visual corrections | Pass; corrected UV origin, both engines remain visible, 35,727 world colors after registry reload; screenshot inspected |

Evidence lives in `docs/qa/phase2-asset-rendering/`. The browser tests use Chromium
with SwiftShader and a disposable local database/account. No production service,
account, character or authored production document is modified. This does not
claim physical-device/Safari testing or a graphical desktop Filament port.

## Reproduction

This acceptance used Emscripten 3.1.6 for `make -C native wasm-test` and
Filament 1.77.0. With those tools available, run:

```sh
make -C native test desktop-test desktop-smoke asset-test asset-import-test texture-test material-test render-asset-test
node tests/asset-registry.mjs
node tests/asset-lifecycle.mjs
node tests/asset-textures.mjs
node tests/asset-materials.mjs
node tests/asset-meshes.mjs
python3 tests/asset-reimport.py
node tests/asset-delivery.mjs
npm run build
node tests/built-assets.mjs
node scripts/phase2-model-browser.mjs
node scripts/phase2-editor-assets-browser.mjs
node scripts/phase2-browser-acceptance.mjs
```

The focused final inspector check runs with `VELDREN_BROWSER_ONLY=assets`. It
requires visible textured inspector and world pixels, clears the inspector before
reload to require a fresh capture, and verifies an unversioned registry request.
The browser scripts accept `VELDREN_PLAYWRIGHT` pointing to a Playwright module.
For the expanded importer corpus, run `python3 tests/asset-import.py SOURCE_ROOT`
after the licensed source-pack fetch. Reimport one existing canonical model with
`python3 scripts/reimport-asset.py STABLE_ID SOURCE [--aliases FILE]`, rebuild,
then use Reload Assets. Removing an actively leased asset identity is rejected;
release its consumer before deleting that identity. Authored Scene/collider
records are deliberately not rewritten by reimport.

Historical implementation checkpoints and ownership details are recorded in
`native/ASSET_PIPELINE.md`. No Phase 3 work, main-branch merge or deployment is
part of this acceptance.
