# Phase 3 acceptance record

Updated: 2026-09-28. Branch: `phase3-editor-foundation-wip` in
`mxpsrs/emberfall-game`. Accepted Phase 2 base:
`9e72e514610f6e8de01ae782e406e10fc5a8443a`.

Status: **not accepted**. Implemented authoring features and focused checks pass,
and the camera binding correction now passes real overworld terrain input and
undo/redo. Another render-time Scene write is rejected by the authoring guard;
clean graphical rendering and final save/reload plus `/play` remain outstanding. No deployment or main
merge is included.

## Ownership and behavior

C++ Scene and WorldDocument remain authoritative. The Phase 2 registry, imported
assets and Filament resource owners remain the render path. Browser code handles
editor input, panels and derived views; command history and prefab mutation run
in C++. There is no new editable world representation or persistence store.

The editor supports grouped native undo/redo; 3D translate, rotate and scale;
world/local axes, object/selection-center pivots and snapping; canonical picking,
additive selection, hierarchy filtering/reparenting and component inspection;
scene-scoped prefab creation/instances/overrides/update/revert/unpack; modular
building conversion, placement and part editing; asset placement; independent
camera/scene selection; and verified save with dirty-state tracking. Terrain
strokes use the same native command history as entity edits in their Scene.

History is session-only, limited to 256 transactions per Scene. Saved content
uses the existing WorldDocument route. Saving blocks authoring while the server
result and reread are compared; loading a document clears history. Dirty state
aggregates across scenes, and undo can return to the saved boundary.

## Evidence

| Area | Verification |
| --- | --- |
| Native history | Desktop editor tests and actual-WASM mixed commands, affine transforms, rollback, grouped gestures, asset validation and save boundary |
| Prefabs | Actual-WASM creation, authored root pose, internal links, independent overrides, updates, additions/removals, revert, unpack and exact round-trip |
| Building editing | Actual generated house assembly, snapping and openings; native linked interior parts; grouped module/door edits, duplicate/delete and exact undo/reload |
| Terrain | Actual-WASM shared entity/terrain ordering, native validation, no-op behavior, transaction rollback, rejected preview rollback and persistence |
| Picking and hierarchy | Actual-WASM incremental subtree updates, parent transforms, active state, inherited hide/lock, reparent/delete undo and scene/load invalidation |
| Graphics | Chromium WebGL renders all three handle modes; populated tutorial editor shows canonical imported assets and Inspector selection; overworld ground picking and terrain input now pass; a render-time write remains |
| Populated authoring | Hierarchy click, Inspector rename/position, undo/redo, reparent, prefab actions, Firstlight Smithy editing, verified save and exact fresh reload; no page errors or gameplay-controller requests |
| Persistence routes | Atomic v2 save, legacy preservation, concurrent save conflict, validation and account/character preservation in disposable local tests |
| Generated world | Building/road/light/structure/spawn/resource/bridge/quarry/service Scene ownership, unchanged Scene revision while rendering multiple building variants, and complete native round-trip |
| Build and assets | Fresh build; all 124 startup resources; JavaScript/JSON parsing, licensed asset records, byte-preserving delivery and runtime/editor ABI checks |

The populated authoring script saved revision 9 and reloaded both prefab metadata
and the edited wall exactly. It operates on a disposable local Worker, account
and SQLite database; no production account or world is changed.

The overworld browser check identified render-time height writes entering native
command history and repeatedly refreshing the Scene. All generated-building
render paths now leave authored height components unchanged, and the editor
rejects writes during drawing. The generated-world regression covers this
behavior. The graphical rerun now completes scene selection without changing
character state or creating history entries. It then fails the visible-ground
precondition, as described below.

## Camera correction and remaining graphical gate

On the disposable revision-9 fixture, switching from Firstlight to `overworld`
leaves a blank viewport. The detached camera reports `(42, 51)`, yaw `-2.05`,
tilt `0.27`, zoom `118`, and viewport `870 × 682`. Its distance is finite
(`5.322333574251256`), but the original `unproject3` returns non-finite coordinates
and the Filament camera reports non-finite eye/center values.

Diagnostics distinguish this from a missing terrain surface: all four nearby
terrain nodes, grading, foundations, and a direct ground sample are finite. The
saved native WorldDocument loads separately with ground height
`2.4732103814964477` and a correct ray hit at the camera anchor. In the paused
browser, a freshly evaluated copy of the original camera function also returns
the correct hit, while the original function passes non-finite coordinates to
`walkSurfaceHeight`. This is evidence of a live camera binding/evaluation issue;
its root cause is **not yet established**. Replacing functions at runtime was a
diagnostic comparison, not a committed fix.

The browser acceptance now probes actual land before dragging and writes its
camera inputs to `.qa/phase3/terrain-camera-failure.json` on this failure. The
stroke/save/reload and `/play` assertions must pass on a fresh built Worker after
the correction; native terrain tests alone do not satisfy that gate. The initial
binding inspection was interrupted by execution-environment transport recovery.
The resumed inspection confirmed non-finite `px`/`py` values in the original
renderer's Script scope while the editor read `(42, 51)`. Window-backed shared
anchor bindings restore consistent reads in a fresh Chromium run. The existing
camera math returns the expected `(42.5, 51.5)` ground hit, and a real terrain
stroke plus native undo/redo and dirty-boundary assertions pass. The underlying
engine mechanism behind the previous lexical binding divergence is unconfirmed.

Valid camera rendering also exposes another authored Scene write during drawing.
The existing guard rejects it. Final acceptance requires correcting that render
path and completing the fresh save/reload and `/play` assertions with zero page
errors. This intermediate checkpoint does not claim those gates have passed.

## Native editing performance

The fixture is the saved populated WorldDocument: 259 scenes and 20,856 entities,
with 15,496 in the overworld. Measured with the actual WASM bridge in Node:

| Operation | Median | 95th percentile |
| --- | ---: | ---: |
| Transform command | 0.030 ms | 0.076 ms |
| Cached ray picking | 0.403 ms | 0.740 ms |
| Picking after a transform | 0.539 ms | 0.643 ms |

The 100-update transform gesture produces one undo record and restores its exact
starting transform. Cold document load measured 8.47 s, cold hierarchy read
0.95 s, and initial picking index creation 1.30 s. These are local measurements,
not rendering FPS, DOM latency, hardware-independent promises, or hosted capacity
certification. Incremental edits update affected entity records and refit their
BVH branches; they do not reread the full Scene or all model bounds.

## Practical limits

Prefab definitions are currently scene-scoped. Nested linked prefab instances
must be unpacked before capture. Prefab placement previews show imported-model
members; procedural/captured members appear after placement. Customized children
removed from a template remain loose children in the instance. History is not
persisted across reload. The browser still pays the documented cold scene/index
cost; hardware-rendered interactive frame-rate acceptance is separate from the
software-rendered browser checks here.

## Reproduction

- `make -C native editor-test test wasm-test` (requires C++20 and Emscripten).
- `node tests/editor-commands.mjs`, `node tests/editor-prefabs.mjs`,
  `node tests/editor-building-history.cjs`, `node tests/editor-terrain-history.mjs`,
  and `node tests/editor-selection.mjs`.
- `node tests/building-assembly.cjs`, `node tests/world-buildings-scene.cjs`,
  `node tests/editor-camera.cjs`, `node tests/editor-context.cjs`, and
  `node tests/editor-frame.cjs`.
- `npm run build`, then `node tests/built-assets.mjs`,
  `node tests/editor-production.mjs`, and `node tests/editor-local-persistence.mjs`.
- `scripts/phase3-authoring-browser.mjs` and
  `scripts/phase3-terrain-play-browser.mjs`; set `VELDREN_PLAYWRIGHT` to a local
  Playwright entry point if needed. Output goes to `.qa/phase3/`.
- `node scripts/phase3-native-performance.mjs <exported-world.json>` for the
  native microbenchmark. It leaves the input unchanged.
