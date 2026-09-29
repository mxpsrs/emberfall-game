# Quaternius source provenance

The Phase 2 corpus uses the free Standard distributions from their author:

- https://quaternius.itch.io/medieval-village-megakit (complete 176-model modular kit)
- https://quaternius.itch.io/universal-base-characters (Veldren's male/female Superhero full-body characters)
- https://quaternius.itch.io/universal-animation-library (UAL1 Standard, 43 clips)

The accompanying original licenses dedicate the assets under CC0 1.0. No engine project or engine-specific implementation is used. GLTF/GLB sources feed Veldren's C++ importer. Canonical derived files are checked in under `dist/assets/canonical`; the large original author archives are recovered with `scripts/fetch-asset-sources.py OUTPUT_DIRECTORY`. Import using `scripts/import-asset-sources.py OUTPUT_DIRECTORY` after building `native/build/asset-import`.

`import-manifest.json` records exact source/dependency hashes and derived paths/hashes. A later upstream download may differ; hash differences must trigger reimport, never reuse old derived content silently.

The original character distribution references `T_Eye_Normal_png.png` and `T_Hair_1_Normal_png.png` but supplies `T_Eye_Normal.png` and `T_Hair_1_Normal.png`. `uri-aliases.json` explicitly resolves these two packaging errors to the provided images. This metadata is passed only for that source pack; the importer and renderer contain no character filename rules. Original source bytes remain unchanged.

The GLTF importer was implemented for Veldren using the Khronos GLTF 2.0 specification: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html. No third-party engine loader implementation was copied.
