# Latest verification

See `WORK-RUN-2-2026-09-16.md` for the completed full-world visual pass, corrected terrain, final tree counts and complete regression results. The earlier measurements below describe the preceding Phase 2 revision.

# Veldren Phase 2 — fieldwork, relic shaping and woodland

The owner requested completion of the unfinished Phase 2 work. Phase 1 combat, Spirit and HUD changes are retained. This does not begin a third overhaul. Accounts, saves, bank contents, legacy item keys and existing quest progress are preserved. There is no database reset or schema migration.

## Completed behavior

- Mainland woodland keeps all 1,866 original trees, relocates 307 to safe ground and adds 2,336 in clusters, for 4,202 total. Firstlight retains 38 trees. Placement observes water, roads, building/prop clearance, slope and canopy spacing. A generated deterministic cache avoids repeating the placement search each startup.
- Civic pads and road grading support travel while Firstlight’s level yards and authored quarry ramps retain their profiles.
- Trees use shared server generations and timers for stumps, a short regrowth stage and renewed availability. Late arrivals receive current states; unchanged regional snapshots are omitted. SQLite JSON paths in the new snapshot query are corrected.
- Two lodestone seams are added to each of five surface quarries, preserving existing ores.
- **The Well Between Worlds** starts with Arcanist Selene in Briarhaven’s magic school. Search Ironcrown’s library, learn inscription, visit the Fairy Lands lake, bring back evidence and connect a leyline to the school altar. An existing school table and library bookcase are reused.
- **Relic Shaping** is a saved independent skill. Use a chisel with mined lodestone to select one of eight patterns. Inscription produces an unfinished relic; after the quest, the school altar charges it. Patterns unlock at levels 1–65. The completion reward is granted once. Further refinement remains future work under the original design.
- The server checks quest stages, proximity and cooldowns for relic actions and crossings. Permanent stage locks prevent stale saves from repeating a reward with a new event ID. Fairy travel uses the established shared departure and arrival animation.
- Support spells: Trailwind restores energy, Mending Current restores health, and Bondlight adds Spirit resonance. Successful gathering actions have saved milestones at 12, 48 and 120; raw XP awards do not advance them.
- Material names are Charsteel, Windsteel, Deepiron, Eldrite and Wyrmforged while legacy IDs remain stable. Three-piece traits support travel, guard, ward or attunement. Weight and active traits appear in equipment statistics. The server exports the same material and support-spell rules as the browser.
- Magic pages separate combat, support, relic shaping and travel. Compact tabs fit the existing phone HUD. Firstlight has four connected chapters ending with the First Accord while its 38 lesson events and banking substeps remain stable.

## Verification and limits

See `qa/phase2-2026-09-16.json` and `qa/phase2-final-recheck-2026-09-16.json`. This is a focused sweep plus targeted rechecks, not a new complete-suite claim. The full main-story walkthrough reached stage 25, then six fresh-runtime recovery cases completed successfully when run outside the aggregate runner’s four-minute limit. The suite timeout remains documented rather than counted as a pass.

Browser review used the production renderer in a disposable local fixture: Fairy lake/path, school interior and Selene dialogue at 844×390; Magic and compact relic controls at 667×320. The existing HUD and inventory/equipment split remain. Review pages were removed before packaging. These are landscape browser dimensions, not a physical-phone test.

The CPU-only rendering probe measured warm tutorial frames around 5–15 ms and wide mainland frames around 18–35 ms. Cold geometry generation reached approximately 25 seconds at the widest view. These omit actual GPU execution and do not certify device frame rates. Cached woodland placement alone measured about 88 ms versus 7.8 seconds for the placement search.

The local 39-client test completed 6,474 requests across 120 rounds with zero late rounds. **Sustained authenticated hosted capacity for 39 players remains unverified.** In-memory SQLite evidence cannot satisfy that requirement.

A temporary checkout was cleared during the final source sync. The validated release archive survived. All browser text assets and the server catalog were recovered from it; the server module was reconstructed from its unminified bundle with its imports/exports restored. Focused server and gameplay checks were rerun, and the final artifact was rebuilt from the recovered source. Original art assets and all other source history came from the unchanged v116 checkout.

## Publishing

Server and shared-world changes require the existing two-minute maintenance warning, verified lock, publication and reopening under the same request. Preserve all player records. Push the source, build/package that exact state, and mirror the complete tree to private `mxpsrs/emberfall-game` main without rewriting its history.
