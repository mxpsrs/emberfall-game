# Recording freeze repair — 4 October 2026

The supplied 20.3-second phone recording freezes Firstlight's 3D scene during
movement at about 3.8 seconds. The chat interface still responds afterward.
The previous client did not report runtime errors after startup, so the exact
exception from that device is unknown.

## Repairs

- Reproduced a permanent stop when one real asset preparation worker fails:
  the streaming owner threw that failure into the game frame, which never
  scheduled another animation callback. Frames now always schedule a successor.
- Failed model loads keep the complete previous model or compatibility mesh.
  They retry at most three times, with delay, cancellation, and the existing
  native streaming concurrency limit. Recreated owners use unique native epochs.
- Construction budgets charge actual resource and renderable creation rather
  than unrelated transform or bone work between allocations. This removes the
  recurring deferral that left 99 resources and 262 renderables unfinished in
  the reproduced movement run. Existing profile limits and complete-model
  activation remain in place.
- Cooked terrain pages belong to the overworld. Firstlight now uses its own
  native surface; scene changes discard stale queued terrain and snapshots.
  Idle sampling retains its 2 ms mobile / 4 ms desktop time limit. Pure water
  and empty holes skip samples the mesher cannot use, preserving their output.
- Runtime failures use the existing sanitized client-error endpoint, limited
  to two reports per minute. Account and character data are excluded.

## Verification

The movement loop, startup recovery, construction fairness, native world
streaming, Filament static transforms, asset meshes, renderer contract, and
Filament runtime checks pass. A production build and delivered-asset check
verify current inline source, versioned routes, native bytes, and the hosting
module limit. The terrain worker test exercises Firstlight height selection,
stale scene cancellation, returning to baked overworld pages, water geometry,
live edits, LOD seams, and bounded page memory.

The full-frame Firstlight probe uses the actual C++ WebAssembly core,
preparation/terrain workers, and Filament NOOP backend. A single injected model
preparation failure recovers; all 497 requested canonical renderables become
active, with no pending model instances or deferred resources/renderables.
Firstlight terrain at the movement destination matches native collision at
height 0.75. Terrain cells continue to load incrementally near the camera.

These checks exclude device GPU execution and rasterization. Actual phone/PC
FPS and the original device's exact exception are not certified. The hosted
39-player capacity requirement remains unverified by these local checks.

The change uses existing server routes and leaves accounts, character saves,
world data, and hosting environment bindings intact. It publishes while the
game remains open.
