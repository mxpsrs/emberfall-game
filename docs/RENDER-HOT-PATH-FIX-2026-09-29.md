# Render hot paths and startup overlap

The active renderer is Filament. The retired WebGL renderer already caches uniform and attribute locations at shader-state creation; its additional lookup calls belong to a one-time capability probe. Its allocating normal-matrix helper is not called by the active Filament draw loop, so it was not changed.

Changes:
- Permanent lights pass through the existing native camera visibility set, whose bounds include emitter radius/offset, before metadata and terrain work. Quality caps remain upper bounds, not a requirement to illuminate with that many lights.
- Nearest light/room selection scores each candidate once and retains only the bounded result, preserving stable ordering instead of sorting the entire candidate list.
- Canonical transform and native LOD request buffers are reused across frames. Asset instance compaction happens in place; view-corner bounds avoid repeated mapping arrays.
- Filament's existing triple-buffered dynamic vertex staging remains. Tangent data is now reused when normals are unchanged and rebuilt when normals change, with its retained bytes included in native residency accounting.
- Independent atlas downloads begin alongside Filament initialization. Renderer readiness still waits for all required resources.

No new shadow-center culling was introduced: dropping an offscreen caster can remove its on-screen shadow. Existing native submission visibility and Filament culling remain in place. Shadow quality and resolution are unchanged.

Validation: real Filament WASM NOOP runtime resource tests, dynamic normal invalidation, native light filtering, runtime/editor asset lifecycle tests, exact nearest-selection results for 10000 candidates with one score per candidate, and a delayed-initialization test proving texture requests overlap renderer startup. These are correctness/work-reduction checks, not measured phone FPS, GPU timing, or evidence that GC dominates the user's device. Full procedural world generation/migration startup cost remains outside this patch.
