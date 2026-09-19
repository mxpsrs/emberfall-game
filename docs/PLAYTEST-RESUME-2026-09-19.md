# Playtest resume audit — 19 September 2026

## Scope and source

Audited GitHub `main` at `439dfaaea6e144ab9f2e8ab30304f9c34c1915b2`. Read `AGENTS.md`, the September 14 handoff and regression report, subsequent completion records, and committed history. The September 14 encounter failure is historical: subsequent quest-cohesion work records its repair. No combat formula or assertion was weakened in this pass.

The separate native migration branch is `migration/vervesis-native-assets-2026-09-19` at `616bd7448a210bb33252733711a75f43fd84caa2`. Its status and regression evidence were inspected read-only. Neither that checkout nor the Vervesis engine was modified. This audit uses an isolated checkout of main, not the migration worktree.

No additional accessible playtest recording or open GitHub issue was found. The older attached September 14 video paths are absent from this workspace; this pass does not claim to have rewatched them. New device-specific reports still need reproduction when supplied.

## Reproduced and repaired

Three tests incorrectly depended on the nine legacy sprite sheets intentionally removed in the September 19 asset audit:

- `tests/game.cjs`: gameplay assertions passed, then the obsolete PNG-existence assertion failed. It now checks the current registry's assets while retaining the existing gameplay assertions.
- `tests/render.cjs`: loading deleted `assets/items.png` failed. It now renders current production meshes through the actual depth-buffered CPU preview painter: male/female bodies, four outfits, idle/run and front/back (32 images). Each view must contain finite geometry and a nonempty, distinct raster. The contact sheet was visually inspected. This is not GPU or native Filament certification.
- `tests/built-assets.mjs`: after a successful fresh build, missing legacy version entries led to a 404-versus-200 assertion. It now checks every registered production asset and explicitly verifies all nine deleted sheets remain absent and return 404. Existing byte-integrity, cache, compression, JavaScript/JSON, music licensing and audio-range assertions remain.

No gameplay, server protocol, generated catalog, quest progression, item IDs, accounts or saves were changed. Relic/Eldrite terminology and the ordered fantasy main-story prerequisites remain untouched.

## Fresh evidence

- `npm run build` passed: 4,737 shared entities exported, 36 registered production assets, 147 bundled game assets, 39,664 KiB Worker. Generated tracked files remained byte-identical. Existing npm `http-proxy` environment warning remains.
- The three repaired checks passed individually. The built-asset check exercised 126 startup/registered resources.
- Authenticated two-client integration passed against real Worker handlers with isolated in-memory SQLite: combat, authority/privacy, gathering, observer animation, red/green teleport departure/arrival colors and expiry, doors, trading, delayed delivery and active streams while ordinary polling stalls.
- Database-retention check passed with 100,000 events and ten simulated minutes at 156 public effects per second, preserving unacknowledged receipts. Local/private chat checks passed.
- Read-only live checks around 14:52 UTC on September 19 returned HTTP 200: `/api/status` reported online with zero players; `/api/maintenance` reported open. No maintenance request was created or changed. These are momentary availability observations, not an uptime or load guarantee.

The full current 149-script sweep is recorded separately after completion. The original September 14 report is preserved unchanged.

## Remaining acceptance work

- Sustained **hosted** testing with 39 authenticated players remains unverified. Local SQLite load tests do not certify D1 queues, real network conditions, long-duration uptime or mobile GPU performance.
- Physical-device visual, touch and network checks remain required. Observer tests here execute production rendering functions in local client VMs; they are not a live multi-device capture.
- Actual native-engine integration remains blocked as documented by the migration branch's `migration/VERVESIS-HANDOFF.md`: current Rust/Filament contracts, runnable sample/build and native two-client/export acceptance are still needed. This audit does not resolve or replace that migration.
- No production publication is part of these test-only repairs. Any production publication under this resume request must use the full two-minute countdown, verify the lock, confirm deployment success and reopen the same request. Never reset accounts as a deployment step.

This record is bounded evidence, not a bug-free claim.
