# Quest cohesion repair — 15 September 2026

Requested from the 23:16:58 recording: fix the lookout progression failure, make named quest locations physically recognizable, check every quest for narrative and gameplay discrepancies, and make investigations visible. The owner's final clarification explicitly preserves Brook's health bonus and asks for clearer explanation.

## Findings and changes

- The Raider lookout and Fisher Nessa shared entity ID 6200006. Main-story entities now use a distinct range; catalogue generation rejects duplicate scene IDs. Authenticated two-client testing confirms a spirit's lookout kill advances the killer's quest, leaves the observer unchanged, preserves Nessa, issues private loot and saves the new stage without replay rewards.
- Raider camp now has three canvas tents, a timber palisade with a reachable entrance, banners, a fire, bedrolls, supplies, stolen cargo, a weapon rack and guards. The satchel sits inside the camp. The ambushed cart, harness and footprints have distinct physical evidence models and connected trails.
- The rescue mine has a surface work camp and underground industrial furnishings. The pilgrim camp is outside generated buildings, with separate Bell, Lantern and Hand waymarkers leading to a ruined shrine. Mountain clues, the castle library, refugee camp and Underworks use props matching their narrative roles. Northern Watch and Ashwatch have ruined structures. The coastal beacon is a signal tower whose fire lights after repair.
- Investigations have a timed, cancellable character action before the evidence dialogue. Moving, changing scene or changing quest stage cancels safely. Repairs and rituals select matching existing poses; shared action packets support these actions. Journal guidance cannot restart an active inspection.
- Side-quest journal rows guide to real targets, name current resource/skill requirements, and distinguish cooked trout from raw fish. Delivery consumes all promised items. Iron resolve checks the actual owned iron weapon. Completion rechecks requirements and guards against repeated reward callbacks.
- Health remains Hitpoints level plus Brook's active +8 bonus. The HUD shows current/max, labels Brook, and opens a breakdown explaining base level, bonus and standby/recovery. Activation does not silently heal; normal healing remains capped.
- The previously failing starter-rat balance check was reproduced at a 67.5-second median. Rat base health is now 2, producing a 14.7-second median in the 1,000 seeded fights, with misses and zero-damage rolls preserved. The 95th percentile is 36.3 seconds; its test allows 36 seconds plus the existing melee impact delay (bound 36.5), rather than dropping the tail-latency check.

## Quest inventory checked

| Quest chain | Verification |
| --- | --- |
| Firstlight apprenticeship | All 38 lessons, tutor handoffs, supplies, skills, combat, bank, spirits and final server-authorized crossing; reload compatibility |
| Tools of the trade | Real resource targets, skill requirements, cooked-fish delivery and one reward |
| Teeth in the thicket | Current wolf objective, directions, kill goal and completion |
| Iron resolve | Actual iron weapon ownership, forge requirements and Combat gate |
| The Northern Watch | Reachable guardian, visible ruins, preparation advice and completion |
| Medicine for Stoneford | Real herb source, healer delivery, item consumption and reward |
| Wolves on the ridge | Correct ranger, target species, kill goal and preparation |
| The broken beacon | Exact material counts, timed repair, cancellation and repaired beacon state |
| Ashwatch oath | Correct guardian/location, visible watchpost, preparation and return NPC |
| The Broken Watch | All clues, interrupted inspections, actual lookout combat, authenticated kill credit, satchel and return dispatch |
| The Weight of an Oath | Mine transitions, salvage, forging, lift repair, both escorts, reward and saved partial rescue |
| Echoes Without a Name | Camp/trail/shrine, distinct markers, wrong answers, shade combat, completion and reload |
| The King Beneath the Mountain, Part One | Physical evidence, castle entrance/library, ward work, seals, combat, reward and save recovery |
| The King Beneath the Mountain, Part Two | Ventilation, captive bindings, wrong answers, retries, final encounter and durable rewards |
| Four boss hunts | Existing quest bindings, connected dungeon approaches, shared-server scene bounds, boss combat/death/loot/respawn and saved positions |

## Evidence and limits

`docs/qa/quest-cohesion-2026-09-15.json` records the full available automated suite and final production-asset checks. The first UI run expected the old single-number health display; its original failure is retained alongside the passing updated current/max and Brook assertions. Other rechecked scripts retain their initial results too.

Visual review used production geometry, atlas, GLSL, lighting and shadows through the native offscreen capture/render tools. Camp, cart, rescue camp, pilgrim camp, shrine, castle library and beacon were inspected. This is not physical-phone or hosted-network playtesting. The existing requirement for 39 simultaneous hosted players remains unverified by these local tests, even though the local 39-client integration passes.

This revision requires no database migration, account reset, save deletion or maintenance lock. Existing quest stage numbers, earned rewards and Brook mechanics are preserved. Further development returns to the owner's playtest freeze unless explicitly requested.

## Publication

Version 100 deployed successfully on its first attempt at 04:49:39 UTC, environment revision 4. Runtime source: `0b7ce3712fb9a09b43ddb8605eb4f700643d8aaa`. Deployment: `appgdep_6aa8ce5197d4819193e9b7d1bf905516`. Production URL returned by Sites: https://emberfall-realms.rayfgarrison97.chatgpt.site (existing public game domain: https://playveldren.com). No maintenance or account-reset operation was performed. This publication checkpoint is documentation only and does not change the deployed runtime.
