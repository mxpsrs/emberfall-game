# World, quest rewards, and recording repair — 15 September 2026

Raymond explicitly requested this update during the playtest freeze. This continues the quest-cohesion repair published in v100; no character resets or database migrations are part of this release.

## Quest completion

All four Briarhaven quests, four Stoneford quests, three mainland story quests, both mountain quest chapters, Firstlight graduation and first-clear hunts queue a completion panel naming the completed quest and showing the exact coins, skill XP, items and unlocks granted. A short fanfare plays when the panel opens and respects existing sound controls. Conversation windows finish before the celebration appears. Reduced-motion preferences suppress entry animations.

Coins and quest XP are increased by 40%; stackable tutorial supplies are increased with whole-item rounding. Unique equipment remains one item. This applies to new completions, without regranting rewards for previously completed quests. Completion guards remain in the granting handlers; the panel is presentation only. Full coin bags send overflow to the bank, and the panel reports the banked amount.

Brook's +8 maximum-health bonus remains intact. Base Hitpoints level, current health and the bonus continue to be distinguished by the v100 HUD explanation.

## World and atlas

The map opens to the whole mainland with an offshore Firstlight inset from every scene. It supports drag, pinch, wheel and button zoom, plus a whole-world reset. All three kingdoms and all thirteen settlements have labels. Houses, actual tree and rock locations and bridges appear on the map; zoom reveals additional detail and service markers. Map exploration does not switch the player's scene or teleport them. Long mainland routes use a bounded weighted search; local/combat routing retains the unweighted heuristic.

Actual walkable geography now follows broad bays, headlands, winding rivers and four lakes. Existing bridges anchor the river paths. All building footprints remain dry. Noncritical scenery and stranded ground loot are moved off newly formed water. Critical quest objects are never silently discarded.

Six woodland regions contain 1,273 authored, deterministically placed forest trees. Town lots and roads have clearances and sparse nearby trees. All 193 walk-in interiors are included in the furnishing pass, including Firstlight: ranges and storage stand by walls, furniture is spaced, and doorway-to-center aisles remain clear. Unfittable incidental decorative props are removed; quest props and cooking ranges are preserved.

## New recording and click feedback

Reviewed `ScreenRecording_09-15-2026 00-19-17_1.mp4` (79.6 seconds), including its mine entry, repeated out-of-reach responses, camera turns and character occlusion beside cave walls.

- Yellow animated X marks a walking click/tap; red marks an object or character interaction. Feedback remains at the actual screen coordinate, expires after 650 ms and does not trigger from camera drags, pinches or modal taps. Context-menu actions also mark their world target.
- Cave wall rocks previously scaled horizontally with wall height, extending into navigable tiles. Stacked rock faces now fit the blocked wall tile, with a solid backing and lower foreground cutaway. This removes the visible mismatch without allowing traversal through walls.
- Mainland cave outcrops now have collision matching their rock footprints while preserving the tunnel approach. Existing saves inside corrected scenery recover to nearby free ground without changing inventory, quests or character progress.
- Chat tabs now participate in the chat card's layout. They no longer inherit the absolute positioning of the global game header and overlap the message log.

## Verification and limits

**108 of 108 automated checks passed** (107 source test scripts and the final built-asset check). The final automated results are retained in `docs/qa/world-rewards-2026-09-15.json`. Coverage includes every implemented quest chain, all 38 tutorial lessons, one-time reward guards, full bags/banks, save/reload, shared quest authority, combat, 193 interiors, all settlement and house connections, actual atlas label rendering, map gestures, click feedback, camera gesture cancellation, cave floor picking at five angles, rescue objective routes, cave mesh bounds and mainland entrance routes.

Native visual review used production geometry, textures, shaders, lighting and shadows for both kitchens, the coastline and the corrected freight mine, plus the production canvas atlas. These are offscreen renders and automated input checks, not physical-phone browser QA or a live hosted capacity test. The existing requirement for 39 simultaneous hosted playtesters remains unverified by this release.

The earlier audit had two stale test expectations/fixture issues (old Varkesh reward and a duplicate mountain-script reload); both were corrected and the complete suite rerun. The new cave-route check also exposed the long-distance route-search limit, which was repaired before the final audit.

## Publication

v101 succeeded at 05:43:40 UTC on 15 September 2026. Runtime source: `4b1a501f32491eb6e1af505166255db74068492e`. Deployment: `appgdep_6aa8dafabde08191b4824f3fecbefda0`. Production URL: https://emberfall-realms.rayfgarrison97.chatgpt.site. No maintenance lock or character reset was used.
