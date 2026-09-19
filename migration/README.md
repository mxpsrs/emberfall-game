# Recovering and reviewing Veldren content

This branch implements asset and world recovery. It does not yet run as a Vervesis native game. Read STATUS.md before using its exports.

The reference and rollback commit is 439dfaaea6e144ab9f2e8ab30304f9c34c1915b2. dist/ is authored client source, including late overriding implementations. Never delete it as generic build output. worker/ and its account/save protocol remain unchanged.

## Layout

| Path | Purpose |
| --- | --- |
| assets/source | Editable originals and dependencies; pack names and license files retained |
| assets/models | Individually usable adapted game GLBs, reusable static parts and glTF world regions |
| assets/authoring | Validated models available for future placement |
| assets/textures, assets/ui, assets/audio | Local dependencies and current artwork |
| assets/licenses | Existing provenance and licensing evidence |
| migration/content | Deterministic source-content snapshots, data and terrain; not an engine schema |
| migration/reports | Executed evidence and machine-readable inventories |
| scripts/migration | Veldren-specific acquisition, export and verification |
| .qa/migration | Reproducible intermediate captures; ignored |

The catalog IDs beginning veldren: are stable migration identities. They are not a claim about Vervesis's asset-ID syntax. Object IDs remain scene:object:source-id; buildings use scene:building:service-id or a deterministic source identity hash. Static glTF node extras link back to those identities.

## Reproduce recovered game assets

Use Node 24 and Python 3.12. The workflow pins validator and Python dependencies.

    npm ci
    python -m pip install -r scripts/migration/requirements.txt
    node scripts/migration/capture-assets.cjs
    python scripts/migration/export-glb.py
    node scripts/migration/capture-static-world.cjs
    python scripts/migration/export-static-world.py
    node scripts/migration/export-world.cjs
    node scripts/migration/export-ui.cjs
    node scripts/migration/capture-poses.cjs
    python scripts/migration/verify-parity.py
    node scripts/migration/check-world.cjs
    node scripts/migration/check-two-clients.mjs
    node scripts/migration/validate-gltf.mjs assets/models assets/authoring
    python scripts/migration/validate-portable.py

The extraction fixture follows index.html order, omitting only startup, asset-network management and maintenance startup. Network requests throw during extraction. Random placement uses the baseline server-export seed 91482; committed ecology placement is retained. Scene generation happens at export, not each future engine load.

Re-exporting can take several minutes. Baseline browser tests can be run with:

    node scripts/check-game.mjs $(rg --files tests -g '*.cjs' -g '*.mjs' | sort)

The script's 240-second timeout is too short for main-story.cjs on this container; run that test separately. Build-dependent checks require the original web/server build. Use an isolated checkout because scripts/build.mjs regenerates existing authored artifacts. Do not deploy or reset accounts to run these tests.

## Original acquisition and authoring

    python scripts/migration/acquire-kaykit.py
    python scripts/migration/acquire-referenced-models.py
    python scripts/migration/recover-source-archives.py .qa/migration/model-sources/downloads /path/to/owner-provided-archives
    python scripts/migration/prepare-authoring.py
    node scripts/migration/validate-gltf.mjs --report migration/reports/original-validation.json assets/source
    python scripts/migration/check-source-validation.py
    python scripts/migration/build-inventory.py

acquire-referenced-models.py uses the publishers' official free-download flows for the currently public Medieval Village, Fantasy Props, Fantasy Outfits, Bestiary, Universal Animation Library 2, Modular Warrior, Human Archer and Treant files. It validates archive structure, member lengths/CRC where available and SHA-256, stores the archives only in ignored `.qa`, and writes the reproducibility report. It deliberately does not scrape authentication-gated marketplace purchases.

recover-source-archives.py accepts multiple archive directories recursively and enforces the recorded SHA-256 checksums. It recovers portable glTF/GLB sources and dependencies from the verified packs, the Human Archer FBXs, the Treant FBXs, the publisher-direct Modular Warrior GLB/FBX and the supplied Demon evidence; it is not a Unity/Godot scene importer. Existing verified extractions are retained if their owner-provided archive is not present during a later run. It writes complete RAR members only. The two supplied Demon texture RARs are truncated; ten complete texture members survive. Missing members are not invented.

The source validation command intentionally exits nonzero for unchanged recorded defects in original Nature files. check-source-validation.py accepts only exact recorded file hashes/error counts. Production and authoring validation remains strict. Two original Base Character references contain _png.png filename errors; copies of the matching adjacent original normal maps supply those aliases, preserving original glTF bytes.

KayKit acquisition downloads the exact commits already pinned by scripts/import-briarhaven-assets.py and follows local buffer/image dependencies. Downloading originals does not replace fitted armor, retargeted clips, custom colors, staff corrections or equipment sockets in adapted game assets.

No original Unity/Godot scripts, scenes or shaders are treated as natively compatible. Nature authoring repair retains raw out-of-range color samples as _SOURCE_COLOR_0 while fixing standard COLOR_0 and bounds. Tree OBJ conversion preserves geometry and named material groups; its source MTLs omit texture paths, so bindings follow the existing Veldren pack-specific importer.

## Reference launch and native launch

The existing browser reference still uses npm run build and its existing server/dev procedures. This migration has no deployment step.

There is no verified Vervesis native build/launch command available in this checkout. Providing a cargo/Tauri command would invent an interface. The required engine artifacts and acceptance tests are specified in VERVESIS-HANDOFF.md. Browser support is a separate target.

The migration GitHub workflows are restricted to this repository and branch. They generate and validate content, commit only declared migration paths, and publish private source bundles as recovery artifacts. They never call the live game or alter accounts. The one-time source transfer used chunks because the connector limits requests to 16 MiB; the workflow verifies full Git blob hashes, reconstructs individual originals and removes transfer chunks from the final tree.
