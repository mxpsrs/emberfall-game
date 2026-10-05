# Veldren source history through v95

Exported from the authoritative source repository. Full commit messages and changed paths are retained below; runtime checkpoint a99ea71e7b1d58fa3abe3210e802feb569e74dd7.

## 3a2a90168962e0632d34c81c62e0790af17a2cda

Date: 2026-09-07T17:39:13+10:00

Build Emberfall touch RPG


A	.openai/hosting.json
A	client/game.js
A	client/index.html
A	client/style.css
## 07a90d9849fd19c5a41ef98c3e0b8f6744cbb71a

Date: 2026-09-07T17:57:54+10:00

Add illustrated RPG world, character creation, tutorial and enemies


A	client/assets/bounds.json
A	client/assets/characters.png
A	client/assets/environment.png
A	client/assets/terrain.png
M	client/game.js
M	client/index.html
M	client/style.css
## 914a66242a4301276db10b7141938154df3448a2

Date: 2026-09-07T13:19:54-05:00

Add character animations, visual equipment, ranged and magic combat


M	client/assets/bounds.json
A	client/assets/items.png
A	client/assets/poses.png
A	client/assets/walking.png
M	client/game.js
M	client/index.html
M	client/style.css
A	client/systems.js
## 781d5b9894d089c6e24b135ef92305c1d55f72ce

Date: 2026-09-07T12:13:18-07:00

Make landscape game HUD with fixed paginated inventory and controls


M	client/game.js
A	client/hud.js
M	client/index.html
M	client/style.css
M	client/systems.js
## 6cb5f428274e1fdc3a4b8807ffea0e22c640e365

Date: 2026-09-07T12:19:59-07:00

Shrink translucent HUD and add live minimap


M	client/game.js
M	client/hud.js
M	client/index.html
M	client/style.css
## c4a09f5fb62a3466cbe0963f5497651ac93e6558

Date: 2026-09-07T12:38:04-07:00

Expand living world with town, farms, interiors, mine, crypt and ambience


M	client/game.js
M	client/hud.js
M	client/index.html
M	client/style.css
M	client/systems.js
A	client/world.js
## aa09b607941ff0b3ba948e6de64c5c8e6d22149a

Date: 2026-09-07T12:47:36-07:00

Collapse menus and integrate health with the minimap


M	client/hud.js
M	client/index.html
M	client/style.css
## 7289e082e2e69088c823fcada7ec55774ba25b9b

Date: 2026-09-09T17:14:53+08:00

Add collectible elemental spirits with abilities and summons


M	client/assets/bounds.json
A	client/assets/spirits.png
M	client/game.js
M	client/index.html
A	client/spirits.js
M	client/style.css
M	client/systems.js
M	client/world.js
## 042385dcdcb863a09208a2d7440a97a1e6fe85d8

Date: 2026-09-09T17:19:23+08:00

Render equipped gear at animated body and hand anchors


M	client/game.js
M	client/systems.js
## 446d20004b93ec6d776b209974ee58069d123b81

Date: 2026-09-09T13:53:29-04:00

Expand RPG with ground loot, 25-slot bag, polished art, quests and account saves


A	.gitignore
M	.openai/hosting.json
A	db/schema.ts
M	client/assets/bounds.json
M	client/assets/environment.png
A	client/assets/heroes.png
A	client/assets/monsters.png
A	client/cloud.js
A	client/frontier.js
M	client/game.js
M	client/hud.js
M	client/index.html
A	client/loot.js
M	client/spirits.js
M	client/style.css
M	client/systems.js
M	client/world.js
A	drizzle.config.ts
A	drizzle/0000_amazing_black_bolt.sql
A	drizzle/meta/0000_snapshot.json
A	drizzle/meta/_journal.json
A	package-lock.json
A	package.json
A	scripts/build.mjs
A	tests/gameplay/game.cjs
A	tests/rendering/render.cjs
A	tests/server/saves.mjs
A	worker/api.js
## f21ed9aaeb5436f945cc498c60444f3836edcfd8

Date: 2026-09-09T13:54:18-04:00

Use the supported D1 binding manifest format


M	.openai/hosting.json
## c67a1d5810ccf3ce9364527ec5774ef61fe98b25

Date: 2026-09-09T14:00:16-04:00

Recover missing sign-in and confirm character creation saves


M	client/cloud.js
M	client/game.js
M	client/index.html
M	client/style.css
A	tests/server/account-flow.cjs
M	worker/api.js
## e25833883509af5d2002d50d35b086da5127bbd5

Date: 2026-09-09T14:04:57-04:00

Recognize Sites email identity and open creation for empty accounts


M	client/cloud.js
M	client/game.js
M	tests/server/account-flow.cjs
M	tests/server/saves.mjs
M	worker/api.js
## eb18c898d944f59f293d89ad20602b194eb032c0

Date: 2026-09-09T14:19:41-04:00

Add orbiting 3D world camera and articulated fitted equipment


M	client/game.js
M	client/hud.js
M	client/index.html
M	client/style.css
A	client/view3d.js
A	tests/gameplay/view3d.cjs
## 7797685db47adec24c214c68aa4b8cff57c7676e

Date: 2026-09-10T08:25:56+09:00

Refine fantasy models with rounded anatomy, shaped armor and organic scenery


M	client/view3d.js
## ec49e757c666e65482d0817ea09960eae83c988c

Date: 2026-09-10T08:29:40+09:00

Pick up ground loot directly without modal menus


M	client/game.js
M	client/loot.js
M	client/view3d.js
M	client/world.js
A	tests/gameplay/loot-interaction.cjs
## 95a4d2fd7362a67a363d45f02d7b83cb3153d873

Date: 2026-09-10T08:33:02+09:00

Use tap actions and hold menus for items and click-to-walk minimap


M	client/hud.js
M	client/index.html
M	client/style.css
M	client/systems.js
A	tests/gameplay/item-input.cjs
## 773d75c1421da9e64b0f8545b09bfb0a6bccced4

Date: 2026-09-10T08:35:24+09:00

Fix frame loop crash on arrival after movement


M	client/game.js
A	tests/gameplay/movement-loop.cjs
## 6b193caa56dbb3d529a941f58df2b5fbffb186aa

Date: 2026-09-10T00:11:27-05:00

Add online player presence, guest characters and defined world architecture


M	db/schema.ts
M	client/index.html
A	client/multiplayer.js
M	client/style.css
M	client/view3d.js
A	drizzle/0001_overjoyed_warbird.sql
A	drizzle/meta/0001_snapshot.json
M	drizzle/meta/_journal.json
M	scripts/build.mjs
A	tests/server/multiplayer.mjs
M	tests/server/saves.mjs
M	worker/api.js
## 11dac7c022a2970e6e9ddbd2cbfd625354c3a415

Date: 2026-09-10T00:59:55-05:00

Cache scenery and terrain, scale distant detail, and enable building entry taps


M	client/view3d.js
A	tests/world/building-entry.cjs
A	tests/rendering/render-benchmark.cjs
## 9c7cda3c85a707cec9c8b2ddfde2d7f7b634db27

Date: 2026-09-10T01:09:15-05:00

Rebuild town architecture foliage creatures and equipment with cohesive fantasy materials


A	client/art-direction.js
M	client/index.html
M	client/style.css
M	client/systems.js
M	client/view3d.js
M	tests/world/building-entry.cjs
M	tests/rendering/render-benchmark.cjs
M	tests/gameplay/view3d.cjs
## 79a4d910d60a5f50796298c46770fb19a26f1238

Date: 2026-09-10T19:19:29+09:00

Add GPU world rendering and independent combat skill progression


M	client/art-direction.js
M	client/cloud.js
M	client/game.js
M	client/index.html
A	client/renderer-gl.js
M	client/style.css
M	client/systems.js
M	client/view3d.js
M	tests/world/building-entry.cjs
A	tests/gameplay/combat-skills.cjs
M	tests/rendering/render-benchmark.cjs
A	tests/rendering/renderer-gl.cjs
M	tests/gameplay/view3d.cjs
## a75fd35fe885f9f8eaa32ff3ec13b7765fd967e6

Date: 2026-09-10T19:45:26+09:00

Expand to three kingdoms and replace architecture and character model library


M	client/game.js
M	client/index.html
A	client/kingdoms.js
A	client/realm-models.js
M	client/renderer-gl.js
M	client/view3d.js
A	tests/world/kingdoms.cjs
M	tests/server/multiplayer.mjs
M	tests/rendering/renderer-gl.cjs
M	worker/api.js
## 45797fded782e2e4179a1ecc68029f41589883f0

Date: 2026-09-10T15:42:24-04:00

Replace Briarhaven primitives with authored town and skinned character assets


M	.gitignore
A	client/assets/briarhaven/CREDITS.txt
A	client/assets/briarhaven/hero-LICENSE.txt
A	client/assets/briarhaven/models.js
A	client/assets/briarhaven/town-LICENSE.txt
A	client/briarhaven-art.js
M	client/index.html
M	client/realm-models.js
M	client/renderer-gl.js
M	client/view3d.js
A	scripts/assets/import-briarhaven-assets.py
A	tests/world/briarhaven-art.cjs
## 1d568581815c41c131ff1bcf769df34251491210

Date: 2026-09-10T15:55:06-04:00

Extend authored art across all kingdoms, crossings, residents and interiors


M	client/assets/briarhaven/CREDITS.txt
A	client/assets/briarhaven/dungeon-LICENSE.txt
M	client/assets/briarhaven/models.js
M	client/briarhaven-art.js
M	client/view3d.js
M	scripts/assets/import-briarhaven-assets.py
A	tests/world/world-art.cjs
## 6b48fa461ed457b3fd8c2eb074ed4b413b77f597

Date: 2026-09-11T02:47:00-05:00

Rebuild realms with textured architecture and character creation; reset owner progress


A	client/assets/realms/CREDITS.txt
A	client/assets/realms/atlas.png
A	client/assets/realms/models.js
M	client/briarhaven-art.js
A	client/character-creation.js
M	client/game.js
M	client/index.html
M	client/multiplayer.js
A	client/realms-rebuilt.js
M	client/renderer-gl.js
M	client/style.css
M	client/view3d.js
A	drizzle/0002_owner_fresh_start.sql
M	drizzle/meta/_journal.json
M	scripts/build.mjs
A	scripts/assets/import-realms.py
M	tests/server/account-flow.cjs
A	tests/world/rebuilt-world.cjs
M	tests/rendering/renderer-gl.cjs
M	worker/api.js
## 4b57cfbefc8304513f6fd125d058977ff3e924c5

Date: 2026-09-11T03:09:29-05:00

Add physical terrain and walk-in buildings with roof cutaways; distinguish enemies and correct grips


M	client/assets/realms/models.js
M	client/briarhaven-art.js
M	client/character-creation.js
M	client/cloud.js
M	client/game.js
M	client/hud.js
M	client/index.html
M	client/kingdoms.js
A	client/organic-world.js
M	client/realms-rebuilt.js
M	client/renderer-gl.js
M	client/view3d.js
A	client/walk-in-world.js
A	client/world-depth.js
M	scripts/assets/import-realms.py
M	tests/server/account-flow.cjs
M	tests/server/multiplayer.mjs
M	tests/world/rebuilt-world.cjs
M	worker/api.js
## 2545ecf9e23e89006d25e968d19dbbb0b63d9127

Date: 2026-09-11T03:20:04-05:00

Connect streets around buildings and compose Briarhaven as a walkable village


M	client/briarhaven-art.js
M	client/hud.js
M	client/organic-world.js
M	client/realms-rebuilt.js
M	client/walk-in-world.js
M	tests/world/rebuilt-world.cjs
## 2def26eb5a35f04195c0cc6a62ae9e5a7c3d875d

Date: 2026-09-11T03:27:17-05:00

Support desktop play and mobile fullscreen with browser-safe fallback


M	client/game.js
M	client/hud.js
M	client/index.html
A	client/manifest.webmanifest
A	client/play-display.js
M	client/style.css
M	scripts/build.mjs
A	tests/gameplay/play-display.cjs
## b7bf7cdbe6dc8c9b1ece1a2e2176ca0db564bcaf

Date: 2026-09-11T03:43:38-05:00

Add isolated browser QA preview using the real game API


M	package-lock.json
M	package.json
A	vite.config.js
## adda920c6a05800166c5c0937f4f25e6e5cc6fe8

Date: 2026-09-11T04:11:58-05:00

Fix persistent door toggles and rework world proportions with native render QA


M	client/briarhaven-art.js
M	client/game.js
M	client/hud.js
M	client/kingdoms.js
M	client/organic-world.js
M	client/realms-rebuilt.js
M	client/renderer-gl.js
M	client/style.css
M	client/view3d.js
M	client/walk-in-world.js
M	client/world-depth.js
A	scripts/qa/capture-scene.cjs
A	scripts/qa/render-scene.py
M	tests/world/rebuilt-world.cjs
## 426a1d47a9058d471824ebbbc7f257fdbec1205a

Date: 2026-09-11T05:01:56-05:00

Rebuild tutor apprenticeship, terrain surfaces and character locomotion


M	client/assets/realms/models.js
M	client/briarhaven-art.js
M	client/cloud.js
M	client/game.js
M	client/index.html
M	client/organic-world.js
M	client/realms-rebuilt.js
M	client/renderer-gl.js
M	client/spirits.js
M	client/style.css
M	client/systems.js
A	client/tutorial.js
M	client/view3d.js
M	client/walk-in-world.js
M	client/world-depth.js
M	client/world.js
M	scripts/qa/capture-scene.cjs
M	scripts/assets/import-realms.py
M	tests/server/account-flow.cjs
A	tests/gameplay/apprenticeship.cjs
M	tests/world/briarhaven-art.cjs
M	tests/world/building-entry.cjs
M	tests/gameplay/combat-skills.cjs
M	tests/gameplay/game.cjs
M	tests/gameplay/item-input.cjs
M	tests/world/kingdoms.cjs
M	tests/gameplay/loot-interaction.cjs
M	tests/gameplay/movement-loop.cjs
M	tests/world/rebuilt-world.cjs
M	tests/rendering/render-benchmark.cjs
M	tests/rendering/renderer-gl.cjs
A	tests/world/terrain-travel.cjs
M	tests/gameplay/view3d.cjs
M	tests/world/world-art.cjs
## bd4d3ffd5d08b18da81c385667051d31580b73b1

Date: 2026-09-11T17:24:45-04:00

Fix recorded traversal and interface regressions; refine combat and village presentation


M	client/game.js
M	client/hud.js
M	client/kingdoms.js
M	client/organic-world.js
M	client/realms-rebuilt.js
M	client/renderer-gl.js
M	client/style.css
M	client/systems.js
M	client/view3d.js
M	client/walk-in-world.js
M	client/world-depth.js
M	client/world.js
M	scripts/qa/capture-scene.cjs
A	scripts/qa/prepare-ui-review.cjs
M	tests/gameplay/item-input.cjs
A	tests/gameplay/recording-regressions.cjs
## 956f35400156305bc4a603250a46cdac3d7be1ff

Date: 2026-09-11T17:57:17-04:00

Reduce desktop rendering work and bound high-resolution canvas cost


M	client/art-direction.js
M	client/game.js
M	client/realm-models.js
M	client/realms-rebuilt.js
M	client/renderer-gl.js
M	client/style.css
M	client/view3d.js
M	client/world-depth.js
A	scripts/qa/benchmark-desktop.cjs
M	scripts/qa/capture-scene.cjs
M	scripts/qa/prepare-ui-review.cjs
M	scripts/qa/render-scene.py
A	tests/gameplay/desktop-rendering.cjs
## c1848825e648991200f64945672d55703e601808

Date: 2026-09-11T18:49:46-04:00

Retarget authored human motion and fix the sword grip


M	client/assets/realms/CREDITS.txt
M	client/assets/realms/models.js
M	client/briarhaven-art.js
M	client/game.js
M	client/realms-rebuilt.js
M	client/view3d.js
M	scripts/qa/capture-scene.cjs
A	scripts/assets/import-authored-motion.py
M	scripts/assets/import-realms.py
M	scripts/qa/render-scene.py
A	tests/gameplay/authored-motion.cjs
M	tests/gameplay/desktop-rendering.cjs
## 805f9cf199f3e96874373abe0c7b8c4fb87043b2

Date: 2026-09-11T19:30:44-04:00

Carry the grounded art direction through all three kingdoms

Replace legacy furnishings with matching textured props; rebuild regional roofs, castles, caves, ground cover and creature silhouettes. Preserve character motion, stable world IDs, persistent doors and multiplayer saves. Validate native renders alongside travel, tutorial and geometry checks.


M	client/assets/realms/CREDITS.txt
A	client/assets/realms/FANTASY-PROPS-LICENSE.txt
M	client/assets/realms/atlas.png
M	client/assets/realms/models.js
M	client/index.html
M	client/realms-rebuilt.js
M	client/renderer-gl.js
M	client/walk-in-world.js
A	client/world-style.js
M	scripts/qa/benchmark-desktop.cjs
M	scripts/qa/capture-scene.cjs
M	scripts/assets/import-realms.py
A	scripts/assets/import-world-props.py
M	tests/gameplay/apprenticeship.cjs
M	tests/world/rebuilt-world.cjs
M	tests/gameplay/recording-regressions.cjs
M	tests/world/terrain-travel.cjs
A	tests/world/world-style.cjs
## 77c60bb93040d6b4dac01592f3379424c721bd43

Date: 2026-09-11T19:31:33-04:00

Close exposed outer cave wall faces


M	client/world-style.js
## 8c5b9f809f748922dec5de1059174d76c3ac3322

Date: 2026-09-11T19:33:14-04:00

Ground castle keeps at courtyard level


M	client/world-style.js
## db1fa7c7fe4b453e04f92d260a00ec5022c18cc8

Date: 2026-09-11T20:09:33-04:00

Replace procedural monsters with authored rigs and fix duplicate nameplates


M	.gitignore
A	client/assets/realms/BESTIARY-LICENSE.txt
M	client/assets/realms/CREDITS.txt
M	client/assets/realms/atlas.png
M	client/assets/realms/models.js
A	client/assets/realms/monsters.js
A	client/creatures.js
M	client/index.html
M	client/systems.js
M	client/view3d.js
M	scripts/qa/benchmark-desktop.cjs
M	scripts/qa/capture-scene.cjs
A	scripts/assets/import-creatures.py
M	scripts/assets/import-realms.py
M	tests/gameplay/apprenticeship.cjs
A	tests/gameplay/creature-animation.cjs
A	tests/gameplay/nameplates.cjs
M	tests/world/rebuilt-world.cjs
M	tests/gameplay/recording-regressions.cjs
M	tests/world/terrain-travel.cjs
## 5f648271ec815c7d9f05b75f02699cb4a5e107b5

Date: 2026-09-12T00:47:08-04:00

Move character animation to GPU and make realm startup recoverable


M	client/briarhaven-art.js
M	client/creatures.js
M	client/game.js
M	client/index.html
M	client/realms-rebuilt.js
M	client/renderer-gl.js
A	client/startup.js
M	client/style.css
M	client/world-depth.js
M	scripts/build.mjs
M	scripts/qa/capture-scene.cjs
M	scripts/qa/render-scene.py
A	tests/rendering/built-assets.mjs
A	tests/rendering/creature-renderer.cjs
A	tests/gameplay/startup-recovery.cjs
## 9f152d38aa5357b867d3111485e8062b96671434

Date: 2026-09-12T00:54:56-04:00

Fix double-compressed game responses and invalidate broken asset caches


M	scripts/build.mjs
M	tests/rendering/built-assets.mjs
M	vite.config.js
## 3b8a0a8e6d4ed72713868f57d5f41f53f5699f25

Date: 2026-09-12T01:33:03-04:00

Keep inventory usable in banks and shops; repair loot and fire timers


M	client/art-direction.js
M	client/game.js
M	client/hud.js
M	client/index.html
M	client/loot.js
M	client/systems.js
A	client/trading.css
A	client/trading.js
M	client/tutorial.js
M	client/view3d.js
M	tests/gameplay/apprenticeship.cjs
A	tests/browser/trade-layout.html
A	tests/browser/trade-preview.js
A	tests/gameplay/trading.cjs
A	tests/world/world-timers.cjs
M	vite.config.js
## 4fa29827e256c79928925b301ebab0a9577b7735

Date: 2026-09-12T02:35:56-04:00

Add modular wearable armor and a combined permanent tool belt


M	client/art-direction.js
A	client/assets/realms/CH0SAN-provenance.json
A	client/assets/realms/armor-icons.png
M	client/assets/realms/models.js
M	client/cloud.js
M	client/creatures.js
M	client/game.js
M	client/realms-rebuilt.js
M	client/style.css
M	client/systems.js
M	client/tutorial.js
M	scripts/qa/capture-scene.cjs
A	scripts/assets/import-modular-armor.py
A	tests/browser/armor-layout.html
A	tests/browser/armor-preview.js
A	tests/gameplay/modular-equipment.cjs
M	tests/server/multiplayer.mjs
M	vite.config.js
M	worker/api.js
## c2164b872c439a5e13dc0690a21c95bff2f32e81

Date: 2026-09-12T03:27:47-04:00

Build tutor workplaces and tiered skill progression


M	client/art-direction.js
M	client/cloud.js
M	client/game.js
M	client/hud.js
M	client/index.html
M	client/realms-rebuilt.js
A	client/skills.js
M	client/style.css
M	client/systems.js
M	client/trading.js
M	client/tutorial.js
M	client/view3d.js
M	client/world-style.js
M	scripts/qa/benchmark-desktop.cjs
M	scripts/qa/capture-scene.cjs
M	tests/server/account-flow.cjs
M	tests/gameplay/apprenticeship.cjs
M	tests/world/briarhaven-art.cjs
M	tests/world/building-entry.cjs
M	tests/gameplay/combat-skills.cjs
M	tests/gameplay/game.cjs
M	tests/gameplay/item-input.cjs
M	tests/world/kingdoms.cjs
M	tests/gameplay/loot-interaction.cjs
M	tests/gameplay/movement-loop.cjs
M	tests/world/rebuilt-world.cjs
M	tests/gameplay/recording-regressions.cjs
M	tests/rendering/render-benchmark.cjs
M	tests/rendering/renderer-gl.cjs
A	tests/gameplay/skill-progression.cjs
A	tests/browser/skills-layout.html
A	tests/browser/skills-preview.js
M	tests/world/terrain-travel.cjs
M	tests/gameplay/trading.cjs
M	tests/gameplay/view3d.cjs
M	tests/world/world-art.cjs
M	tests/world/world-timers.cjs
M	vite.config.js
M	worker/api.js
## eda691cab7efdb88a29f336d9366348560c2b7f5

Date: 2026-09-12T03:36:57-04:00

Reset all players and require a server connection for gameplay


M	client/cloud.js
M	client/game.js
M	client/hud.js
M	client/multiplayer.js
M	client/style.css
A	drizzle/0003_all_accounts_fresh_start.sql
M	drizzle/meta/_journal.json
M	tests/server/account-flow.cjs
A	tests/server/global-reset.mjs
M	tests/server/multiplayer.mjs
A	tests/gameplay/online-only.cjs
M	tests/server/saves.mjs
M	worker/api.js
## b867bc2eb2d03022d0f27b34998eeea6769759e7

Date: 2026-09-12T03:58:23-04:00

Add username accounts and customizable character creation


M	db/schema.ts
A	client/account-auth.js
M	client/character-creation.js
M	client/game.js
M	client/index.html
M	client/multiplayer.js
M	client/realms-rebuilt.js
M	client/style.css
A	drizzle/0004_round_earthquake.sql
A	drizzle/meta/0004_snapshot.json
M	drizzle/meta/_journal.json
M	package-lock.json
M	package.json
M	scripts/build.mjs
A	tests/gameplay/appearance.cjs
A	tests/browser/creator-layout.html
A	tests/browser/creator-preview.js
M	tests/server/global-reset.mjs
M	tests/server/multiplayer.mjs
M	tests/server/saves.mjs
M	vite.config.js
M	worker/api.js
A	worker/auth.js
## beef5abc4f2b6c17dd1fbe9abdabeb35c35f4f40

Date: 2026-09-12T04:11:50-04:00

Fix tutorial equipment, world context actions and food readability


A	client/assets/food-icons.png
M	client/character-creation.js
M	client/game.js
M	client/index.html
M	client/style.css
M	client/systems.js
M	client/tutorial.js
M	client/view3d.js
A	client/world-options.js
M	tests/server/account-flow.cjs
M	tests/browser/creator-preview.js
M	tests/gameplay/item-input.cjs
A	tests/world/world-options.cjs
## 7d2a97800f1a04f3b6c2c359302e01b8e52d5bb5

Date: 2026-09-12T04:53:39-04:00

Unify item models, fit armor to body volume, and clarify account entry


M	client/account-auth.js
D	client/assets/food-icons.png
M	client/cloud.js
M	client/game.js
M	client/index.html
A	client/item-models.js
M	client/loot.js
M	client/realms-rebuilt.js
M	client/skills.js
M	client/style.css
M	client/systems.js
M	client/view3d.js
M	client/world-options.js
A	scripts/qa/review-item-equipment.cjs
A	tests/gameplay/equipment-fit.cjs
A	tests/gameplay/item-models.cjs
A	tests/server/login.mjs
M	tests/server/multiplayer.mjs
M	worker/api.js
M	worker/auth.js
## e0ecd8a3021a4c45ac8592985f4dd886feaa163d

Date: 2026-09-12T05:28:57-04:00

Add fantasy clothing creator, fit hairstyles, separate hood, and reset characters


M	client/assets/realms/CREDITS.txt
A	client/assets/realms/fantasy-outfits-provenance.json
M	client/assets/realms/models.js
M	client/character-creation.js
M	client/index.html
M	client/realms-rebuilt.js
M	client/skills.js
M	client/style.css
A	drizzle/0005_creator_account_reset.sql
A	drizzle/meta/0005_snapshot.json
M	drizzle/meta/_journal.json
M	scripts/qa/capture-scene.cjs
A	scripts/assets/import-fantasy-outfits.py
A	scripts/qa/review-character-appearance.cjs
M	tests/server/account-flow.cjs
A	tests/gameplay/character-creation.cjs
M	tests/server/global-reset.mjs
M	tests/server/multiplayer.mjs
M	worker/api.js
## b3935b2a17e0a75694377ce24569ba3bdca13c61

Date: 2026-09-12T06:45:52-04:00

Revise game interfaces, tutorial, action timing and village layout


M	client/assets/realms/atlas.png
M	client/assets/realms/models.js
A	client/assets/realms/textured-trees-license.txt
A	client/building-orientation.js
M	client/character-creation.js
M	client/creatures.js
A	client/equipment-interface.js
A	client/game-hud.css
A	client/game-icons.js
M	client/game.js
M	client/hud.js
M	client/index.html
M	client/item-models.js
A	client/map-icons.js
M	client/organic-world.js
M	client/play-display.js
M	client/realms-rebuilt.js
M	client/skills.js
M	client/spirits.js
M	client/systems.js
M	client/trading.js
A	client/tree-identity.js
M	client/tutorial.js
M	client/view3d.js
M	client/walk-in-world.js
M	client/world.js
M	scripts/qa/benchmark-desktop.cjs
M	scripts/qa/capture-scene.cjs
A	scripts/assets/import-tree-species.py
A	scripts/qa/review-game-hud.cjs
M	tests/server/account-flow.cjs
A	tests/gameplay/action-timing.cjs
M	tests/gameplay/apprenticeship.cjs
A	tests/world/building-layout.cjs
A	tests/rendering/camera-input.cjs
M	tests/gameplay/character-creation.cjs
A	tests/world/map-services.cjs
M	tests/server/multiplayer.mjs
M	tests/world/world-options.cjs
M	worker/api.js
## 457bd198ab73106b86963168ac13cad6c495aa26

Date: 2026-09-12T06:57:03-04:00

Reset mxpsrs character progress while preserving account access


A	drizzle/0006_mxpsrs_character_reset.sql
A	drizzle/meta/0006_snapshot.json
M	drizzle/meta/_journal.json
A	tests/gameplay/character-reset.mjs
## eb1f925e76273d390ea23ad33630b30da1490839

Date: 2026-09-12T07:46:04-04:00

Fix apprentice appearance, rat enclosure, cooking lessons and building access


M	client/character-creation.js
M	client/creatures.js
M	client/equipment-interface.js
M	client/game.js
M	client/hud.js
M	client/item-models.js
M	client/kingdoms.js
M	client/map-icons.js
M	client/organic-world.js
M	client/realms-rebuilt.js
M	client/skills.js
M	client/style.css
M	client/systems.js
M	client/tutorial.js
M	client/view3d.js
M	client/walk-in-world.js
M	client/world-style.js
M	client/world.js
A	drizzle/0007_mxpsrs_tutorial_reset.sql
A	drizzle/meta/0007_snapshot.json
M	drizzle/meta/_journal.json
M	scripts/qa/capture-scene.cjs
M	tests/gameplay/apprenticeship.cjs
M	tests/gameplay/character-creation.cjs
M	tests/gameplay/character-reset.mjs
A	tests/gameplay/cooking-lesson.cjs
A	tests/gameplay/gathering-appearance.cjs
A	tests/gameplay/training-pen.cjs
A	tests/gameplay/walk-in-controls.cjs
## 5e068ca193debb458582762fe851acb2ab225b8f

Date: 2026-09-12T07:54:41-04:00

Relocate village kitchen to a clear plot facing the square


M	client/building-orientation.js
M	client/tutorial.js
M	tests/world/building-layout.cjs
## 73c7cc1f33815ffb2f7e7a2f7c441bd4634d9d2c

Date: 2026-09-12T09:00:07-04:00

Refine compact equipment UI and add equipped archery with authored action motion


M	client/assets/realms/CREDITS.txt
A	client/assets/realms/action-motion-provenance.json
M	client/assets/realms/models.js
M	client/equipment-interface.js
M	client/game-hud.css
M	client/game-icons.js
M	client/game.js
M	client/hud.js
M	client/item-models.js
M	client/multiplayer.js
M	client/realms-rebuilt.js
M	client/skills.js
M	client/spirits.js
M	client/systems.js
M	client/trading.js
M	client/view3d.js
M	scripts/qa/capture-scene.cjs
A	scripts/assets/export-fbx-motion.c
A	scripts/assets/import-action-motion.py
A	tests/gameplay/action-animations.cjs
M	tests/gameplay/action-timing.cjs
M	tests/gameplay/apprenticeship.cjs
M	tests/gameplay/authored-motion.cjs
A	tests/gameplay/combat-experience.cjs
A	tests/gameplay/equipment-interface.cjs
A	tests/gameplay/equipped-ammunition.cjs
M	worker/api.js
## fa96eb8ace886d73f0471e0e2c1bfed499412a46

Date: 2026-09-12T15:34:15-04:00

Add explicit item use, docked workshops and one-way tutorial island


M	client/equipment-interface.js
M	client/game.js
M	client/hud.js
M	client/index.html
A	client/item-use.css
A	client/item-use.js
M	client/map-icons.js
M	client/multiplayer.js
M	client/skills.js
M	client/systems.js
M	client/trading.js
A	client/tutorial-island.js
M	client/tutorial.js
M	client/walk-in-world.js
M	tests/gameplay/apprenticeship.cjs
A	tests/gameplay/item-use.cjs
M	tests/server/multiplayer.mjs
M	worker/api.js
## 56ed002d60894469641a3b9e3b38e41866c1b2fc

Date: 2026-09-12T15:55:08-04:00

Add summoned hero story, portrait dialogue and area audio


A	client/assets/audio/CREDITS.txt
A	client/assets/audio/drums-of-the-deep.mp3
A	client/assets/audio/lord-of-the-land.mp3
A	client/assets/audio/teller-of-the-tales.mp3
A	client/game-audio.js
M	client/game.js
M	client/index.html
A	client/npc-dialogue.css
A	client/npc-dialogue.js
A	client/realm-story.js
M	client/tutorial.js
M	scripts/build.mjs
A	scripts/release/package-release.mjs
M	tests/gameplay/apprenticeship.cjs
A	tests/gameplay/audio.cjs
## 87e3b7e321095b40c9afeeaa279af11e30fc7af0

Date: 2026-09-12T16:03:52-04:00

Replace area tracks with music free for commercial use without credits


D	client/assets/audio/CREDITS.txt
A	client/assets/audio/cave-theme.mp3
D	client/assets/audio/drums-of-the-deep.mp3
A	client/assets/audio/field-of-dreams.mp3
D	client/assets/audio/lord-of-the-land.mp3
A	client/assets/audio/old-tower-inn.mp3
D	client/assets/audio/teller-of-the-tales.mp3
M	client/game-audio.js
M	client/npc-dialogue.css
A	docs/music-sources.json
M	tests/rendering/built-assets.mjs
## 45c55872d5a03012360e9c9684d8b25995fdf38d

Date: 2026-09-12T16:45:24-04:00

Draft combat rebalance, skill audio, selected music and boss designs for review


A	client/assets/audio/medieval-opener.mp3
A	client/assets/audio/sfx/coins-1.mp3
A	client/assets/audio/sfx/cook-1.mp3
A	client/assets/audio/sfx/cook-2.mp3
A	client/assets/audio/sfx/door-1.mp3
A	client/assets/audio/sfx/equip-1.mp3
A	client/assets/audio/sfx/fire-1.mp3
A	client/assets/audio/sfx/floor-1.mp3
A	client/assets/audio/sfx/floor-2.mp3
A	client/assets/audio/sfx/hit-1.mp3
A	client/assets/audio/sfx/hit-2.mp3
A	client/assets/audio/sfx/mine-1.mp3
A	client/assets/audio/sfx/mine-2.mp3
A	client/assets/audio/sfx/mine-3.mp3
A	client/assets/audio/sfx/smith-1.mp3
A	client/assets/audio/sfx/smith-2.mp3
A	client/assets/audio/sfx/smith-3.mp3
A	client/assets/audio/sfx/step-1.mp3
A	client/assets/audio/sfx/step-2.mp3
A	client/assets/audio/sfx/step-3.mp3
A	client/assets/audio/sfx/sword-1.mp3
A	client/assets/audio/sfx/sword-2.mp3
A	client/assets/audio/sfx/wood-1.mp3
A	client/assets/audio/sfx/wood-2.mp3
A	client/assets/audio/sfx/wood-3.mp3
A	client/assets/audio/the-tournament.mp3
A	client/assets/realms/bosses.js
M	client/creatures.js
A	client/encounters.css
A	client/encounters.js
M	client/game-audio.js
M	client/game-icons.js
M	client/game.js
M	client/hud.js
M	client/index.html
M	client/systems.js
M	client/view3d.js
M	client/world.js
A	docs/boss-design-drafts.png
A	docs/boss-models.json
A	docs/combat-update-review.md
M	docs/music-sources.json
A	docs/sound-sources.json
M	scripts/qa/benchmark-desktop.cjs
A	scripts/assets/build-boss-models.py
A	scripts/assets/export-boss-rigs.cjs
A	scripts/qa/render-boss-review.py
M	tests/gameplay/apprenticeship.cjs
M	tests/gameplay/audio.cjs
M	tests/rendering/built-assets.mjs
A	tests/gameplay/encounters.cjs
## e23ac475761a2c348a76546a3d004d94ebba0b58

Date: 2026-09-12T17:14:14-04:00

Record replacement boss asset shortlist and retire rejected draft roster


A	docs/boss-candidates/boss-shortlist.jpg
A	docs/boss-candidates/colossus.webp
A	docs/boss-candidates/insectoid.jpg
A	docs/boss-candidates/mindbreaker.webp
A	docs/boss-candidates/minotaur.webp
A	docs/boss-candidates/prowler.jpg
A	docs/boss-candidates/roster.json
A	docs/boss-candidates/sketchfab-evidence.json
A	docs/boss-candidates/treant2.png
M	docs/boss-models.json
A	docs/boss-roster-review.md
M	docs/combat-update-review.md
A	scripts/assets/build-boss-shortlist.py
## d6b6b0805a617af4514338bbbf0c99002e904c59

Date: 2026-09-12T17:38:33-04:00

Approve four boss designs and assign Forest Giant and Ork as regular monsters


M	docs/boss-candidates/boss-shortlist.jpg
M	docs/boss-candidates/roster.json
M	docs/boss-roster-review.md
M	docs/combat-update-review.md
M	scripts/assets/build-boss-shortlist.py
## 989b43b20610e35bdaff376a04d870a129a5d75c

Date: 2026-09-12T18:27:57-04:00

Save native Forest Giant import and themed lair work in progress


A	client/assets/realms/approved-creatures.js
M	client/assets/realms/atlas.png
M	client/assets/realms/models.js
M	client/creatures.js
M	client/index.html
A	client/lairs.js
M	client/renderer-gl.js
M	client/view3d.js
A	docs/boss-candidates/forestgiant-import.json
M	docs/boss-candidates/roster.json
A	docs/lair-integration-checkpoint.md
M	scripts/qa/benchmark-desktop.cjs
A	scripts/assets/export-rigged-fbx.c
A	scripts/assets/import-approved-creature.py
A	tests/gameplay/approved-creatures.cjs
## 1841d838b12672f4db9fbb3a0f85400ed84cb828

Date: 2026-09-12T18:49:42-04:00

Release shared rat balance, native Forest Giants, and sound update


D	client/assets/realms/bosses.js
M	client/creatures.js
M	client/encounters.js
M	client/frontier.js
M	client/game.js
M	client/index.html
M	client/lairs.js
M	client/realm-story.js
M	client/systems.js
M	client/tutorial.js
M	client/view3d.js
M	client/world.js
M	docs/boss-candidates/roster.json
M	docs/combat-update-review.md
A	docs/forest-giant-review/elderwood-grove.png
A	docs/forest-giant-review/forest-giant-close.png
M	docs/lair-integration-checkpoint.md
M	scripts/qa/benchmark-desktop.cjs
M	scripts/qa/capture-scene.cjs
M	tests/gameplay/apprenticeship.cjs
M	tests/gameplay/audio.cjs
M	tests/rendering/creature-renderer.cjs
M	tests/gameplay/encounters.cjs
M	tests/rendering/renderer-gl.cjs
M	tests/server/saves.mjs
## e9d5519524ecc9e060430e8564f2e62660a4bc57

Date: 2026-09-12T19:21:39-04:00

Release native Orks and a navigable dungeon habitat


M	client/assets/realms/CREDITS.txt
M	client/assets/realms/approved-creatures.js
M	client/assets/realms/atlas.png
M	client/assets/realms/models.js
M	client/encounters.js
M	client/game-audio.js
M	client/lairs.js
A	docs/boss-candidates/ork-import.json
M	docs/boss-candidates/roster.json
M	docs/lair-integration-checkpoint.md
A	docs/ork-review/native-model.png
A	docs/ork-review/warrens.png
M	scripts/qa/capture-scene.cjs
M	scripts/assets/import-approved-creature.py
M	tests/gameplay/approved-creatures.cjs
M	tests/gameplay/encounters.cjs
M	tests/server/multiplayer.mjs
M	worker/api.js
## a887c5d6d4d30828bcea7def027470cea0867543

Date: 2026-09-12T20:05:00-04:00

Build Firstlight town square and release the native Colossus


M	client/assets/realms/CREDITS.txt
M	client/assets/realms/approved-creatures.js
M	client/assets/realms/atlas.png
M	client/assets/realms/models.js
M	client/creatures.js
M	client/encounters.js
M	client/lairs.js
M	client/loot.js
M	client/realm-story.js
M	client/renderer-gl.js
M	client/tutorial-island.js
M	client/tutorial.js
M	client/world-depth.js
A	docs/boss-candidates/boss_colossus-import.json
M	docs/boss-candidates/roster.json
A	docs/colossus-review/crimson-overload.png
A	docs/colossus-review/crystal-crucible.png
A	docs/firstlight-review/foresters-grove.png
A	docs/firstlight-review/town-square.png
M	docs/lair-integration-checkpoint.md
M	scripts/qa/capture-scene.cjs
M	scripts/assets/import-approved-creature.py
M	scripts/qa/render-scene.py
M	tests/gameplay/apprenticeship.cjs
M	tests/gameplay/approved-creatures.cjs
M	tests/rendering/creature-renderer.cjs
M	tests/gameplay/encounters.cjs
M	tests/server/multiplayer.mjs
M	worker/api.js
## 81789ceb0151092890930c02fee111116e5811e8

Date: 2026-09-12T20:09:46-04:00

Preserve tutorial travel checks across island layout versions


M	tests/server/multiplayer.mjs
M	worker/api.js
## b055b5d00d5940da5f17f3ab024710d3335c27dd

Date: 2026-09-12T20:27:35-04:00

Add repeatable global account reset protocol and fresh tutorial reset


A	docs/global-account-reset.md
A	drizzle/0008_global_account_reset.sql
A	drizzle/meta/0008_snapshot.json
M	drizzle/meta/_journal.json
M	package.json
A	scripts/prepare-global-reset.mjs
M	tests/server/global-reset.mjs
M	worker/api.js
A	worker/reset-policy.js
## 437847be6c10a89d9218d7f30c7ca350b3abaeeb

Date: 2026-09-12T20:42:38-04:00

Execute global resets directly with atomic deletion and protected retry


A	.env.reset.example
M	.gitignore
M	db/schema.ts
M	docs/global-account-reset.md
D	drizzle/0008_global_account_reset.sql
A	drizzle/0008_global_reset_protocol.sql
M	drizzle/meta/0008_snapshot.json
M	drizzle/meta/_journal.json
M	package.json
M	scripts/build.mjs
D	scripts/prepare-global-reset.mjs
A	scripts/reset-accounts.mjs
M	tests/server/global-reset.mjs
A	worker/admin-reset.js
M	worker/api.js
M	worker/reset-policy.js
## 50902f2c5fc382ef6ca4a14af3068716414494d3

Date: 2026-09-13T03:30:17+02:00

Level Firstlight square and repair tutorial crossing and interfaces


M	client/creatures.js
M	client/equipment-interface.js
M	client/game-hud.css
M	client/game.js
M	client/hud.js
M	client/multiplayer.js
M	client/npc-dialogue.css
M	client/npc-dialogue.js
M	client/realms-rebuilt.js
M	client/systems.js
M	client/trading.js
M	client/tutorial-island.js
M	client/tutorial.js
M	client/view3d.js
M	client/world-depth.js
A	docs/tutorial-video-followup.md
M	scripts/qa/capture-scene.cjs
A	scripts/qa/review-dialogue-portraits.cjs
M	tests/gameplay/apprenticeship.cjs
M	tests/gameplay/equipment-interface.cjs
A	tests/gameplay/scene-handoff.mjs
## 0b5997fa0e40a41256fdf78ffb15ab0d5ea6dacb

Date: 2026-09-13T04:34:52+02:00

Integrate native Veyr boss and Shattered Sanctum lair


M	client/assets/realms/CREDITS.txt
M	client/assets/realms/approved-creatures.js
M	client/assets/realms/atlas.png
M	client/assets/realms/models.js
M	client/creatures.js
M	client/encounters.js
M	client/lairs.js
A	docs/boss-candidates/boss_veyr-import.json
M	docs/boss-candidates/roster.json
M	docs/boss-roster-review.md
M	docs/lair-integration-checkpoint.md
A	docs/veyr-integration.md
A	docs/veyr-review/native-cast-and-death.jpg
A	docs/veyr-review/native-strikes.jpg
A	docs/veyr-review/shattered-sanctum.png
M	scripts/qa/capture-scene.cjs
M	scripts/assets/import-approved-creature.py
M	tests/gameplay/approved-creatures.cjs
M	tests/gameplay/encounters.cjs
A	tests/assets/import-creature-window.py
## 6a9ccce9ff586012a17f43afff2519d334c31041

Date: 2026-09-13T05:10:22+02:00

Integrate Xalith insect rig and Brood Hollow encounter


M	client/assets/realms/CREDITS.txt
M	client/assets/realms/approved-creatures.js
M	client/assets/realms/atlas.png
M	client/assets/realms/models.js
M	client/creatures.js
M	client/encounters.js
M	client/game.js
A	docs/boss-candidates/boss_xalith-import.json
M	docs/boss-candidates/roster.json
M	docs/boss-candidates/sketchfab-evidence.json
A	docs/boss-candidates/xalith-blender-audit.json
M	docs/boss-roster-review.md
M	docs/lair-integration-checkpoint.md
A	docs/xalith-integration.md
A	docs/xalith-review/authored-death.png
A	docs/xalith-review/brood-hollow.png
A	docs/xalith-review/original-model.png
M	scripts/qa/capture-scene.cjs
A	scripts/assets/export-xalith-blender.py
M	scripts/assets/import-approved-creature.py
M	tests/rendering/creature-renderer.cjs
M	tests/gameplay/encounters.cjs
A	tests/gameplay/xalith.cjs
## 8a44783fd6da28879f10bd5e64c54992f954de15

Date: 2026-09-13T05:15:43+02:00

Compact Xalith idle samples to fit hosting size limit


M	client/assets/realms/approved-creatures.js
M	docs/boss-candidates/boss_xalith-import.json
M	docs/boss-candidates/xalith-blender-audit.json
M	docs/xalith-integration.md
M	scripts/build.mjs
M	scripts/assets/export-xalith-blender.py
## 6f69bc3e8abd82998d8ea803ab856123e62196d4

Date: 2026-09-13T05:38:49+02:00

Integrate original Varkesh dragon and enable player presence in boss lairs


M	client/assets/realms/CREDITS.txt
M	client/assets/realms/approved-creatures.js
M	client/assets/realms/atlas.png
M	client/assets/realms/models.js
M	client/creatures.js
M	client/encounters.js
M	client/lairs.js
A	docs/boss-candidates/boss_varkesh-import.json
M	docs/boss-candidates/roster.json
A	docs/boss-candidates/varkesh-blender-audit.json
M	docs/boss-roster-review.md
M	docs/lair-integration-checkpoint.md
A	docs/varkesh-integration.md
A	docs/varkesh-review/blightwing-roost.png
A	docs/varkesh-review/original-model.png
A	docs/varkesh-review/rig-motions.jpg
M	scripts/qa/capture-scene.cjs
A	scripts/assets/export-varkesh-blender.py
M	scripts/assets/import-approved-creature.py
M	tests/gameplay/encounters.cjs
M	tests/server/multiplayer.mjs
A	tests/gameplay/varkesh.cjs
M	worker/api.js
## a00f8f6e8a7d7362c0ee4480dadd32e5fd692123

Date: 2026-09-13T05:42:52+02:00

Preserve latest insect asset optimization alongside dragon integration

## 028872659d6e6f28835caa45f33a6a90e7ffbefc

Date: 2026-09-13T05:47:11+02:00

Store embedded text assets losslessly within the hosting size limit


M	docs/varkesh-integration.md
M	scripts/build.mjs
M	tests/rendering/built-assets.mjs
## 9ee5924e60bbedb503dc954083c7394a0d3aade1

Date: 2026-09-13T07:06:40+02:00

Unify NPC creator outfits and dialogue portraits with a black hooded Ranger guide


M	client/creatures.js
M	client/npc-dialogue.js
M	client/realm-models.js
M	client/realms-rebuilt.js
M	client/view3d.js
A	tests/gameplay/npc-appearance.cjs
## 8639e4d1a4f0db38daf13d5132ee150ec823dd55

Date: 2026-09-13T07:08:04+02:00

Dress Captain Vale in full mithril equipment without a helmet


M	client/view3d.js
M	tests/gameplay/npc-appearance.cjs
## 024013ced973dfa246ea348733252311c2a37902

Date: 2026-09-13T07:35:01+02:00

Rebuild Briarhaven and its goblin village; improve fire actions and minimap navigation


M	client/assets/realms/models.js
A	client/briarhaven.js
M	client/game-audio.js
M	client/game-hud.css
M	client/game.js
M	client/hud.js
M	client/index.html
M	client/item-use.js
M	client/map-icons.js
M	client/realms-rebuilt.js
M	client/skills.js
M	client/systems.js
M	client/tutorial-island.js
M	client/world-style.js
A	scripts/assets/build-firemaking-motion.py
M	scripts/qa/capture-scene.cjs
M	tests/gameplay/apprenticeship.cjs
M	tests/gameplay/authored-motion.cjs
A	tests/world/briarhaven-map.cjs
## 1eaa71604b7d675f75acf66c1ecb27e92b941299

Date: 2026-09-13T08:23:34+02:00

Expand minimap travel, combat tutorials, guardian models and online social systems


A	AGENTS.md
M	db/schema.ts
M	client/encounters.js
M	client/game.js
A	client/guardian-spirits.js
M	client/hud.js
M	client/index.html
M	client/lairs.js
A	client/maintenance.js
M	client/realm-story.js
M	client/renderer-gl.js
A	client/social.css
A	client/social.js
M	client/style.css
M	client/systems.js
M	client/tutorial.js
M	client/view3d.js
M	client/world.js
A	drizzle/0009_vengeful_white_queen.sql
A	drizzle/0010_lethal_surge.sql
A	drizzle/meta/0009_snapshot.json
A	drizzle/meta/0010_snapshot.json
M	drizzle/meta/_journal.json
M	scripts/build.mjs
M	scripts/qa/capture-scene.cjs
A	scripts/world/export-trade-items.cjs
A	scripts/maintenance.mjs
M	tests/gameplay/apprenticeship.cjs
M	tests/world/briarhaven-map.cjs
A	tests/gameplay/sky-combat-guardians.cjs
A	tests/server/social-maintenance.mjs
A	tests/gameplay/social-ui.cjs
M	worker/api.js
M	worker/auth.js
A	worker/maintenance.js
A	worker/social.js
A	worker/trade-items.json
## fc7c899b33cee92082b506c5498b1ed289fe7c2e

Date: 2026-09-13T08:27:39+02:00

Record completed maintenance bootstrap and consumed exception


M	AGENTS.md
## 822507f43f394f552b491723c270a4b1abfc185a

Date: 2026-09-13T08:39:19+02:00

Give spirits original discovery forms and caster specials; enable player trade menus


M	client/game.js
M	client/guardian-spirits.js
M	client/multiplayer.js
M	client/realms-rebuilt.js
M	client/social.js
M	client/spirits.js
M	client/view3d.js
M	client/world-options.js
M	scripts/qa/capture-scene.cjs
A	tests/gameplay/player-options.cjs
M	tests/gameplay/sky-combat-guardians.cjs
## 8a14aad9ec152bebbb6f731ec303be3071793e08

Date: 2026-09-13T08:44:16+02:00

Limit player menu to trade follow and walking; prepare maintenance key recovery


M	.gitignore
M	AGENTS.md
M	client/game.js
M	client/multiplayer.js
M	client/world-options.js
M	tests/gameplay/player-options.cjs
## cb36cbea9aba09d94cd7a3adc00a792d884ed4e9

Date: 2026-09-13T08:48:12+02:00

Record successful maintenance key recovery deployment


M	AGENTS.md
## 5828d4b9bb728cce9d17b3813694ec50cc82b80b

Date: 2026-09-13T09:07:08+02:00

Remove artificial sky and add Android animation compatibility path


M	client/renderer-gl.js
M	client/view3d.js
M	scripts/qa/capture-scene.cjs
A	tests/gameplay/android-rendering.cjs
M	tests/gameplay/sky-combat-guardians.cjs
## 537c678c16e7b53d29c10cee5b353065b3f68f1c

Date: 2026-09-13T09:30:16+02:00

Rework player chat and two-stage trading and smooth remote movement


M	db/schema.ts
M	client/game.js
M	client/multiplayer.js
M	client/realms-rebuilt.js
M	client/social.css
M	client/social.js
M	client/view3d.js
A	drizzle/0011_shiny_outlaw_kid.sql
A	drizzle/meta/0011_snapshot.json
M	drizzle/meta/_journal.json
M	tests/server/social-maintenance.mjs
M	tests/gameplay/social-ui.cjs
M	worker/api.js
M	worker/social.js
## 17ab7aedc77997ddb7fe82f4c89ae30c23efa807

Date: 2026-09-13T09:53:08+02:00

Rebuild desktop and mobile game interface and centralize game messages


A	client/classic-ui.css
A	client/classic-ui.js
M	client/cloud.js
M	client/equipment-interface.js
M	client/game-icons.js
A	client/game-messages.js
M	client/game.js
M	client/guardian-spirits.js
M	client/index.html
M	client/maintenance.js
M	client/multiplayer.js
M	client/play-display.js
M	client/skills.js
M	client/social.js
M	client/trading.js
M	client/tutorial.js
M	scripts/build.mjs
A	tests/gameplay/classic-ui.cjs
M	worker/admin-reset.js
## 70d2ed0bda0bf91514fdc703f59736f52eb4913d

Date: 2026-09-13T10:10:14+02:00

Make beta character resets reversible with durable checkpoints and restoration


M	db/schema.ts
M	docs/global-account-reset.md
A	drizzle/0012_wild_spacker_dave.sql
A	drizzle/meta/0012_snapshot.json
M	drizzle/meta/_journal.json
M	scripts/reset-accounts.mjs
M	tests/server/global-reset.mjs
M	worker/admin-reset.js
## e61a3fa09d6a9c44acdc2ec1252ef96053d6d5c9

Date: 2026-09-13T10:21:25+02:00

Fix missing spirit control crash and mobile rotation during startup


M	client/classic-ui.js
M	client/hud.js
M	tests/gameplay/classic-ui.cjs
M	tests/gameplay/play-display.cjs
## 8773b9aa828c8d5529104a3e4562bf49e0ffb66a

Date: 2026-09-13T10:33:52+02:00

Reduce follow delay and preserve routes for unchanged peer destinations


M	client/multiplayer.js
M	tests/gameplay/player-options.cjs
## 9826955e7d59b4664df2a7770b9478eab1fbe726

Date: 2026-09-13T10:36:54+02:00

Follow the leader previous tile instead of stopping in an adjacent radius


M	client/multiplayer.js
M	tests/gameplay/player-options.cjs
## 62d54cc4d1bcad526ae7993297d775e8c6ea432b

Date: 2026-09-13T10:47:19+02:00

Synchronize actual tile departures and queue follow trails across delayed updates


M	client/game.js
M	client/multiplayer.js
A	tests/gameplay/follow-network.cjs
M	tests/server/multiplayer.mjs
M	tests/gameplay/player-options.cjs
M	worker/api.js
## ec2a3a75f0c784c0037823ab595634d412ad2711

Date: 2026-09-13T11:48:02+02:00

Separate inventory coins from pouch and unify world combat scaling


M	client/classic-ui.css
M	client/classic-ui.js
M	client/encounters.js
M	client/frontier.js
M	client/game-icons.js
M	client/game.js
M	client/loot.js
M	client/skills.js
M	client/social.js
M	client/spirits.js
M	client/systems.js
M	client/trading.js
M	client/tutorial-island.js
M	client/tutorial.js
M	tests/gameplay/classic-ui.cjs
A	tests/gameplay/coin-pouch.cjs
M	tests/gameplay/combat-experience.cjs
A	tests/gameplay/combat-scaling.cjs
M	tests/gameplay/encounters.cjs
M	tests/gameplay/loot-interaction.cjs
M	tests/server/social-maintenance.mjs
M	tests/gameplay/social-ui.cjs
M	tests/gameplay/trading.cjs
M	worker/social.js
M	worker/trade-items.json
## 295ba1f9c6ea5c66c84404b2a05a20eae42a8366

Date: 2026-09-13T12:11:46+02:00

Repair bow sockets and tune ranged hits, projectiles and arrow recovery


M	client/encounters.js
M	client/item-models.js
M	client/realms-rebuilt.js
M	client/skills.js
M	client/systems.js
A	scripts/qa/review-ranged.cjs
A	tests/gameplay/ranged-overhaul.cjs
## 86ae183f6f2473c617ad2f91f723a34c3bf08775

Date: 2026-09-13T12:45:57+02:00

Reduce zoomed-out rendering cost with indexed meshes and scenery instancing


M	client/guardian-spirits.js
M	client/renderer-gl.js
M	scripts/qa/benchmark-desktop.cjs
M	scripts/qa/capture-scene.cjs
M	scripts/qa/render-scene.py
M	tests/gameplay/desktop-rendering.cjs
A	tests/rendering/render-meshes.cjs
## 392944f686ccc67f15ee0cb1b5cdb3e4859e41f8

Date: 2026-09-13T13:18:44+02:00

Rework client animation, spatial updates and lazy world navigation


M	client/encounters.js
M	client/game.js
M	client/kingdoms.js
M	client/renderer-gl.js
M	client/systems.js
M	client/view3d.js
M	client/world-depth.js
M	client/world.js
M	scripts/qa/benchmark-desktop.cjs
A	scripts/qa/benchmark-engine.cjs
M	scripts/qa/capture-scene.cjs
A	scripts/qa/check-skin-probe.py
M	scripts/qa/render-scene.py
A	tests/gameplay/engine-world.cjs
A	tests/rendering/texture-skinning.cjs
## fa1d1564128bbd4b52787ff6de69e73696920140

Date: 2026-09-13T20:45:59+02:00

Restore persistent fullscreen controls in browser UI


M	client/classic-ui.css
M	client/classic-ui.js
M	client/play-display.js
M	tests/gameplay/classic-ui.cjs
M	tests/gameplay/play-display.cjs
## 7fff57c090292abdf31791fa5e229180bc1c912a

Date: 2026-09-13T21:35:36+02:00

Replace confusing icons and restore compact equipment controls


A	art/ui-icons/carl-olsen--flame.svg
A	art/ui-icons/delapouite--bank.svg
A	art/ui-icons/delapouite--bed.svg
A	art/ui-icons/delapouite--bow-arrow.svg
A	art/ui-icons/delapouite--chart.svg
A	art/ui-icons/delapouite--chat-bubble.svg
A	art/ui-icons/delapouite--chest-armor.svg
A	art/ui-icons/delapouite--clothes.svg
A	art/ui-icons/delapouite--coins.svg
A	art/ui-icons/delapouite--cooking-pot.svg
A	art/ui-icons/delapouite--exit-door.svg
A	art/ui-icons/delapouite--fishing-pole.svg
A	art/ui-icons/delapouite--gauntlet.svg
A	art/ui-icons/delapouite--graduate-cap.svg
A	art/ui-icons/delapouite--histogram.svg
A	art/ui-icons/delapouite--meal.svg
A	art/ui-icons/delapouite--musical-notes.svg
A	art/ui-icons/delapouite--person.svg
A	art/ui-icons/delapouite--position-marker.svg
A	art/ui-icons/delapouite--quiver.svg
A	art/ui-icons/delapouite--rake.svg
A	art/ui-icons/delapouite--shop.svg
A	art/ui-icons/delapouite--speaker-off.svg
A	art/ui-icons/delapouite--speaker.svg
A	art/ui-icons/delapouite--spell-book.svg
A	art/ui-icons/delapouite--stone-pile.svg
A	art/ui-icons/delapouite--stop-sign.svg
A	art/ui-icons/delapouite--three-friends.svg
A	art/ui-icons/delapouite--war-pick.svg
A	art/ui-icons/lorc--anvil.svg
A	art/ui-icons/lorc--boots.svg
A	art/ui-icons/lorc--broadsword.svg
A	art/ui-icons/lorc--campfire.svg
A	art/ui-icons/lorc--cog.svg
A	art/ui-icons/lorc--compass.svg
A	art/ui-icons/lorc--crossed-swords.svg
A	art/ui-icons/lorc--crystal-wand.svg
A	art/ui-icons/lorc--envelope.svg
A	art/ui-icons/lorc--feather.svg
A	art/ui-icons/lorc--ghost.svg
A	art/ui-icons/lorc--knapsack.svg
A	art/ui-icons/lorc--pine-tree.svg
A	art/ui-icons/lorc--power-lightning.svg
A	art/ui-icons/lorc--prayer.svg
A	art/ui-icons/lorc--run.svg
A	art/ui-icons/lorc--scroll-unfurled.svg
A	art/ui-icons/lorc--sword-slice.svg
A	art/ui-icons/lorc--swords-emblem.svg
A	art/ui-icons/lorc--target-arrows.svg
A	art/ui-icons/lorc--target-shot.svg
A	art/ui-icons/lorc--trade.svg
A	art/ui-icons/lorc--treasure-map.svg
A	art/ui-icons/lorc--visored-helm.svg
A	art/ui-icons/lorc--windy-stripes.svg
A	art/ui-icons/lucasms--belt.svg
A	art/ui-icons/lucasms--necklace.svg
A	art/ui-icons/lucasms--trousers.svg
A	art/ui-icons/manifest.json
A	art/ui-icons/sbed--hand.svg
A	art/ui-icons/sbed--help.svg
A	art/ui-icons/sbed--shield.svg
A	art/ui-icons/sbed--water-drop.svg
A	art/ui-icons/skoll--fist.svg
A	art/ui-icons/skoll--hearts.svg
A	client/assets/ui/CREDITS.txt
M	client/classic-ui.css
M	client/classic-ui.js
M	client/equipment-interface.js
M	client/game-icons.js
M	client/game.js
M	client/hud.js
A	client/icon-tooltips.css
A	client/icon-tooltips.js
M	client/index.html
M	client/item-models.js
M	client/item-use.js
M	client/map-icons.js
M	client/npc-dialogue.js
M	client/realms-rebuilt.js
M	client/skills.js
M	client/social.js
M	client/spirits.js
M	client/systems.js
M	client/trading.js
M	client/tutorial-island.js
A	docs/icon-equipment-review.md
M	package.json
A	scripts/assets/build-icons.mjs
M	scripts/build.mjs
A	scripts/qa/review-icons.cjs
M	tests/gameplay/classic-ui.cjs
M	tests/gameplay/equipment-interface.cjs
A	tests/gameplay/icon-system.cjs
A	tests/gameplay/icon-tooltips.cjs
M	tests/gameplay/item-input.cjs
M	tests/gameplay/item-models.cjs
M	tests/gameplay/item-use.cjs
M	tests/world/map-services.cjs
## 802e7b32f5ad730cdb36deccde75aee9ceb055f4

Date: 2026-09-13T21:46:15+02:00

Record verified maintenance backup and consumed recovery exception


M	AGENTS.md
## d5f725e9d7e71e00372a563f47b4e43ab7089a04

Date: 2026-09-13T23:52:00+02:00

Rename the game to Veldren: The Unwritten Age and include Android source


M	.env.reset.example
M	AGENTS.md
A	README.md
M	client/account-auth.js
M	client/art-direction.js
M	client/assets/briarhaven/CREDITS.txt
M	client/assets/realms/CH0SAN-provenance.json
M	client/assets/realms/CREDITS.txt
M	client/assets/realms/approved-creatures.js
M	client/assets/realms/fantasy-outfits-provenance.json
M	client/assets/ui/CREDITS.txt
M	client/classic-ui.css
M	client/game.js
M	client/index.html
M	client/manifest.webmanifest
M	client/realm-story.js
M	client/realms-rebuilt.js
M	client/skills.js
M	client/systems.js
M	client/view3d.js
M	client/world.js
M	docs/boss-candidates/boss_colossus-import.json
M	docs/boss-candidates/boss_varkesh-import.json
M	docs/boss-candidates/boss_xalith-import.json
M	docs/boss-candidates/roster.json
M	docs/boss-roster-review.md
M	docs/lair-integration-checkpoint.md
M	docs/xalith-integration.md
A	emberfall-android/.gitignore
A	emberfall-android/README.md
A	emberfall-android/SignApk.java
A	emberfall-android/app/src/main/AndroidManifest.xml
A	emberfall-android/app/src/main/java/games/emberfall/beta/MainActivity.java
A	emberfall-android/app/src/main/res/drawable/ic_launcher.xml
A	emberfall-android/app/src/main/res/values/styles.xml
A	emberfall-android/build.py
A	emberfall-android/fetch_tools.py
A	emberfall-android/tools.json
M	package-lock.json
M	package.json
M	scripts/qa/benchmark-desktop.cjs
M	scripts/qa/benchmark-engine.cjs
M	scripts/assets/build-boss-models.py
M	scripts/assets/build-boss-shortlist.py
M	scripts/assets/build-icons.mjs
M	scripts/qa/capture-scene.cjs
M	scripts/assets/export-varkesh-blender.py
M	scripts/assets/export-xalith-blender.py
M	scripts/assets/import-approved-creature.py
M	scripts/assets/import-authored-motion.py
M	scripts/assets/import-briarhaven-assets.py
M	scripts/assets/import-fantasy-outfits.py
M	scripts/assets/import-modular-armor.py
M	scripts/assets/import-realms.py
M	scripts/maintenance.mjs
M	scripts/release/package-release.mjs
M	scripts/qa/prepare-ui-review.cjs
M	scripts/qa/render-boss-review.py
M	scripts/qa/render-scene.py
M	scripts/reset-accounts.mjs
M	scripts/qa/review-icons.cjs
M	tests/browser/armor-layout.html
M	tests/rendering/built-assets.mjs
M	tests/server/login.mjs
M	tests/browser/skills-layout.html
M	tests/browser/trade-layout.html
M	vite.config.js
M	worker/api.js
## 6ac2d85dcf98cce9fe0c40c603697b76515478f2

Date: 2026-09-14T01:11:24+02:00

Add Veldren landing page and donation page awaiting payment links


A	client/assets/landing-world.png
A	client/donate.html
M	client/index.html
A	client/landing.css
A	client/landing.html
M	client/manifest.webmanifest
M	scripts/build.mjs
M	tests/rendering/built-assets.mjs
M	vite.config.js
## f738e8755e199ca6a5cc31c2c87932e2cb473251

Date: 2026-09-14T01:15:46+02:00

Finish interrupted menu, swing audio and fitted armour changes


D	client/assets/landing-world.png
A	client/assets/landing-world.webp
M	client/assets/realms/approved-creatures.js
M	client/classic-ui.js
M	client/game-audio.js
M	client/game.js
M	client/landing.html
M	client/realms-rebuilt.js
A	docs/veldren-rename.md
M	scripts/build.mjs
A	tests/gameplay/armour-shells.cjs
M	tests/gameplay/audio.cjs
A	tests/gameplay/branding.cjs
M	tests/gameplay/classic-ui.cjs
M	tests/gameplay/equipment-fit.cjs
## f036018cc9d8f951c93ce361d09368a3b08bc01d

Date: 2026-09-14T02:13:53+02:00

Launch Beta v1 with live realm status and Veldren journal interface


M	db/schema.ts
M	client/classic-ui.css
M	client/classic-ui.js
M	client/hud.js
M	client/index.html
A	client/landing-status.js
M	client/landing.css
M	client/landing.html
A	drizzle/0013_old_argent.sql
A	drizzle/meta/0013_snapshot.json
M	drizzle/meta/_journal.json
M	scripts/build.mjs
M	tests/gameplay/classic-ui.cjs
M	tests/world/map-services.cjs
A	tests/gameplay/server-status.mjs
M	vite.config.js
M	worker/api.js
A	worker/status.js
## 1782589a6841bc75a3691e2a33df38b5b26ab973

Date: 2026-09-14T02:32:25+02:00

Keep character names permanent while allowing appearance edits


M	client/character-creation.js
M	client/classic-ui.css
M	client/game.js
M	client/index.html
M	tests/server/account-flow.cjs
M	tests/server/saves.mjs
M	worker/api.js
## 56a49f0fd76f25131dd02f7030a1a6a76700689b

Date: 2026-09-14T02:45:24+02:00

Reshape Firstlight coast and teach magic before smithing and combat


M	client/game.js
M	client/realm-story.js
M	client/tutorial-island.js
M	client/tutorial.js
M	tests/gameplay/apprenticeship.cjs
M	tests/server/multiplayer.mjs
A	tests/gameplay/tutorial-coast.cjs
A	tests/gameplay/tutorial-order.cjs
M	worker/api.js
## dd6f08e416ada183a2e810a26fc64a25cf6605c1

Date: 2026-09-14T03:25:52+02:00

Add two-part mountain story, Alaric assisted Veyr fight and red Huntsman crossings


M	client/index.html
A	client/mountain-quest.css
A	client/mountain-quest.js
M	client/realms-rebuilt.js
M	client/tutorial-island.js
M	client/view3d.js
A	tests/gameplay/mountain-quest.cjs
M	tests/server/multiplayer.mjs
M	tests/server/saves.mjs
M	worker/api.js
## b25b2c5c4cf777589c4b941a9a3082fc65a5ac24

Date: 2026-09-14T04:38:54+02:00

Synchronize shared world actions and loot; clarify apprenticeship and optimize crowded rendering


M	db/schema.ts
M	client/classic-ui.js
M	client/encounters.css
M	client/encounters.js
M	client/index.html
M	client/loot.js
M	client/mountain-quest.js
M	client/multiplayer.js
M	client/realms-rebuilt.js
A	client/shared-world.js
M	client/skills.js
M	client/style.css
M	client/systems.js
A	client/tutorial-journal.js
M	client/world.js
A	docs/shared-world.md
A	drizzle/0014_slow_sally_floyd.sql
A	drizzle/meta/0014_snapshot.json
M	drizzle/meta/_journal.json
M	scripts/build.mjs
A	scripts/world/export-shared-world.cjs
A	scripts/qa/game-fixture.cjs
A	tests/gameplay/shared-client.cjs
A	tests/gameplay/shared-performance.cjs
A	tests/server/shared-world.mjs
M	worker/api.js
A	worker/shared-catalog.json
A	worker/shared-world.js
## 07048fbc81069cb4a60e28cc730f99c3b63bf228

Date: 2026-09-14T05:29:47+02:00

Repair shared encounter visibility, school door and post-combat trading


M	client/creatures.js
M	client/encounters.js
M	client/multiplayer.js
M	client/realms-rebuilt.js
M	client/shared-world.js
M	client/social.js
M	scripts/world/export-shared-world.cjs
M	tests/gameplay/shared-client.cjs
A	tests/server/shared-two-clients.mjs
M	tests/server/shared-world.mjs
M	worker/shared-catalog.json
M	worker/shared-world.js
## dacae074f48fb2e0c45556985796aa0ecf56b9c1

Date: 2026-09-14T06:01:14+02:00

Move NPC simulation to server and stream combat activity independently


M	client/encounters.js
M	client/lairs.js
M	client/multiplayer.js
M	client/shared-world.js
M	client/view3d.js
M	scripts/build.mjs
M	scripts/world/export-shared-world.cjs
A	tests/server/server-npc-simulation.mjs
M	tests/gameplay/shared-client.cjs
M	tests/server/shared-two-clients.mjs
A	worker/activity.js
M	worker/api.js
A	worker/npc-simulation.js
M	worker/shared-catalog.json
M	worker/shared-world.js
## 40727249974b15570815848f6c7a118f23727275

Date: 2026-09-14T01:42:48-04:00

Guide tutorial actions automatically and persist local character files


M	.gitignore
M	README.md
M	client/classic-ui.js
M	client/index.html
M	client/item-use.js
M	client/trading.js
A	client/tutorial-guidance.css
A	client/tutorial-guidance.js
M	client/tutorial-journal.js
M	client/tutorial.js
A	scripts/dev/local-storage.mjs
M	tests/gameplay/apprenticeship.cjs
A	tests/server/local-storage.mjs
A	tests/gameplay/tutorial-guidance.cjs
M	vite.config.js
## 6c35add891ece49181e3cef86d6e11f9b9d96ccb

Date: 2026-09-14T02:25:13-04:00

Sequence tutor conversations and journal, fix island models, and load local character files


M	README.md
M	client/classic-ui.js
M	client/game.js
M	client/index.html
A	client/ore-identity.js
M	client/realm-story.js
M	client/realms-rebuilt.js
M	client/tutorial-guidance.css
M	client/tutorial-guidance.js
M	client/tutorial-island.js
M	client/tutorial-journal.js
A	client/tutorial-vale.js
M	client/tutorial.js
M	scripts/dev/local-storage.mjs
M	tests/gameplay/apprenticeship.cjs
M	tests/server/local-storage.mjs
M	tests/gameplay/tutorial-guidance.cjs
M	tests/gameplay/tutorial-order.cjs
A	tests/gameplay/tutorial-world-fit.cjs
M	worker/api.js
## 629ae31dd3f4c0c69507b128177ee8b5014caba3

Date: 2026-09-14T02:26:58-04:00

Lower the approach to Vale and keep the rat pen level


M	client/tutorial-island.js
M	tests/gameplay/tutorial-world-fit.cjs
## 46d6e9d1da8a19d2d52466bc8b6b797a39bd62ec

Date: 2026-09-14T03:33:32-04:00

Complete contoured plate armour and compact sequential tutorial coaching


M	client/realm-story.js
M	client/realms-rebuilt.js
M	client/trading.js
M	client/tutorial-guidance.css
M	client/tutorial-guidance.js
M	client/tutorial-vale.js
M	client/tutorial.js
M	tests/gameplay/apprenticeship.cjs
M	tests/gameplay/mountain-quest.cjs
M	tests/gameplay/tutorial-guidance.cjs
A	tests/browser/tutorial-layout.html
A	tests/browser/tutorial-preview.js
M	vite.config.js
## e147bce6a779b826725784a65c0461fc37552876

Date: 2026-09-14T04:50:08-04:00

Fix live local chat delivery, private replies and metal armour tiers


M	db/schema.ts
M	client/realms-rebuilt.js
M	client/social.js
A	docs/proposed-prerequisite-quests.md
A	drizzle/0015_live_local_chat.sql
A	drizzle/meta/0015_snapshot.json
M	drizzle/meta/_journal.json
A	tests/server/local-chat.mjs
M	tests/server/social-maintenance.mjs
M	tests/gameplay/social-ui.cjs
M	tests/browser/tutorial-layout.html
M	tests/browser/tutorial-preview.js
M	worker/social.js
## 0209b83e48a2a44b66237eeef791f0162d083329

Date: 2026-09-14T04:53:41-04:00

Record required linear main-story quest order pending outline approval


M	docs/proposed-prerequisite-quests.md
## e1924b3683cb08daf6069322c90b5bea97df4e34

Date: 2026-09-14T02:18:54-07:00

Implement ordered story quests with cursed oathstones and relic terminology


M	client/game.js
M	client/index.html
A	client/main-story.js
M	client/mountain-quest.js
M	client/realm-story.js
M	client/skills.js
M	client/systems.js
M	client/tutorial-guidance.js
M	client/tutorial-journal.js
M	client/tutorial.js
M	client/world.js
M	docs/proposed-prerequisite-quests.md
M	scripts/world/export-shared-world.cjs
M	scripts/qa/game-fixture.cjs
A	tests/gameplay/main-story.cjs
M	worker/api.js
M	worker/shared-world.js
M	worker/trade-items.json
## f3f7b16a981735b10e495a1668349034f38001ae

Date: 2026-09-14T02:25:21-07:00

Verify quest chain, preserve rescue progress and publish fantasy terminology


M	client/main-story.js
M	client/mountain-quest.js
M	docs/proposed-prerequisite-quests.md
M	tests/gameplay/main-story.cjs
M	tests/gameplay/mountain-quest.cjs
M	tests/server/saves.mjs
A	tests/server/story-server.mjs
M	tests/browser/tutorial-layout.html
M	tests/browser/tutorial-preview.js
M	worker/shared-catalog.json
## a99ea71e7b1d58fa3abe3210e802feb569e74dd7

Date: 2026-09-14T03:40:40-07:00

Fix Rowan crossing permit using exported tutorial finish stages; cover v2-v7 server gates


M	scripts/world/export-shared-world.cjs
M	tests/server/story-server.mjs
M	worker/shared-catalog.json
M	worker/shared-world.js
