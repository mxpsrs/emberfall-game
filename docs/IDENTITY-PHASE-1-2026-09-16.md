# Veldren identity pass — Phase 1

Implemented against the current Arc One build. This pass changes combat attunement, Spirit progression, combat replication and interface presentation. It does not change quest sequencing, the mine lift lesson, skill thresholds, spell progression, equipment progression, tutorial objectives, account records or the database schema. The independent quest journal remains available alongside the main story.

## Spirit builds and Worship

A build now combines weapon/style, character stats and **one attuned Spirit**. Collecting more Spirits unlocks choices instead of stacking every passive. Attunement changes require five seconds out of combat and are blocked during trading. The passive remains active during Unleash recovery.

| Spirit | Attuned interaction at bond I | Unleash retained |
| --- | --- | --- |
| Cinder / Kindle | Every fourth damaging weapon hit on one foe adds 1 damage | Focused fire strike |
| Brook / Undertow | 4 maximum health; every fifth damaging hit heals 1 | Immediate healing tide |
| Zephyr / Farwind | 15% less running energy; 4 accuracy for ranged/magic at least 3 tiles away | Wind strike and slow |
| Cairn / Bedrock | 4 armour; reduce incoming hits of 4 or more by 1 | Temporary Stoneguard |
| Pyre / Crossfire | Switching successful weapon styles adds 1 damage, at most once per 6 seconds | Small-area fire burst |
| Rill / Quiet current | 1 armour; every fourth damaging hit heals 1 | Healing over time |
| Gale / Slipstream | 20% less running energy; 2 distant accuracy; every fourth damaging hit restores 4 stamina | Second wind |
| Flint / Fault | 2 armour; every fifth damaging hit adds 2 damage and slows for 1 second | Earth strike and slow |

Chains belong to a foe and expire after 12 seconds without a damaging weapon hit. Misses and zero-damage rolls remain zero; they do not advance a chain. Existing attack intervals, ranged/magic starting distances, hit-based combat XP (including current triple melee XP), returning/regenerating monsters and weapon progression remain in place.

Bond II requires 80 resonance and Worship 5; bond III requires 240 resonance and Worship 12. Ranks improve the listed passives modestly; the Spirit panel explains the exact improvement. Damage grants 1 resonance and 1 Worship XP; successful gathering in the attuned element grants 2 resonance and 1 Worship XP; completed bone remembrance grants 4 resonance alongside its existing 18 Worship XP. Quest XP and failed actions do not generate resonance. Progress is saved with the owned Spirit. Delayed combat receipts credit the Spirit that earned them, even after a later attunement change.

Firemaking, Fishing, Woodcutting and Mining discovery, rare Twins and independent 30/45-second Unleash cooldowns remain. Convergence uses at most two ready Spirits, prioritizing the attuned one; the server enforces that limit. Worship no longer gives every build the same passive armour simply for leveling. Brook's old collection-wide +8 health is replaced with a persistent attuned +4 to +6 sustain build as part of this balance pass.

## Shared combat

Pure build/strike/guard functions are exported from the browser source to `worker/spirit-rules.js`; server and local combat share the same rules. The server calculates accepted passive damage, healing/stamina receipts and slows. Existing receipt deduplication prevents duplicate damage, healing or bond XP on retry or reload. Per-foe resonance state is bounded, expires and stays out of public snapshots.

Spirit casts publish immediately through the existing activity endpoint and have an independent visual cache, so a simultaneous normal attack cannot erase the elemental effect. Observers animate the acting character and render Fire, Water, Air and Earth effects from the public action's coordinates, without requiring the target NPC locally. Passive effects and player damage feedback also survive missing/phased NPCs; hidden NPC health and identity remain private. Existing attack, projectile, teleport, day/night, combat-claim and post-combat trading behavior remains covered by regression tests.

## Interface

The HUD uses blue field panels, pale line symbols, asymmetric corners, system typography, a horizontal lower command ribbon, split health/stamina/Worship/coin information and a permanent Spirit build card. The top-right minimap grows to 188px on desktop and 144px on compact landscape layouts. Worn equipment uses a labeled kit grid with proper empty ring, cape and belt glyphs. Spell cards, inventory, banks, menus and tooltips share the palette.

All panels remain available; equipment stays separate from inventory. Right-click, mobile long press, running, camera controls, chat channels, coin pouch, minimap/world map, settings and logout handlers are retained. Compact layouts preserve access to the coin pouch beside open panels. Quick Unleash choices occupy the central panel space on mobile and return to chat when closed. No external asset imports were made; the new functional glyphs and particle effects are authored in code, and existing asset attribution is retained.

## Verification and repairs

The initial full sweep ran 135 scripts. Final coverage adds the authoritative Spirit receipt test, giving 136 distinct test scripts. See `qa/identity-final-2026-09-16.json` for the final aggregate of the full sweep and targeted reruns, and the separate initial/baseline/recheck reports for failures and their disposition.

New tests cover all eight builds, discovery/progression conditions, switching restrictions, saved progress, miss preservation, local/server parity, server procs, recovery during cooldown, delayed and duplicate receipts, the Convergence cap, hidden-target replication and eight real immediate Unleash broadcasts between authenticated clients. Existing tests cover movement, camera/long press, doors, banking/item use, trading/following, private/local chat, drops, equipment visibility, tutorial, Arc One, Veyr loot, reconnect/logout and shared time. A deterministic random source makes the existing two-client monster-animation scenario reproducible.

Several older fixtures still expected removed Spirit world actors, old quest rewards/dungeon sizes, instantaneous cooking or incomplete canvas bounds. These were corrected to assert the current behavior. Eight of ten investigated cases failed on the unchanged starting commit as well; the daylight-dependent lantern fixture was made deterministic. New headless HUD mocks, the intended Brook balance expectations and one test variable collision were also corrected. Runtime review fixed panel/coin overlap, desktop map-button overlap, quick-Unleash/status overlap and missing empty equipment glyphs.

Supervised browser QA used the actual production 3D renderer in a disposable, account-free local fixture at 1280×720, 844×390 and 667×320. Checked inventory, bank deposit/withdrawal, worn equipment, spellbook/teleports, independent side-quest selection, settings, right-click menus, attunement and a wolf fight with Unleash and ground loot. Browser error review found extension metadata errors only, with no game-origin errors. Disposable review pages are excluded from the build.

Limits: mobile checks use landscape browser dimensions and input-handler tests, not a physical phone. Multiplayer tests use authenticated clients and SQLite locally, not live hosted latency or capacity. The local 39-client and database-retention tests pass, but do not certify the separate 39-player hosting requirement. New Spirit balance still benefits from sustained player feedback. No Work Run 2 overhaul has begun.

## Publication

This changes server/shared combat behavior and therefore requires the established two-minute warning, verified maintenance lock, deployment, and reopening under the same request. Preserve all character saves; no reset or migration. Commit the exact verified source and mirror its complete tree to the connected private GitHub main branch without replacing existing history.
