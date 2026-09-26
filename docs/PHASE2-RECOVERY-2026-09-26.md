# Phase 2 interrupted-work recovery record

Phase 2 is **not complete**. No final acceptance commit has been made. Nothing has been deployed or merged.

## Verified remote foundations

- Accepted Phase 1 base: f49ef4896b910a57bfc3dbd56948fcebca830c30
- Phase 2 registry checkpoint: 501ac03c68a818a952dd7d5b8bd9e39ca58734bb
- Phase 2 GLTF importer checkpoint: 75e869e1683abe22c54c5dfa8765d17289ebf525
- Branch: phase2-asset-rendering-wip

The importer checkpoint contains 190 canonical model documents and 2,987 combined registry records. Focused native import tests passed for 207 actual sources: all 176 Medieval Village Standard models, 18 character/hair sources, both 43-clip UAL1 sources, and all 11 checked-in Kenney GLBs. The committed corpus report lists every source and its hash. This proves import coverage, **not visual rendering acceptance**.

Registry/native bridge tests passed in runtime and editor contexts, including 100 shared model-document leases and stable Scene asset references. World rendering still uses legacy packed geometry adapters. The new canonical GPU material/resource adapter was not completed.

## Source-only texture recovery

The Work execution environment disconnected during material integration. Repeated command requests returned HTTP 409 environment_offline, "Environment is not connected." GitHub remained accessible. This commit reconstructs the already-written source text from the active task record, preserving the tested texture processor and compiled shader source before the session ends. The exact recovered tree could not be rebuilt after the disconnect.

The C++ texture processor:
- decodes PNG/JPEG through a pinned stb_image dependency;
- validates source hashes, image dimensions, decoded storage and options;
- creates complete mip chains, including non-power-of-two edges;
- filters color maps in linear light with alpha-weighted color averaging;
- keeps data maps linear and renormalizes normal-map mip vectors;
- supports maximum dimensions and cutout alpha coverage adjustment;
- reports level sizes and approximate uncompressed GPU bytes;
- exposes explicit CPU texture allocation/data/read/destroy C ABI functions.

Before disconnect, the native texture-test Make target passed on all 34 real canonical PNG images plus focused gamma/data/normal/transparent-edge/NPOT/dimension/hash/corruption/lifetime checks. The source test is included.

A fresh native wasm Make target succeeded after replacing std::bit_cast with a portable memcpy bit cast: the installed Emscripten 3.1.6 libc++ lacks that C++20 function. The resulting WASM was not recoverable after the environment disconnected. **The tracked WASM still belongs to the importer checkpoint and does not contain the new texture exports. Rebuild before wiring the browser texture API.**

Six Filament 1.77.0 materials compiled successfully using the included source and build script: lit/unlit times opaque/masked/transparent. They retain eight selectable UV sets through packed interpolants, UV transforms, canonical PBR factors and maps. The generated binaries were not recoverable; compile them again with the official pinned Filament release. They have not been rendered or visually accepted.

## Resume

1. Fetch this branch into an available Work environment. Preserve any surviving local changes and reconcile them with the remote recovery commit; do not reset blindly, force-push, or squash checkpoints.
2. Run the texture-test and wasm native Make targets, then scripts/build-canonical-materials.py with FILAMENT_ROOT pointing to the official Filament 1.77.0 release.
3. Finish the browser marshalling of native texture buffers, canonical material resolver and Scene-to-Filament adapter. Keep canonical image bytes out of the site's PNG-to-WebP rewrite.
4. Integrate actual world/editor models, then visually validate materials, alpha, normals, hierarchy, orientation, scale and missing surfaces before the material checkpoint.
5. Complete GPU sharing/lifetime diagnostics and 100-copy/mixed-scene stress tests; quality variants, derived-cache invalidation/reimport; editor database/thumbnails; fresh native/WASM/browser and all affected regression tests.
6. Write implemented-behavior acceptance documentation and only then create the final Phase 2 acceptance commit.

Further local edits made before disconnect but not verified as a category included browser texture marshalling, desktop reuse of the common decoder and build exclusions for canonical PNG images. Reconcile surviving files or recreate these small changes. No production state was touched.
