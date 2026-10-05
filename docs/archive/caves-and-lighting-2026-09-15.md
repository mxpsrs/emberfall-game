# Cave passages, rooms and world lighting — 15 September 2026

Owner-requested repair based on the 00:19 and clearer 01:00 phone recordings. This follows v102; it preserves the full-map, geography, quest/reward and model-picking work already published.

The freight mine had inherited Ork Warrens furniture coordinates despite using a different room plan. Beds and supplies consequently rendered in the void. It now has a connected miners’ refuge with its own furnishing plan and both rescued miners inside it. Underiron also has a separate furniture plan. All 69 cave furnishings are checked against their full rotated footprint and relocated to grounded, unobstructed floor positions where necessary. Existing scene/object identities and progress remain intact.

The original natural boulder wall style is restored. Foreground cutaway changes vertical scale only, leaving horizontal geometry and collision stable. Navigation now blocks 3,435 exposed rock shoulder floor cells, the entrance outcrops and ladder shaft supports. The shared-server catalog also includes these footprints and cave furniture. All cave arenas, story objectives and exits remain connected.

All 11 underground transitions are paired. Actual caves have a physical rock opening outside and a matching opening facing into the cave. Underground mine/crypt/Underiron access has a descending ladder and an ascending ladder in a fixed wall shaft. Primary and context-menu picking use the visible cave-mouth aperture; ladders use rendered geometry. Selecting the mouth automatically routes to its threshold and crosses the transition. The surrounding ground is not an entrance target. Story gates and the two-miner escort requirement remain.

The shader’s player-centered glow has been removed. All 11 current caves have visible wall torches (252 fixtures), with light sources at their flame positions. Existing lanterns, permanent and player-built fires, hearths, ranges, furnaces and luminous cave crystals contribute world-space light. Expired fires stop lighting the world. Current caves do not require a carried torch. No new torch item or inventory requirement is introduced. House interiors stay well lit at night, including walk-in rooms and Firstlight Isle, and visible indoor lanterns make the lighting legible. Nearby point lights and room bounds are capped at 16 and 12 per draw for bounded renderer cost.

Validation passed:

- `cave-passages.cjs`: 11 paired transitions, 36 projected apertures, all 69 furnishings, solid shoulders, arena/objective routes, story gate, context options and red interaction feedback.
- `cave-render-clicks.cjs`: six actual production-renderer mouth clicks select, route and cross both directions without another ground click.
- `world-lighting.cjs`: all cave fixtures have colocated light sources; source positions stay fixed as the player moves; built-fire creation/expiry, village lanterns, every walk-in house and tutorial room, separate interiors and bounded GPU light counts.
- `main-story.cjs`, `mountain-quest.cjs`, `quest-cohesion.cjs`: story progression/rescue, both mountain chapters and all eight village quests.
- `model-picking.cjs`, `video-feedback.cjs`, `encounters.cjs`: canopy/body selection, click feedback, restored wall collision, rescue targets, boss paths/combat and reachable loot.
- `world-cohesion.cjs`, `walk-in-controls.cjs`: 193 furnished houses, tutorial ranges, forests, water/bridges, 13 connected settlements, manual doors and interior routes.
- `renderer-gl.cjs`, `android-rendering.cjs`, `desktop-rendering.cjs`: GPU geometry/shadow/color passes, cache reuse, CPU skinning fallback and rendering budgets.
- `built-assets.mjs`, `quest-shared-credit.mjs`, `shared-world.mjs`: final Worker/startup assets and authenticated local integration for quest credit, shared combat, doors/resources, fire lifecycle and private drops.

Offscreen native OpenGL ES renders were reviewed for the freight refuge, interior cave mouth, ladder shaft, village at night and Firstlight kitchen at night. These use production geometry and shaders. They are not physical-phone browser tests, and this focused repair does not claim a fresh full-suite run or hosted 39-player capacity certification. Initial test-harness omissions (Path2D/minimap and tutorial re-entry state) were corrected; final targeted checks pass. No account reset, maintenance lock or database schema change is included.

Publication: v103 succeeded at 06:33:04 UTC on 15 September 2026. Runtime source `e51e911b871960ee941bdc96023069601e97ca3b`; deployment `appgdep_6aa8e6905200819196298856611c2772`; environment revision 4. Production URL: https://emberfall-realms.rayfgarrison97.chatgpt.site.
