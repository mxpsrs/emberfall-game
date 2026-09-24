# Elemental discovery, combat controls and skill feedback

Owner-requested update, 15 September 2026. The playtest freeze is explicitly superseded for this batch.

Implemented:
- Latest follow-up: melee damage awards triple XP, including the Hitpoints share. Accurate/aggressive/defensive train their chosen skill at 12 XP per damage; balanced grants 4 each to Attack/Strength/Defense. Hitpoints grants 4 per damage from melee. Ranged, magic, Worship, damage and accuracy remain unchanged. Existing XP is not multiplied retroactively.
- Removed all spirit discovery actors and their authored creature meshes. Reserved the four historical object IDs so later world resources/tutors retain their identifiers. Existing owned spirits, items and character progress are retained.
- Keeper Sera offers four illustrated choices at the worship lesson: Cinder (Fire), Brook (Water), Zephyr (Air), Cairn (Earth). Any choice completes the bond lesson. Binding produces elemental particles, a matching colored announcement and an elemental sound.
- Successful Firemaking/Fishing/Woodcutting/Mining actions discover their respective originals at 1/12 after the first bond, with a guarantee on a successful action at skill level 10 or higher. A player already beyond level 10 receives a missing original on the next successful action. Quest XP and failed attempts do not roll. Existing shared receipt deduplication protects rewards within the saved receipt lifecycle.
- Rare twins Pyre/Rill/Gale/Flint use the same four elements. After owning the matching original and reaching skill level 11, each successful action has a 1/2,000 chance; no pity timer. Twin abilities: area fire, gradual healing, run-energy recovery, and a longer earth slow.
- Unleash opens the eight portrait choices within the existing chat box. It never opens the old spirit dialog or changes the combat target, path or ordinary attack clock. Independent cooldowns automatically restore each spirit: 30 seconds originals, 45 seconds twins, persisted across reloads. Legacy standby spirits become ready. Convergence uses currently ready spirits and their individual cooldowns.
- Server damage casts have per-spirit clocks independent of normal attacks. New powers, passive bonuses, accuracy rolls and slowing are represented in shared combat. Spirit UI tips reflect actual abilities and cooldowns.
- Level gains trigger a dedicated sound, skill/level popup and brief particle celebration. Nearby simultaneous gains are grouped; popup fades automatically and does not pause gameplay.
- Using raw food on a fire/range cooks that exact inventory item repeatedly, one animated attempt at a time. Dough batches use a range. Burns continue the batch; movement, stop, disappearing fires and scene changes cancel safely. Right-click Cook/Bake shortcuts removed.
- Tracked minimap quest arrows are cyan (#50efff), about 29% larger, with extra edge clearance. World quest arrows remain unchanged.

Verification:
- Full 38-step apprenticeship passes through actual routes, all workbench/food lessons, Sera's choice, banking and mainland departure.
- All four spirit choices, eight definitions, all discovery mappings, level-10 guarantees, level-11 rare twins, no duplicate ownership, no quest-XP rolls, save retention and simultaneous caster-timed effects pass.
- Client and server independent cooldown/concurrent combat checks pass; actual authenticated shared spirit kills still grant correct quest credit and private loot once.
- Chat-container parentage, portrait selection handlers and uninterrupted target/path/attack clock pass under the game's DOM fixture.
- Cooking fire/range/bread batches, mixed inventory, burns, cancellation and expired fires pass.
- XP-driven popup lifecycle, dedicated level sound and elemental sound envelopes pass.
- Existing classic desktop/mobile UI control regression checks pass.

Limits: this environment did not provide a supported interactive browser QA capability. DOM tests and native render/asset checks are not physical-device or 39-player capacity certification. Discovery uses the existing character/receipt architecture; this is not a new anti-cheat system.

Publication requires the in-game warning/countdown and maintenance because this batch changes shared combat behavior and spirit save fields. No schema migration or account reset is part of this update.

Published as v107 at 08:20:54 UTC, 15 September 2026. Runtime source: `dbd74e734c0fe77f35fa67baf36c19b9ad66882e`. Deployment: `appgdep_6aa8ffd2bf5c819191451113df596776`. The earlier v106 was saved but never deployed because the owner added triple melee XP during the countdown. System update `elemental-skilling-20260915` ran countdown → locked → successful publication → confirmed open. Accounts and character saves were not reset. The final build passed all 89 startup resource checks and served the new portrait atlas and stylesheet.
