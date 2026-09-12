# Combat and boss design review

This update is a source draft. The live game remains the previously published version 51. The owner rejected the procedural boss designs and asked for finished models with existing rigs and animations. The replacement art and name proposals are in [boss-roster-review.md](boss-roster-review.md). All previous draft boss names except Runeforged Colossus are retired. The old runtime labels and save IDs remain in the unpublished draft until the replacement roster is selected; they are not accepted designs. Wait for the owner's visual approval before deploying.

User constraints:

- Preserve missed attacks and successful zero-damage rolls.
- Make starter rats quicker and less punishing. A seeded simulation of 1,000 real fights produced a 4.50-second median, 15.00-second p95, 0.17 mean HP lost, and zero deaths. These are simulation results, not playtest results.
- Regular enemies use straightforward combat. Only a few selected bosses should have phases or multiple attack styles. The existing draft has three phased encounters; the replacement roster has not been mapped onto those slots yet.
- Bosses must use detailed, commercially usable models with existing rigs and animation clips. The mesh drafts in `boss-design-drafts.png` are rejected and superseded by the replacement shortlist. Review actual artist previews and source actions before importing; inspect final silhouettes and weapon grips in motion after integration.
- Runeforged Colossus uses the owner's chosen Icebronze model if its files pass inspection. Its requested fight stays anchored, switches melee/ranged/magic, and has exactly two phases with a red, faster second phase. The current draft's three-phase encounter and combat pursuit do not yet satisfy that request.
- The Tournament is for login and character creation. Medieval Opener is for tutorial and named boss/miniboss fights. Both uploaded MP3s have been integrated alongside existing commercial-use area tracks.
- Sounds cover woodcutting, mining, firemaking, fishing, smithing, cooking and combat. Twenty-four CC0 Kenney recordings supplement procedural sound effects.
- The owner asked whether their and their wife's recordings can voice NPC dialogue. We answered yes for supplied recorded lines, with her permission. No voice recordings have arrived and no voice cloning or voice provider has been configured.

Checks already passed on the older draft: all 36 tutorial lessons; explicit item use (previous publication); ordinary enemy placement flood; 42 new normal spawns; exactly three phased encounters; starter combat simulation including accurate zero rolls; dodging, retreat, reward persistence; 29 audio cues and five music destinations; base renderer GPU/CPU animation checks; finite posed palettes for all nine rejected boss drafts. These checks do not validate any shortlisted replacement model.

Before publication: incorporate design feedback, check final model silhouettes and animation/weapon placement, rerun encounter/tutorial/audio checks against the final assets, build, verify built assets and multiplayer persistence, push the exact source commit, package and publish through Sites. Do not describe these model drafts as finished or approved.
