# Asset provenance review — 17 September 2026

This is a repository evidence audit, not a blanket commercial clearance. Unknown does not mean illegal. `asset-inventory-phase3.json` identifies shipped asset files by SHA-256. Source hashes, conversions and individual credits remain in the existing manifests. No raw Blender, FBX, GLB, GLTF, font, WAV or OGG source files are tracked; runtime geometry is converted into game JavaScript. Private source access and browser delivery still need to respect each restricted license.

## SAFE / VERIFIED within the recorded scope

| Pack / content | Evidence | Conditions |
|---|---|---|
| KayKit dungeon, medieval town, adventurers | Three bundled CC0 license files, pinned upstream revisions in `assets/briarhaven/CREDITS.txt` | CC0; original colors baked into converted meshes |
| Quaternius medieval village, base characters, nature/textured trees, standard animation libraries, fantasy props | Bundled credits/licenses and importer provenance | Recorded standard CC0 editions; do not extend this to premium editions |
| Quaternius Fantasy Outfits | Per-part manifest and [author page](https://quaternius.itch.io/modular-character-outfits-fantasy), checked this run | Author explicitly identifies CC0 and commercial use; retargeted and modified |
| Quaternius dungeon bestiary | Bundled license and [QAL 1.0](https://quaternius.com/license.html), checked this run | Commercial incorporated games and modifications allowed; no standalone asset redistribution or false authorship |
| Kenney RPG / Impact sounds | Per-clip hashes, `docs/sound-sources.json`, [RPG Audio](https://kenney.nl/assets/rpg-audio) checked this run | CC0; normalized and shortened |
| Original procedural geometry, UI layout, terrain, particles and synthesized effects | Implementation in renderer, world and audio source | These generated forms are separate from imported meshes and audio |

## NEEDS ATTRIBUTION

| Content | License / credit | State |
|---|---|---|
| Interface SVGs / generated icon sheets | Game-icons.net CC BY 3.0; Lorc, Delapouite, Lucas, sbed, Skoll, Carl Olsen; exact per-icon links and changes in UI credits | [Source terms](https://game-icons.net/about.html) checked. Full credits now accessible from Settings → handbook, including source and license links |
| Xalith / Insectoid Monster Rig | DM-913 (SuperKapoo913), CC BY 4.0 per existing model provenance | Preserve title, creator, source, license and modification notice. Current Sketchfab page returned 403; original license record should be retained with acquisition evidence |
| Varkesh / Prowler Dragon Variant Rig | DM-913 (SuperKapoo913), CC BY 4.0 per existing model provenance | Same attribution requirements; linked from full model credits. Preserve original acquisition evidence |

## UNKNOWN / NEEDS REVIEW before serious commercial release

| Content | Known evidence | Required follow-up |
|---|---|---|
| CH0SAN Modular Warrior | Source hash; prior record of author allowing commercial use in comments; no bundled license | Obtain durable author permission covering modification and browser/game redistribution. Current page could not be independently retrieved. Do not call this a complete license |
| Kevin Iglesias Human Archer Animations FREE; bow/arrow/quiver | Source hash; prior manifest asserts Asset Store EULA. [Author download page](https://kevdev.itch.io/human-archer-animations-free) confirms pack and engine support but gives no license text | Establish which terms attach to the actual itch download and included props; retain license/acquisition record |
| CGTrader Ork/minotaur, Veyr/demon, Colossus/Icebronze | Creator links, source manifests, recorded Royalty Free (no AI). [Icebronze listing](https://www.cgtrader.com/free-3d-models/character/fantasy-character/icebronze) independently confirms creator and license | Retain acquisition/license evidence for each asset; review runtime packaging against incorporated-product and reasonable protection requirements in [CGTrader terms](https://www.cgtrader.com/pages/terms-and-conditions), sections 21A/21B. No standalone redistribution. No AI training |
| Tennessippi Treant / Forest Giant | Source link, recorded CC0; current author page did not expose license text | Retain original CC0 download evidence |
| Quaternius wolf, rat, skeleton, slime from Poly Pizza | Individual source IDs/hashes in monster bundle; recorded CC0 | Retain per-model license snapshots; pack-wide assertions alone are not proof for unrelated downloads |
| Five music tracks | Titles, creator links, source/runtime hashes in `docs/music-sources.json`; three recorded CC0, two owner-supplied Emmraan tracks under Pixabay Content License | Retain acquisition evidence. [Pixabay summary](https://pixabay.com/service/license-summary/) is not evidence of any particular file's ownership. No standalone music distribution |
| Legacy raster sprites: characters, environment, heroes, items, monsters, poses, spirits, spirit portraits, terrain, walking; landing artwork | Tracked files and hashes; incomplete source/license chain | Trace original creation/download evidence or replace after visual approval. Do not infer ownership from filenames or style |
| Mixed model/texture/armor-icon bundles | Multiple sources combined by documented importers | Bundle is only as cleared as each included source; CH0SAN and archer gaps apply to derivative output too |

## REMOVE / REPLACE

No clearly unauthorized commercial-game rip was established in this inspection. No production asset was deleted on suspicion. Legacy raster art, CH0SAN and archer content need permission evidence or planned replacements if that evidence cannot be obtained. This is an explicit release-review list, not a finding that these artists acted improperly.

## Proprietary-material and terminology checks

Reviewed tracked paths, source/import manifests, source URLs, model lineage, credits and rendered game forms. Searched runtime sources/importers for RuneScape, Jagex, OSRS and extraction references. The extraction hits describe unpacking asset packs, not extracting a commercial game. Generic giant rats, goblins, banks and skill names are not evidence of copying. This inspection cannot prove the absence of every possible visual resemblance or copied fragment.

Internal `rune` item/material IDs remain for save/network compatibility; their player-facing values use Relics and Eldrite. Runeforged Colossus remains an inscription-based historical name and is now explained in the Hunts journal. Old Emberfall infrastructure names, hostnames and migration keys are retained deliberately. Historical rejected boss drafts remain development evidence, not approved content. System fonts are used; no third-party font files are tracked.

Public `credits.html` now consolidates model, environment, icon, music and sound credit. Required creator/source/license/modification notices are preserved rather than replaced with a generic thanks.
