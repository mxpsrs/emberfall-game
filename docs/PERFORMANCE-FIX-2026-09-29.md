# Client performance repair

Structures and bridges now use the existing native visibility result before submitting geometry. Previously their independent draw stages bypassed the frame visibility set, including walls across the overworld. Native ownership, collision and persistence are unchanged.

World membership maintains a derived timer candidate list for actors, session objects and explicit expiry fields. Quarter-second timer passes no longer traverse permanent scenery and gatherables; gatherables retain their native lifecycle. Actor relocation and session membership changes refresh this list.

The build embeds the landing page's small stylesheet and scripts and versions image URLs. This removes three dependent asset requests and enables immutable image caching.

Validation: native visibility and fallback behavior; offscreen bridge and structure submission; native membership and timer filtering; offscene respawn, saved loot expiry and temporary fire lifecycle; canonical serialization and reload. The production asset test checks the built landing page and game resources. Browser/iPhone frame rates have not been measured in this environment. No player/account data or server protocol changes are included.

## Chunk-arrival frame staging — 2026-09-29

The chunk scheduler already limited concurrent model leases, but a completed lease could synchronously create all Filament geometry, materials, roots and renderables for every newly visible object. Model geometry/material work now uses one per-engine animation-frame queue: at most three queued resource tasks per mobile frame or six per desktop frame, with short elapsed-time caps. Runtime and authored Scene draws share one renderable budget (eight mobile or sixteen desktop construction steps per frame, also time-capped), ordered by camera distance. New instances stay hidden until all of their renderables are ready, and the runtime does not build a duplicate legacy mesh while a canonical instance is staged.

Validation: actual-WASM/Filament tests cover material and geometry construction, 100 visible repeated instances, two draw owners sharing the mobile budget, near-camera priority, cancellation, reload, and complete resource release. `tests/world-streaming.mjs` still passes its cell concurrency and travel-cycle checks. These bounded-work tests establish the scheduling behavior, not Safari FPS or a physical-device smoothness result; the published Site needs a fresh iPhone and PC playtest.
