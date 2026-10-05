# Willowcross frame preparation repair

The owner's 86-second recording shows a long realm-entry wait, very infrequent scene updates in a Willowcross residence, then the loading screen again. The cause of that last transition is not established by the recording. Recent server error logs contained no matching client error.

The residence is part of the overworld. A CPU-only reproduction using the real generated world, native WASM Scene, production mobile camera/frustum, 1112×512 viewport and zoom 118 found that camera corner picking repeatedly checked every walkable structure. The old exact query fetched native entities and inverted child matrices for each ray sample, including distant buildings. Instrumentation showed hundreds of thousands of entity reads per frame.

## Changes

- Cache inverse matrices and conservative bounds derived from canonical walk-surface entities. A spatial bucket index restricts ray samples to nearby surfaces while preserving original surface priority and the exact ramp/deck height calculation. Native revision changes rebuild the projection, including parent transforms, child/footprint edits, deletion and world reload. Pitched transforms retain horizontal-plane query semantics; unbounded and legacy geometry use the full candidate fallback.
- Reject camera-culled building doors before reading and transforming their geometry.
- Reuse quest target lookups until the native Scene or live world membership changes, instead of scanning world objects repeatedly for NPC markers.
- Read session objects directly for transient fire lights, preserving scene, range, expiry and interior checks.
- Read foundation extents once before terrain sampling, avoiding repeated native-backed property access inside the sample loops.

All caches are disposable derived data. Native Scene ownership, authored geometry, player data, multiplayer protocol and server behavior remain unchanged. This compatible client release does not require maintenance or player disconnection.

## Validation

`tests/rendering/frame-query-cache.cjs` compares the cached surface query against the previous exact implementation over thousands of positions, translated/rotated/pitched/nonuniformly scaled ancestors, moved children, changed footprints, deletion and reload. It checks broad-phase inclusion of every hit, zero native entity reads for warm distant misses, and quest lookup invalidation.

Passing checks also cover building component edits, runtime/editor membership and transient objects, light geometry and expiry, bridge geometry/height/collision, model picking and mobile canvas coordinates, and the Filament renderer contract. The production build and packaged-asset check are required before publication.

`PROFILE_BASELINE=2f7aa2eba68dc46c4c6939f407be17ba4985a510 node scripts/qa/profile-room.cjs` reproduces the previous client for comparison. `node scripts/qa/profile-room.cjs` runs this revision. The painter only accepts geometry submissions: these results exclude GPU rendering, network latency and simulation updates. They do not certify phone FPS, explain the recording's reload, or certify 39 hosted players. Full-world generation and migration remain a separate startup cost.

## CPU reproduction results

See `docs/qa/runtime/willowcross-frame-2026-09-29.json`. Both runs use the same residence at (197.5, 81), mobile profile, production frustum and no timing wrappers. After three warm-up draws, ten draws give a median of **302.57 ms before** and **64.26 ms after**, a **4.71× reduction** in CPU frame preparation. The first draw dropped from **12,319 ms** to **7,991 ms**. This is substantial but does not establish a playable frame rate on the owner's phone.

Generation/migration were approximately 38/46 seconds before and 36/46 seconds after in this Node VM fixture. That startup work is not solved by the frame-query repair. The early exploratory run that entered Firstlight instead of the residence was discarded; the recorded comparison explicitly checks `currentScene === 'overworld'` and sets the residence coordinates.
