# Phase 1 engine foundation acceptance — 26 September 2026

Status: Phase 1 engine foundation complete.

Repository: `mxpsrs/emberfall-game`. Branch: `phase1-engine-foundation-wip`.
The original requested checkpoint and subsequent migration categories have been
committed and independently verified on GitHub. This acceptance closes the
foundation work after the final checks below; it does not authorize publication
or a merge into main.

## Resulting behavior

The C++ Scene graph owns persistent entity identity, hierarchy, affine
transforms, components and serialization. Every generated permanent object has
a native owner. Browser gameplay and the editor consume controlled projections;
generation arrays stop being mutable world authority after migration. Temporary
fires, placement previews, actor movement and quest travel use explicit session
state and are excluded from permanent definitions.

Building parts, roads, lights, structures, bridges, quarries, services,
gatherables and actors follow native hierarchy changes. Render adapters retain
affine scale/shear and authored elevation, including skinned actor geometry,
normals and attachment sockets. Native ABI 19 initializes live actor heading
from the authored world transform.

The editor has its own startup, camera, input and frame loop. It does not run
character authentication, player movement, combat, presence or character
autosave. Editor bridge injection now waits for its iframe dependencies, and
editor startup executes the same quarry/service ownership migrations as play.

Large WorldDocuments now save through the existing `editor_world` table using
compressed 256 KiB chunks and an atomic revision manifest. Two chunk banks
retain the current and previous revisions. The 32 MiB document limit accepts
the actual generated world; stale/concurrent writers and failed transactions
cannot partially replace it. Small documents retain their inline format.
Account and character storage remain separate.

## Acceptance evidence

Evidence is committed under [qa/phase1-engine-foundation](../qa/phase1-engine-foundation).

| Check | Result |
| --- | --- |
| Affected regression matrix | 39 of 39 passed; individual names, exit codes and durations in `regressions.json` |
| Native C++ and WebAssembly | Scene/core tests and actual ABI 19 WASM execution passed |
| Native desktop | Asset-dependent desktop test and 240-frame headless smoke passed |
| Full generated world | Ownership, original geometry, hierarchy, catalog identity and exact save/unload/load passed |
| Large-world production storage | Actual 14,861,865-byte document reread exactly; five chunks, largest row 262,144 bytes; current/previous recovery, concurrent CAS, injected rollback and character isolation passed |
| Fresh production build | 212 assets; 63,595 KiB Worker module |
| Built asset audit | All 119 startup resources, syntax, cache URLs, content hashes and licensed audio checks passed; 56.29 MiB assets before hosting compression |
| Chromium with built Worker | Play and editor startup, native migration, pointer input, transform, duplicate/delete and save passed; fresh browser/backend reload restored the saved entity exactly with no player-controller requests or page errors |

The generated-world comparison covers 235 building roots, 2,312 building
parts, 234 doors, 259 lair decorations, 4,697 roads, 1,282 lights and 259 scene
metadata records. It also verifies 791 walls, 34 rooms, 16 floors, nine gates,
18 surfaces, 770 spawn definitions, 4,372 gatherables, seven bridges, five
quarries, 30 pads with 104 attachments, and 40 services with 40 colliders.
It asserts that no generated permanent object is left without a native owner.

The desktop smoke rendered 512 visible actors at a configured 2560×1440,
4096 shadow resolution, 900-unit far distance and 2.5× foliage density. These
are local headless results, not physical GPU or hosted performance guarantees.

The regression matrix includes real-WASM membership and actor-transform tests,
all migrated category fixtures, editor isolation/startup/camera, scene formats,
local/production persistence, scene handoff, building collision/layout,
terrain/quarry maps, training, shared-client behavior and renderer contracts.
The renderer contract was reconciled with the existing atlas, terrain material,
light-limit and shadow settings; those production settings were not changed.
This is the affected Phase 1 matrix, not a claim that every historical repository
test was rerun. Older balance discrepancies remain recorded in their original
reports; combat formulas were not changed to satisfy them.

## Reproduce the principal checks

From the repository root, with the existing npm dependencies installed and
Emscripten/C++ build tools available:

```sh
make -C native test wasm wasm-test
make -C native desktop-test desktop desktop-smoke
node tests/world/world-buildings-scene.cjs
VELDREN_SCENE_CONTEXT=editor node tests/world/world-buildings-scene.cjs
npm run build
node tests/rendering/built-assets.mjs
node tests/server/world-scene-large-production.mjs
```

The graphical acceptance script is separate from the default regression runner
because it requires Chromium and can take several minutes per full-world boot.
This run used Playwright 1.51.1, Chromium 134 headless shell and SwiftShader at
1280×800. Install Playwright and its Chromium browser, then run:

```sh
node scripts/qa/phase1-browser-acceptance.mjs
```

If Playwright is installed outside the checkout, set `VELDREN_PLAYWRIGHT` to
the absolute path of its `index.mjs`. The script starts only a local built Worker
with a disposable SQLite database/account. It checks native initialization,
editor transforms, duplicate/delete, endpoint persistence, the absence of
player-related editor requests and a fresh reload of the saved entity.
It writes screenshots and structured results into ignored `.qa/phase1/`.
The edit-stage record also identifies its disposable fixture directory. To
verify that saved world in a fresh browser/backend process, set
`VELDREN_BROWSER_RESTORE` to that fixture directory and
`VELDREN_BROWSER_RESTORE_ENTITY` to the edited native entity ID before running
the same script. Restore mode compares the loaded entity with the saved endpoint
record and checks editor isolation again.

The original graphical run passed play startup, editor operations and save,
then ended without its final page-reload assertion. The final reload acceptance
uses that exact saved fixture in a separate fresh browser/backend process. The
edit-stage log and separate restore result preserve this distinction.
CMake was unavailable for this acceptance run; the Make targets above supplied
the native and desktop checks.

## Scope and delivery

Phase 1 establishes the engine foundation and canonical generated-world
ownership. A complete C++ gameplay port and a fully native browser Filament
submission pipeline remain later work. Deterministic unmaterialized vegetation
and base terrain formulas remain generation inputs; live geometry caches are
derived. Horizontal quarry/bridge terrain authoring was verified; arbitrary
pitch/roll terrain authoring is outside that verified model.

No deployment, publication, main-branch merge, account reset or hosted data write
was performed. The local browser uses a disposable account and database.
These tests do not certify the separate requirement for 39 simultaneous hosted
playtesters or physical mobile-device behavior. No Phase 2 content was added,
and spirits remain retired.
