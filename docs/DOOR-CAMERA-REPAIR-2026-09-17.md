# Door visibility, castle access and manual camera

The owner rejected automatic camera movement in v124 and requested roof/upper-floor removal when opening a door. The owner also reported that every castle was inaccessible.

## Repair

- Removed automatic obstruction-driven camera pitch entirely. The camera uses the angle selected by the player, including during door interaction, entry and exit.
- Opening a walk-in building door hides its roof and upper storeys before entry. Closing it after leaving restores the exterior. Closing a door while still inside keeps the occupied ground floor visible.
- Castle gates now reveal all ground-floor room roofs and upper coverings together. Ground-floor walls, curtain walls and towers remain intact.
- Found that the dynamic door renderer explicitly skipped castles, while their closed gate collision and invisible click polygons remained active. Restored the visible animated gate leaves and aligned their render/click transform with each real navigation threshold.
- Fixed door culling to use the door's screen position rather than the building's distant corner. This also protects entrances of other large buildings.

## Evidence

- `tests/door-access.cjs`: 233 building doors across the instantiated scenes pass actual open, walk inside, walk outside and close actions. All three castle gate meshes are emitted, their visible targets select the real door, and clicking those targets opens the gate and permits entry.
- `tests/environment-architecture.cjs`: twenty buildings × ten door/roof cycles; castle structural coverage; no camera pitch changes on entry; matching manual-pitch terrain picking.
- `tests/walk-in-controls.cjs`: all four door orientations, real floor-click entry, bank/school/kitchen access, exit and cancellation pass.
- `tests/civilization-server.mjs`: authenticated opening and inside closing succeeds for every castle gate; the other client receives each updated door state. Castle/inn/watchtower floor sharing, preserved saves and quarry replication also pass.
- The final build and `tests/built-assets.mjs` pass. All 96 startup resources validate; the 4,737-entity generated shared catalog and Worker sources remain byte-for-byte unchanged.
- The first all-door audit incorrectly attempted Firstlight with a mainland-complete tutorial state, which redirected its scene. The fixture now sets the appropriate tutorial state and asserts the requested scene before testing. The six initial fixture failures are not presented as six repaired production obstructions.

This is a client rendering/input repair. Navigation coordinates, shared entity identities, server door protocol, accounts and saved characters are preserved. No maintenance disconnect or reset is required. Exact publication IDs are reported after the hosting service confirms success.
