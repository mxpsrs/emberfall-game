# Combat and boss design review

This update is a source draft. The live game remains the previously published version 51. The owner asked to review boss designs before publication; wait for design feedback before deploying this update.

User constraints:

- Preserve missed attacks and successful zero-damage rolls.
- Make starter rats quicker and less punishing. A seeded simulation of 1,000 real fights produced a 4.50-second median, 15.00-second p95, 0.17 mean HP lost, and zero deaths. These are simulation results, not playtest results.
- Regular enemies use straightforward combat. Only Mossfang, the Hollow King, and Runeforged Colossus have phases and ground attack patterns.
- Bosses must have distinct designs matching the existing art style. The current mesh drafts are shown in `boss-design-drafts.png`; the owner has not approved them. They build on existing skeletons and licensed anatomy. Colossus, Nightbloom and Cindermaw have newly modeled bodies; the other six use fitted new equipment and anatomy additions.
- The Tournament is for login and character creation. Medieval Opener is for tutorial and named boss/miniboss fights. Both uploaded MP3s have been integrated alongside existing commercial-use area tracks.
- Sounds cover woodcutting, mining, firemaking, fishing, smithing, cooking and combat. Twenty-four CC0 Kenney recordings supplement procedural sound effects.
- The owner asked whether their and their wife's recordings can voice NPC dialogue. We answered yes for supplied recorded lines, with her permission. No voice recordings have arrived and no voice cloning or voice provider has been configured.

Checks already passed: all 36 tutorial lessons; explicit item use (previous publication); ordinary enemy placement flood; 42 new normal spawns; exactly three phased encounters; starter combat simulation including accurate zero rolls; dodging, retreat, reward persistence; 29 audio cues and five music destinations; base renderer GPU/CPU animation checks; finite posed palettes for all nine boss drafts.

Before publication: incorporate design feedback, check final model silhouettes and animation/weapon placement, rerun encounter/tutorial/audio checks against the final assets, build, verify built assets and multiplayer persistence, push the exact source commit, package and publish through Sites. Do not describe these model drafts as finished or approved.
