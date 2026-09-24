# Arc One: The Awakening of Veyr

Owner-directed rebuild, 16 September 2026. This supersedes the previous five opening main quests while preserving their saved stage boundaries and all unrelated quest chains. The owner explicitly retained the freight-lift teaching sequence and requested independent quest-journal selection.

## Playable sequence

| Quest | Gameplay and connection | Requirements | Guaranteed reward |
| --- | --- | --- | --- |
| Orders of the Dead | Interview Tovin; investigate the damaged courier wagon, body, cut harness and prints; follow the trail through the fortified paid-raider camp; hand forged orders to Rellan. Payment and cargo evidence point toward Ironhollow. | Firstlight Apprenticeship; recommended Combat 8 | 200 coins; 250 Attack, 250 Defence, 150 Hitpoints XP; Rellan’s Signet Ring |
| The Last Shift | Surface rescue camp and waiting family; winding mine route, falling-stone warnings, disturbed crawler, salvaged iron, underground anvil, lift controls, concealed excavation and a physical two-worker escort. False closure orders hid the intruders’ dig. | Previous quest; Mining 5, Smithing 5; recommended Combat 10 | 300 coins; 400 Mining, 400 Smithing, 200 Hitpoints XP; Ironhollow Miner’s Belt |
| Whispers at Hollow Shrine | Isolated pilgrim approach and ruined court; buried pilgrim halls and eastern archive; distributed oathstones and visible memory manifestations; evidence-based memory comparison; Echo Shade fight and physical Memory Shard. | Previous quest; Magic 5; recommended Combat 12 | 400 coins; 500 Magic, 250 Hitpoints, 250 Worship XP; Whisper Pendant |
| The King Beneath the Mountain | Maerin studies the shard; investigate three actual Ironhollow homes; repair outer service access; traverse occupied Wardkeeper halls, agents, barricades and camps; recover field orders, defeat Watcher, reach Edda and protect survivors; reach the final prison seal too late. | Previous quest; Mining 8, Smithing 8, Magic 8; recommended Combat 15 | 600 coins; 600 Mining, 600 Smithing, 600 Magic, 300 Defence, 300 Hitpoints XP; Wardkeeper Cape |
| The Borrowed King | False commands and impossible voices affect known NPCs; Alaric explains his earlier mistake; prepare counter-ward; three substantial Sanctum halls test remembered facts and Spirit reactions; three-phase Veyr battle; recover the enemy’s multi-site survey chart and report back. | Previous quest; Magic 10, Worship 8, any usable owned Spirit; recommended Combat 18 | 1,000 coins; 750 XP each in Attack, Strength, Defence, Hitpoints, Magic, Ranged and Worship; Veilbreaker Ring |

The lift explicitly retains **ventilation → forged locking pin → secured brake → seated counterweight → opened refuge ramp**. Controls use visible, interruptible work actions, a readable safety plate and safe rejection of the wrong order. Investigation and escort surround that teaching sequence.

## Narrative boundaries

Veyr did not commission the courier attack, forged orders or mine sabotage. Unknown living agents deliberately seek ancient prisoners. Their identities, command structure, headquarters, size, ideology and ultimate purpose remain unrevealed. Characters suspect destabilization; they do not present it as confirmed motive.

Edda names Veyr after the Underworks investigation. The final-seal sequence explicitly shows an operative removing the last ward-pin. The player never breaks that protection. The operatives escape as the ward fractures. A dead mother’s voice and false orders in Rellan’s voice demonstrate Veyr’s use of trust before combat.

The Echo Shade feeds on the phenomenon; it is not its source. The final victory over Veyr is real. The physical enemy chart establishes several other marked prison sites without naming every being or immediately starting another monster hunt.

## Journal and persistence

- Opening an entry changes only the viewed quest. Routine renders retain the selection.
- “Show me where” explicitly tracks that entry’s own objective. Locked chapters show prerequisites without redirecting to the current main quest.
- Briarhaven and Stoneford quests can be accepted, progressed, completed and tracked alongside the main arc. Their existing internal prerequisites remain.
- Forged Orders remain recorded after Rellan receives the document. The Memory Shard uses normal inventory/bank ownership and is handed to Maerin; pre-rebuild records remain compatible.
- `mainStoryQuest` boundaries remain 0–25, now version 3; `mountainQuest` boundaries remain 0–20, now version 2. Existing progress is retained and historical completions are marked rewarded to prevent repeated coins or XP. Missing bound wearables can be recovered from their designated NPC.
- Full inventories send guaranteed items and overflow quest coins to the bank. Recovery checks bag, worn gear, bank and existing local ground ownership. No account or character reset is required or performed.

## Wearables and balance

| Item | Slot and effect | Recovery |
| --- | --- | --- |
| Rellan’s Signet Ring | Ring; +1 armour | Rellan |
| Ironhollow Miner’s Belt | Tool-belt wearable; +2 percentage points Mining success, within the normal cap; fitted tools remain intact | Hesta |
| Whisper Pendant | Amulet/neck; +2 Magic and Worship accuracy; subtle glow near disturbed memories | Ilyra |
| Wardkeeper Cape | Cape; +3 armour, +4 Magic defence; silver three-point design | Edda |
| Veilbreaker Ring | Ring; +2 armour, +1 melee/ranged/Magic accuracy; one extra second of Spirit insight | Alaric |

These rewards are bankable and character-bound. Player trading, shop selling and manual public ground drops reject them; destruction provides an explicit confirmation. Ring, cape and wearable belt presentation use the regular equipment panel and shared-player equipment payload. Existing permanent tool-belt tools and old equipment migration are retained.

The previous source had an accuracy-10 Magic-1 Oak staff but no higher ordinary Magic weapon. The Orb uses accuracy 18 at Magic 20, unchanged spell damage, unchanged relic costs and the existing five-tick magic cadence. A successful cast adds a four-second memory fracture worth +6 follow-up accuracy against that target. This is implemented in both local and authoritative combat.

Modest conventional Magic/Defence-40 shop upgrades (accuracy-28 Mystic staff, Tempered signet, Scholar’s mantle and Scholar’s amulet) keep the arc equipment from being permanent best-in-slot. Existing melee/ranged tiers, spell damage and resource requirements are unchanged.

## Veyr encounter and drops

Three phases: Borrowed Authority, Fractured Trust, The Stolen Self. Borrowed commands contradict persistent, solid ground warnings. The ring attack has a safe centre and outside area; cross attacks can be escaped diagonally. Warning times are at least 2.6 seconds for the new deceptive spells. Phantom people repeat gestures and cast no shadows; Spirit insight temporarily exposes their hollow outlines. In the last phase Veyr copies the current player’s appearance and equipment. Any ready Spirit can provide information; it does not choose puzzle answers or move the player.

Alaric maintains three visible counter-ward lights, mitigates damage, heals, contributes non-finishing damage and interrupts hazards. The server validates counter-ward interruption and restricts it to the canonical assisted fight.

Veyr’s Orb is **exactly 1/250 (0.4%) on every kill**, including the first story kill. No first-kill boost, pity, guaranteed Orb or quest reward path exists. It uses normal ground loot, normal bag space, the existing 30-second owner period, bank storage and player trading. Equip requires Magic 20. A distinct Orb mesh/icon and orbiting memory-projectile effect accompany its special accuracy mechanic.

Rook unlocks repeat Veyr hunts only after completing The Borrowed King. Repeats grant ordinary boss loot and combat experience, without replaying quest coins, quest XP, guaranteed wearables or canonical world changes. The historical automatic Veyr first-clear coin bonus is removed; the requested quest coins remain separate from normal ground loot.

## Verification

Real-frame local walkthroughs cover all five quests, actual routes, lift order, cancelled work, both miners, physical transitions, clues, wrong answers, death/retry, final-seal timing, Alaric assistance, completion and repeat travel. Additional focused tests cover journal clicks and rerenders, concurrent side-quest completion, rewards, all usable Spirit identities, bank overflow/recovery, equipment and icons, all story markers, server phase gates, authenticated client quest credit, observer animation, multiplayer loot, trading and receipts.

The exact rare-drop boundaries, lucky/unlucky story and repeat server kills, 30-second ownership, receipt replay and canonical-state isolation are tested deterministically. Offline production-mesh review renders inventory icons and both body types from front, side and back. No browser visual QA or hosted 39-player capacity certification is claimed by these local checks.

Reproduce the new focused checks with:

```sh
node scripts/check-game.mjs main-story.cjs mountain-quest.cjs quest-journal-selection.cjs arc-rewards.cjs arc-boss-loot.mjs
node scripts/review-arc-one.cjs .qa/arc-one
npm run build
```
