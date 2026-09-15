# Recording follow-up: quest access, lighting and connection recovery

Owner requested this batch after IMG_0111.mp4 / IMG_0112.mp4, with typed clarification. The clips were visually inspected; their audio was not transcribed. The latest instruction includes connection recovery as well as outdoor lighting, and forbids indoor light spilling outside, especially during daylight.

## Changes

- All 11 underground destinations use their actual cave aperture or ladder, approach an adjacent navigable tile, and cross on arrival. Removed legacy mine/crypt building shells and doors above ladders. Saved scene/object identities are preserved.
- Larger alternating muddy toe/heel impressions and wider cut harness pieces make evidence visible. Evidence picking follows rendered geometry; CSS-scaled canvases use one coordinate conversion for primary and context clicks.
- One tracked objective drives the pulsing world arrow/ring and clamped minimap arrow. Quest journal identifies NEXT STEP and follows progress. NPC offers and report markers are tied to actual quest state and prerequisites, not NPC category. Finished/unrelated NPC markers disappear.
- All 10 fishing resources occupy actual water beside accessible land. Freshwater species use inland water; marine species use coast. Tutorial fishing stays accessible to Nell. Shared catalog includes corrected positions.
- Added 621 visible street lanterns around all 13 settlements, castle approaches and Tutorial Island. Posts are solid, clear of door approaches, and emit from their visible glass at night. Outdoor lantern illumination and glass glow switch off during daylight.
- Removed unrestricted indoor point lights, including indoor ranges, furnaces and hearths. Permanent room brightness is restricted inside room bounds and below roof height. Houses remain readable inside; roof/exterior surfaces use outdoor lighting.
- Temporary transport failures pause gameplay and recover automatically with bounded backoff, including mobile background/resume. Normal world requests use a 12-second timeout and avoid overlapping polls. Presence cadence is 500 ms; urgent action streaming remains separate.
- Saves retain their exact request and snapshot until acknowledged. Server idempotency acknowledges concurrent/repeated identical saves once. Newer local changes are saved in a subsequent revision before resuming. Removed regular-save keepalive payload restrictions. Maintenance, expired authentication, account reset and genuine newer-device saves remain hard gates. In-flight world packets cannot mutate a paused session.

## Verification

Local checks cover all 22 rendered cave/ladder transitions, all 45 story stages and every village/frontier quest, sequential clue targets, marker cleanup, all 10 fishing spots and settlement/castle lighting, 193 connected house interiors, model/pose picking and scaled-canvas clicks. Main-story and both mountain chapters were walked through with real routes, gates, crafting, combat, death/retry and durable rewards.

Connection checks exercise six repeated interruptions, mobile background/resume, lost save responses, intervening local progress and maintenance/auth/conflict gates. Authenticated SQLite tests verify concurrent save retry commits once and preserves revision/reset guards. The packaged Worker is checked for fresh asset URLs and parseable startup assets. Native offscreen renders inspect bootprint readability and final night lighting; they are not physical-device/browser certification.

No account reset or database schema change. These checks do not certify sustained hosted capacity for 39 players or every real-device/network condition. Publication requires the in-game system update countdown, confirmed maintenance lock, successful deployment, and reopening the same maintenance request, as mandated by AGENTS.md.

## Publication

Published successfully as v104 at 2026-09-15 07:27:35 UTC. Runtime source: `b58fa2d3bd7a586f987be686d26ee096e02c9be2`; deployment: `appgdep_6aa8f358fcac819180358297b10406e8`. Maintenance request `quest-lighting-recovery-20260915` ran the complete two-minute countdown, reported locked before deployment, and reported open after deployment. No account reset.
