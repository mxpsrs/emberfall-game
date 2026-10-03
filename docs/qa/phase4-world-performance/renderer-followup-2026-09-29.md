# Renderer and engine follow-up — 2026-09-29

## Changes

- Added production-world first-render profiling hooks and a repeatable iPhone-sized renderer harness so startup and frame costs can be compared by stage.
- Reduced repeated scene work with visibility/bounds reuse, cached static transforms and terrain samples, road proximity broadphase checks, and skipped terrain/world invalidation for validated understory-only edits.
- Made first render progressive. Static meshes are built within a per-frame budget (10 ms on the mobile profile, 16 ms otherwise); remaining geometry streams on later frames and deferred objects do not receive pick hitboxes until they exist.
- Cached idle humanoid geometry by position, heading, appearance, and equipment. Moving and attacking characters keep the animated path. Expired attacks now resolve to exactly zero instead of a floating-point residue.

## Verification

- `npm run build` — passed.
- `npm run filament:verify` — passed, including renderer contract, character parity, and Filament 1.77 mobile-sized NOOP runtime checks.
- Selected scene, renderer, world-performance, mesh-streaming, character-cache, and native-runtime checks — 13 passed, 0 failed.
- `node --check dist/view3d.js`, `git diff --check`, and both focused static-mesh/creature-cache tests — passed.

## Measurements and limits

The latest comparable 16-frame CPU-only profile before the idle-humanoid cache recorded a 4.22 s first draw versus 6.99 s in its earlier baseline run (about 40% lower). That same later run still had a 352 ms warm-frame median, so this does not establish playable frame rates. The profile uses Filament's NOOP backend at an iPhone-sized resolution: it measures JavaScript and renderer preparation work, not GPU rasterization or real-device frame delivery. The idle-humanoid cache is verified by construction/submission-count regression tests but has not yet had a separate timing run.

No physical PC or iPhone validation was available for this release, and the 39-player capacity figure is not certified. The repository also has a documented pre-existing `tests/world-cohesion.cjs` failure (resource-tree count assertion, reproduced on clean HEAD before this work); that test was not part of the 13 selected checks.

## VLD-SDL follow-up

After the first publish, live client diagnostics reported two iPhone Safari `VLD-SDL` failures for `view3d.js`; neighboring scripts returned HTTP 200. The Worker build had Brotli-encoded that critical renderer entry point. The build now serves `view3d.js` uncompressed, and `tests/built-assets.mjs` verifies HTTP 200, no content-encoding header, and byte-for-byte equality with the source. This is regression-tested locally; an iPhone retest is still needed to confirm the live symptom is gone.
