# Renderer and engine upgrade — 2026-09-30

Built on the actual published v235 source, `8f82a643bd45ff3155158a3884b7d2a246b0ef47`, from the Site source repository. The older GitHub PR #4 is not this production baseline and remains unmerged. PR #1 is untouched. The superseded Phase 1 draft PR #3 was separately closed after checking ancestry and review metadata.

## Changes

- Additive ABI 19 frame exports replace JSON transfer of visible draws and compatibility LOD batches with reusable packed buffers. The frame header is 33 little-endian u32 words (132 bytes), each draw is 84 bytes, and the symbol dictionary changes only when new strings appear. The existing native partition, visibility, LOD hysteresis, canonical Scene ownership, JSON fallback and GPU character animation remain in place.
- Native Scene payload paging compacts distant component/metadata maps into native-owned serialized pages. IDs, transforms, hierarchy and component indices remain resident. Reads and edits restore payloads; saves include all pages. Processing is bounded to 64 candidates per frame with cell hysteresis and visible-entity pinning. This reduces map allocations; it does not remove the initial full world download or promise a measured reduction in WASM heap capacity.
- Generate distant geometry for 50 compatibility scenery models and 19 canonical PBR roofs, totaling 128 generated levels. Original near geometry and collision remain unchanged. Canonical LODs retain materials, textures, transforms and dependencies. Reported aggregate triangle counts: scenery 97,104 near to 39,476 far; roofs 59,140 near to 40,309 far.
- Terrain uses lit Filament materials; water gains filtered normal waves and a smoother surface response. Directional sky fill, indoor sun attenuation, subtle distant outdoor fog and desktop 2048-pixel shadows improve lighting. Mobile retains its 1024-pixel single cascade shadow allocation. Terrain shadow reception remains disabled because camera-dependent cascade bands are unresolved.
- Static asset storage shares and compresses repeated mesh streams. Responses reconstruct the original asset bytes and preserve their hashes, URLs, ETags and version rejection. The built Worker is 65,645,883 bytes, below the 64 MiB hosting limit. Account APIs, database schemas, player saves and migrations are unchanged.

## Verification

Passed native core, Scene, editor history, partition, visibility, LOD, residency, streaming and new payload paging tests. Actual compiled WASM passes runtime, packed transfer, heap growth, JSON parity, editor save/undo and zero warm-frame JSON parsing tests. Filament resource, animation, worker preparation, mesh lifetime and streaming cancellation tests pass.

`tests/lod-assets.mjs` checks native PBR import acceptance, finite streams, valid indices, reduced triangles, shared texture/material references and unchanged near geometry. `tests/model-stream-storage.mjs` and `tests/packed-asset-delivery.mjs` check exact reconstruction, concurrent delivery, Brotli/identity, HEAD, ETags, stale versions and the Worker size limit. Prebuilt world loading, player progress, editor transform/save reload, animation smoothing and render hot-path tests pass.

Chromium 151 WebGL acceptance with SwiftShader passes a canonical textured PBR wall, native geometry/material transfer and complete GPU resource teardown. The full built Worker passes populated editor, dense settlement, wilderness and ordinary gameplay views at 844×390 with no page errors; screenshots were inspected. Wilderness diagnostics show 8,771 compacted payloads containing 4,486,687 serialized bytes. Browser tests use isolated local accounts and storage, never production character data.

In a 408-draw WASM transfer fixture, median warm transfer was approximately 6.92 ms through JSON versus 1.78 ms packed. This is a transfer result, not overall FPS. A short full-world Filament NOOP comparison did not establish an overall frame improvement (about 187 ms baseline versus 190 ms upgrade median); terrain height/road grading remains a substantial CPU cost. SwiftShader and NOOP results do not certify iPhone/Samsung/PC hardware FPS or 39-player hosted capacity.

## Reproduction

Use Emscripten 4.0.10 for `make -C native wasm`; browser and worker WASI hosts supply `fd_close` returning BADF because no filesystem descriptors are provided. Compile terrain with Filament 1.77 `matc -p mobile -a opengl -l1 -Os`. `npm run build` regenerates texture variants, LODs, registry and the cooked world before packing the Worker.

Run `make -C native test editor-test world-performance-test world-visibility-test world-lod-test world-residency-test world-streaming-test world-payload-test wasm-test`, `npm run filament:verify`, and the targeted JavaScript tests named above. Browser harnesses accept `VELDREN_PLAYWRIGHT` and `VELDREN_CHROMIUM`; `scripts/phase4-performance-browser.mjs` supports mobile and selected viewpoint environment flags.

Publishing is a compatible client/static delivery update. Preserve the public audience, all accounts and characters, and the existing editor saves. Do not rerun reset migrations or interrupt players for this update.
