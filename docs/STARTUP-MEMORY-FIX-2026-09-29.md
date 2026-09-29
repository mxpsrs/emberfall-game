# Startup memory and construction repair

The owner's next 65-second recording shows roughly 50 seconds in the twelve world-preparation stages, followed by entering the realm, a white flash and another startup. It does not establish whether the reload was manual, a browser memory termination, or another failure. Recent server errors did not contain a matching client error.

The CPU-only production-world reproduction reached more than 1 GiB process RSS before GPU rendering. Every migration category previously serialized the whole native WorldDocument, copied every C++ Scene, and loaded another whole world while the old one remained allocated. WebAssembly memory cannot shrink after that growth.

## Changes

- Scope incremental imports to startup construction. Existing mappers still read temporary documents from the native Scene. Compare those documents to serialized native snapshots, then upsert changed/new entities and remove obsolete entities through existing C++ validation APIs. Preserve parent-before-child insertion, sibling ordering, transforms, components and metadata.
- Use the original atomic full importer when document metadata, scene headers, ordering or graph requirements cannot be represented safely as incremental writes. If an incremental write fails, try the atomic full importer; if invalid, restore the previous canonical document. Normal editor/save loading always retains the original full-import behavior.
- Keep derived-view notifications batched until construction finishes. Reads during construction still observe canonical native writes. Snapshot data is temporary marshalling state and is discarded at the boundary.
- Read scene names directly from the current construction scope for bridge projection, avoiding a whole-world serialization solely to enumerate names.
- Share legacy forwarding accessors by field through a WeakMap, instead of retaining two closures for every field on every construction object. Clear completed source maps. Legacy references held by gameplay code continue forwarding to their live views.

No native ABI, renderer visuals, server protocol, accounts or character saves change. This compatible client update does not require maintenance.

## Validation

`tests/native-construction.mjs` compares incremental and full native imports, including new parents/children, reparenting and removal, invalid imports and rollback, sibling reordering, world metadata, entity-ID counters, empty/new scenes, interleaved native writes and notification scope release. It verifies that an ordinary category import avoids the full native world loader, while ordinary saves still use it.

Native runtime/editor bridge, gatherable lifecycle, actor spawning, services, lights and bridge tests pass. These cover lexical legacy references, resource session state, authoritative saved boot, hierarchy edits and rendering/collision parity. Gatherable tests verify that old objects share forwarding functions. The production build and packaged-asset test are required before publication.

## Reproduction and limits

Run `PROFILE_BASELINE=8bda7d4b4b01f12c43596d9e3956519e0b2a8802 node scripts/profile-startup-memory.cjs` and `node scripts/profile-startup-memory.cjs` separately. The script generates the real world, migrates it through the native WASM Scene, hashes all canonical scenes, and submits residence draw geometry without a GPU. See `qa/startup-memory-2026-09-29.json` for stage samples and timing.

Both runs produce the identical full-world checksum `15834d81f2d3e51671ab3e17025cbff30d1e8c7df882b7d0d4fad419c4beff66`. Migration drops from **46.57 s to 28.64 s (38.5%)**. Native memory after migration/hash drops from **315.25 MiB to 211.125 MiB (33.0%)**. Memory samples are not continuous peak measurements, and JavaScript collection timing varies.

Procedural generation remains about 36–37 seconds in the Node VM. This repair does not establish phone FPS or resolve the unexplained reload conclusively. Warm CPU draw preparation also remains substantial; GPU rendering, live networking, simulation and sustained 39-player capacity are outside this fixture.
