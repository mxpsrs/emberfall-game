# Phase one: distant whole-building rendering

Implemented on 2026-10-05 for Veldren. The production Filament painter can replace a distant static modular building with a complete material-batched building plan. Close views, occupied buildings, floor isolation and editor views continue to use the authored modules. The geometry comes from the existing canonical C++ importer and authored roof LODs.

The background asset worker builds the plan and transfers typed geometry buffers. Existing Filament geometry and material owners upload it under the normal construction quota. The replacement becomes visible only after the entire building is ready, on the frame when the painter removes the detailed modules. Loading failures keep the detailed building visible.

Selection uses distance to the building bounds and projected height, with different entry/exit thresholds to avoid boundary flicker. A player within 24 world units retains the detailed building. Mobile preparation permits one pending building, at most 8 MiB per plan and 16 MiB of retained plans; desktop permits two pending buildings, 12 MiB per plan and 32 MiB retained. Budget limits can leave individual buildings on their detailed path. Scene changes, terrain revisions, source reloads and retirement release the derived presentation resources. No assembly, entity, collision, door, account, character or editor-history data is rewritten.

## Geometry evidence

`geometry.json` is produced by `tests/rendering/building-lod.cjs` from all 12 authored Briar Haven building assemblies and actual canonical model plans.

| Quantity | Detailed modules | Whole-building plans |
| --- | ---: | ---: |
| Material draw submissions | 1,747 | 255 |
| Triangles | 222,479 | 202,400 |

This is an 85.4% reduction in material submissions and a 9.0% reduction in triangles for those complete plans. It is a geometry comparison, not a measured production frame, GPU draw-call count, or FPS result. Actual views can retain detailed buildings because of distance, visibility, preparation or memory policy. Filament's existing instancing also affects GPU draw calls.

The geometry test checks every vertex color and all eight UV channels, exact material identities, finite transformed positions, normalized normals/tangents, mirrored/nonuniform transforms, valid topology, per-building allocation rejection and unchanged assembly serialization. It also checks close/editor selection, ground invalidation, scene changes and dependency retirement.

`tests/rendering/building-lod-resources.cjs` runs the real asset-preparation worker and native WASM importer through Node worker threads, then uploads the result through actual Filament WASM using its NOOP backend. It checks transferred typed buffers, cancelled/stale jobs, construction quotas, complete handoff and zero retained GPU/dependency resources after retirement. NOOP verifies resource integration; it does not render pixels.

Runtime scripts now use compressed storage inside the deployment Worker while continuing to return identity HTTP bytes. This keeps the added renderer below the existing 64 MiB module limit. `tests/assets/packed-asset-delivery.mjs` compares delivered scripts with the exact build transform, checks all supported encoding responses, ETags, HEAD requests, stale-version compatibility, the play document and release route.

## Verification limits

All ten targeted regression tests passed, including 10,368 camera poses across 228 buildings and the 12 Briar Haven buildings. The full build produced release `realm-6b369737c7363ce9`, with an exact 65,140,298-byte Worker, 1,968,566 bytes below the hosting limit. The source check parsed 452 scripts. Machine-readable results and the built Worker hash are in [verification.json](verification.json). One camera-tour attempt hit the runner's 240-second limit under concurrent build load; its direct rerun passed the complete tour.

The browser preview timed out before rendered views or WebGL driver counters could be captured. Visual handoff, actual GPU savings and physical-phone frame times remain unverified. This record does not certify 60 FPS or hosted multiplayer capacity.
