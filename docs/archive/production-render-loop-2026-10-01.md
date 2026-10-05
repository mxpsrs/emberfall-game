# Production render loop — 2026-10-01

Starting source: deployed v236, `1b5a305b952020386340fc3a9146914cc7b25456`.

Native spatial records now retain the render transform, material and shadow flags updated by the existing scene/asset change feed. The packed draw path reads that projection without inspecting the scene entity on every frame. The JavaScript consumer retains its matrix and draw descriptors until the native entity changes.

Filament canonical and legacy construction share one frame budget. Static assembled building faces use retained GPU entries instead of being repacked during every draw. Temporary culling has a bounded grace period, while native streaming eviction still releases unretained resources immediately. Character pose updates retain their existing behavior.

Fine terrain and the mobile fallback share the terrain deadline. Both are resumable; edits keep the previous surface visible until the replacement is ready. Changes invalidate the terrain queue without requiring camera movement, and resident cleanup runs periodically.

## Verification

Passed with the rebuilt native WASM:

- Native C++ world-performance regression and core WASM ABI regression.
- Packed/native draw parity, material and shadow changes, stable buffers/descriptors, parent transforms, edit/undo, paged saves and unchanged canonical serialization.
- Filament renderer, runtime, character parity and static transform regressions. A settled static scene performs zero transform writes; moving one instance updates one transform; a terrain edit updates the affected instances.
- Assembled building GPU-cache reuse and invalidation without dynamic face packing.
- Terrain editor, frame-budget regression, editor integration and history.
- Native editor runtime, road scene ownership and transform/component/save regressions.
- Real Filament NOOP asset lifecycle, canonical static-mesh streaming and native world streaming through repeated travel, cancellation, undo and world/registry reloads.

The packed transfer microbenchmark measured approximately 1.4 ms median versus 7.0 ms for the JSON reference at 409 draws. This is a local CPU measurement, not GPU frame time or a phone FPS claim. The full-world transient trace defers resource creation as intended; its before/after frames have different resident geometry and cannot establish an equivalent-quality FPS gain.

The production Worker build must contain the final authored runtime scripts and native WASM, with versioned URLs regenerated. No server API, database migration, account, character save or shared-world protocol is changed. The existing public audience is preserved.

Browser/physical-device GPU rendering and sustained authenticated hosted capacity for 39 simultaneous playtesters have not been certified by this local validation.
