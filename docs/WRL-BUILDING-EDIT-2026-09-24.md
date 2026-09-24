# Startup repair and modular building editing

Source baseline: Sites d361ef1e52486580370dc6a89e8403cfd0d68a05 and GitHub main dc21cdc6e556e3c978cde69e615cbe586578472e had identical tracked file contents.

## Confirmed startup failure

Production client-error logs recorded ReferenceError: followedPlayerId is not defined in stop(), reached through activateScene() during world setup. multiplayer.js bound the removed waveButton before declaring the follow state. The missing button aborts that script, leaving later lexical state uninitialized. Removed this obsolete event binding, obsolete icon initialization for eat/runButton, worldClock DOM writes, onlineStatus DOM writes, and retired action-strip updates. The existing current HUD and simulation remain.

World generation, tutorial generation, editor application, HUD initialization and first draw now have separate diagnostics. Persistence waits for completed generation and does not wrap or reenter activateScene. Each edit is validated and guarded; successful applications are remembered per scene. Bad or unmatched entries produce diagnostics rather than stopping world startup. Editor loading preserves incompatible saved entries; the API can retain unchanged existing entries when saving valid new work. No database reset or account migration is included.

## Building assemblies

The original renderer's authored mesh instances become building-local modules with stable IDs, registry names, transforms, floor assignments, bounds and gameplay link metadata. Existing custom face details remain associated with their original generated source instead of being approximated with replacement boxes. Only serializable assembly data enters editor_world; mesh buffers, runtime caches and functions do not.

Building Edit adds a hierarchy, local transforms, authored-part catalog, snapping previews, floor isolation/reference display, undo/redo and linked entrance relocation. Moving a doorway swaps compatible authored wall/opening modules and moves the existing service component. Parent transforms carry child modules and linked interior objects. Filament submits module transforms without flattening new world-space roof geometry during dragging. Navigation changes are committed around the affected building.

Save World retains the existing revision/CAS flow. Assembly serialization is deterministic. The production document limit is now 8 MiB, matching the existing local editor limit.

## Verification and limits

Executed: startup recovery; actual world/tutorial startup with retired DOM absent plus malformed/stale edits; authored house capture and transforms; snapping; linked entrance, old-opening closure and new-opening collision; assembly roundtrip; editor bridge enter/select/move/undo/redo/exit; production owner access, CAS save/readback, assembly preservation and account/save preservation; login; Filament native runtime; character appearance parity; existing building entry; normal build and built-asset comparison.

The existing renderer-filament.cjs static test has stale expectations for the preexisting renderer quality profile (AO/dithering and shadow settings). These settings were deliberately preserved. The executable Filament runtime test passes; the stale static assertion is not represented as a passing test.

Cloud browser preview returned older source (without Building Edit and with the removed waveButton binding), despite the supervised preview reporting healthy. Consequently visual interaction QA and post-publication authenticated live Save World checks are not certified here. Do not confuse local Worker/API tests with live production login/persistence verification.

Protected gameplay-linked buildings/objects cannot be deleted or duplicated through the editor. Existing legacy face details are retained as a group. New arbitrary stair assets need a corresponding gameplay ramp/link before they provide a new navigable floor connection; moving existing linked authored stairs retains their ramp linkage. These are limitations, not completed acceptance cases. Further visual QA is required for all architectural variants, free-rotated collision and multilayer cutaway behavior.
