# Shared world protocol

World entities, temporary objects and action receipts live in D1. A reset version scopes the world; maintenance preserves it. Nearby clients exchange state through `/api/players` without blocking the rendering loop.

- Stable catalog IDs identify enemies, resources and doors across devices. Catalog generation runs during the build and is checked against an independent game initialization.
- Enemy health, damage rolls, kills, generations and respawn times are committed by the server. Revision comparisons serialize competing actions. Receipts prevent network retries from granting another result.
- One nearby client holds a short lease for enemy movement and attack scheduling. The server bounds position changes and records the selected attack; other clients display that shared state. This remains client-simulated movement, not a continuously running server simulation. Lease expiry clears an abandoned fight.
- Character inventory and health still use the existing character-save system. Committed world rewards/damage are applied through durable receipts, then acknowledged after the character save succeeds. This is not a complete anti-cheat redesign of character saving.
- Enemy and manually dropped loot is omitted from other players' responses for 30 seconds. Pickup permission is checked on the server, including direct requests. A revision-checked pickup permits only one successful claimant per item quantity.
- Fires are visible immediately and leave a single ash pile on expiry. Resources share depletion and respawn. Doors share open/closed state.
- Rowan and huntsman teleports record a permitted departure and a matching arrival. Their cast animations are sent to nearby players. Huntsman crossings retain red effects and do not reset an occupied boss.

## Performance

Interest is limited to 64 nearby world entities. Unchanged entity revisions are omitted from responses; stationary simulation poses only renew their lease periodically. The browser uses the existing spatial index and a cached ID lookup rather than repeated full-world scans.

Character appearances use a bounded 128-entry least-recently-used cache. A 76-character CPU stress test exposed repeated rebuilds with the old 64-entry cache. On the development runtime, the warm pose/material pass improved from roughly 524 ms to 0.37 ms at p95. Synchronization CPU work improved from 3.4 ms to 0.64 ms at p95. These measurements exclude GPU rendering, network latency and physical mobile devices; they are not an end-to-end FPS guarantee.

Run `node tests/server/shared-world.mjs`, `node tests/gameplay/shared-client.cjs` and `node tests/gameplay/shared-performance.cjs` for protocol integration, browser-state handling and the crowded-character benchmark. Existing apprenticeship and mountain quest tests cover their complete offline game paths; the shared-world suite additionally runs real browser combat functions against server transactions.
