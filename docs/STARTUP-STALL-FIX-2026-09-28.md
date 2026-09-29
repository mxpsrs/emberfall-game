# Startup stall follow-up — 28 September 2026

The v209 iPhone report showed a loading screen without an error. Current assets
and account requests succeeded. A local CPU profile reproduced a long,
synchronous world construction/migration chain: 203.3 seconds in the VM fixture,
including about 44 seconds constructing the world. It repeatedly serialized
native records to measure and then copy them, and rebuilt existing projections
and terrain indexes after every migration category.

The browser bridge now copies native JSON in one call when its buffer fits,
retaining a size hint and retrying larger records. Immutable entity snapshots
use nested maps. Native writes remain immediately visible. Bootstrap coalesces
derived-view notifications across the twelve migrations, with a single final
refresh, and yields a paint/input turn between stages in both game and editor.
Loading labels are visible. No server rules, accounts or saves changed.

Validation:
- Native bridge: simulation, hierarchy, rejected edits, growing JSON records,
  asynchronous notifications and cleanup after rejection passed.
- Road and gatherable ownership, transforms, lifecycle and save/load passed.
- Saved live world revision 26 completed migration in 75.8 seconds in the VM
  fixture; a repeat measured 78.3 seconds. These are local diagnostic timings,
  not physical-phone measurements.
- The complete saved-world fixture retained resource IDs/positions and passed
  exact canonical serialization/reload (4,376 resources, 4,697 road segments,
  234 buildings, 770 spawns and 40 services).
- Normal production build and all 125 built startup-resource checks passed.
- Graphical browser acceptance was attempted but blocked before launch by the
  execution environment (socket permission denied). No graphical browser or
  physical iPhone pass is claimed. The opt-in startup browser test is retained
  for an environment that supports Chromium.
