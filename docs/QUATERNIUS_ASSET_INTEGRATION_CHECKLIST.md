# Quaternius Asset Integration Checklist

Use this checklist before a Quaternius model, modular kit, or animation is allowed into a playable Veldren scene. A visually recognizable import is not sufficient: the asset must retain its intended proportions, modular role, interior logic, collision, and animation behavior.

## Authoritative references

- Official Quaternius YouTube channel: https://www.youtube.com/@quaternius
  - [Medieval Village MegaKit - 3D Asset Pack](https://www.youtube.com/watch?v=rSOw4KzIhUA) — visual reference for the kit's modular buildings, streets, interiors, scale, and finished-town density.
  - [Universal Animation Library - 3D Asset Pack](https://www.youtube.com/watch?v=-VXFlXhvD6A) — motion-set and rig reference for the first universal animation library.
  - [Universal Animation Library 2 - for Godot Unreal and Unity](https://www.youtube.com/watch?v=2Hd5nH122OE) — current animation coverage and engine-target reference.
  - [How to Retarget Animations in Godot, Unity, Blender and Unreal](https://www.youtube.com/watch?v=XRze-Npw8eU) — required retargeting workflow reference.
  - [2 SIMPLE Texturing Techniques for Blender 2.8](https://www.youtube.com/watch?v=JjVF-VDkd3U) — material and atlas workflow reference.
- Quaternius tutorial catalog: https://quaternius.com/tutorials.html
  - 11 — Medieval House
  - 13 — Run Animation
  - 16 — Animation Basics
  - 19 — Atlas Texturing
  - 23 — Simple Walk Animation
  - 27 — UV Mapping Basics
- Medieval Village MegaKit: https://quaternius.itch.io/medieval-village-megakit
  - The kit is a grid-based modular environment system.
  - Walls include exterior and interior faces.
  - Floors, roofs, stairs, and optimized collision are separate authored pieces.
- Universal Animation Library: https://quaternius.itch.io/universal-animation-library
  - Universal humanoid rig, retargeting, 8-direction locomotion, and root-motion/in-place variants.

The channel videos are the primary visual standard. The pack pages and tutorial catalog are supporting specifications for formats, license, modularity, collision, and animation behavior.

## Official-video review log

Use one row for every Quaternius pack admitted into production. A pack is not approved merely because a download succeeded.

| Official video | Applies to | Required implementation evidence | Status |
| --- | --- | --- | --- |
| Medieval Village MegaKit | Buildings, walls, roofs, stairs, gates | Grid-snapped modules, correct player scale, usable interior plan, matching collision | City-gate pass in review |
| Universal Animation Library | Existing locomotion/combat set | Rig map, clip manifest, foot-contact test, deliberate root-motion choice | Existing import; re-audit required |
| Universal Animation Library 2 | Expanded locomotion/combat/work actions | Compatibility matrix and transition test before replacing any live clip | Candidate only |
| Retargeting in Godot/Unity/Blender/Unreal | Every character-animation import | Saved bone map, rest-pose comparison, no foot slide or doubled root | Required before merge |
| Texturing Techniques | Modular architecture and props | Preserved UVs, shared atlas/material, consistent texel density | Required before merge |

## 1. Classify the asset before importing it

- [ ] Record pack, filename, author, license, source URL, and source hash.
- [ ] Classify it as one of: complete building, modular structure piece, prop, foliage, character, or animation.
- [ ] Do not use a complete building or decorative tower as a wall module, gate pier, room shell, or scalable primitive.
- [ ] Do not treat a decorative door, window, stair, or arch as functional unless its opening and collision were authored or rebuilt for gameplay.
- [ ] Prefer the pack's modular walls, floors, stairs, roofs, and collision shapes when constructing explorable architecture.

## 2. Establish scale with the player first

- [ ] Import at uniform scale before making any axis-specific adjustment.
- [ ] Measure the source bounds and place a standard Veldren character beside the asset.
- [ ] Door clear width is at least 1.2 world units; important public doors target 1.6–2.4.
- [ ] Door clear height is at least 2.4 world units; gates and ceremonial entrances are larger.
- [ ] A stair tread is deep enough for navigation and its per-cell rise does not exceed 0.72.
- [ ] A floor has believable headroom and furniture is usable at the same player scale.
- [ ] Never repair a tiny entrance by stretching a complete model non-uniformly. Rebuild with modular pieces or select the correct model.

## 3. Assemble explorable architecture as a system

- [ ] Snap compatible modules to the kit grid and preserve their intended pivots and orientation.
- [ ] Build exterior and interior wall faces together; no paper-thin facade masquerades as an explorable building.
- [ ] Create a continuous plan: exterior approach → doorway → room/courtyard → stair → upper floor or rampart.
- [ ] Use physical stairs, ramps, ladders, and landings in the live scene whenever the spaces are spatially connected.
- [ ] Scene transitions are reserved for genuinely separate areas, not ordinary stairs between visible floors.
- [ ] Roofs and camera-facing walls use local cutaway behavior only while occupied; the rest of the building remains visible.
- [ ] Town and castle silhouettes remain visible at the normal desktop draw distance.

## 4. Collision and navigation must match the art

- [ ] Structural walls block movement exactly where their visible footprint says they should.
- [ ] Every visible doorway has a matching collision opening.
- [ ] Decorative meshes do not create invisible blockers.
- [ ] Upper decks cannot be reached by stepping vertically through a wall; their valid stair/ramp route is required.
- [ ] A player can enter, cross, climb, descend, and exit without teleporting or changing scenes.
- [ ] NPC pathfinding reaches every gameplay room and does not cut through tower shells, walls, furniture, or closed gates.
- [ ] Camera rotation and zoom do not expose missing backs, empty shells, or detached upper floors.

## 5. Materials, UVs, and visual consistency

- [ ] Preserve authored UV islands and verify the intended atlas/material slot.
- [ ] Keep texel density consistent across adjacent modular pieces.
- [ ] Do not substitute flat colors when the pack includes a suitable authored texture or atlas region.
- [ ] Confirm normals, winding, back-face behavior, and seams in both GPU and software fallback renderers.
- [ ] Repeated modules share materials and mesh data instead of creating unique copies.
- [ ] Regional recolors retain readable material separation and do not erase doors, trim, windows, or masonry courses.

## 6. Characters and animations

- [ ] Preserve the source rest pose, bone hierarchy, names, and root transform before retargeting.
- [ ] Choose root-motion or in-place clips intentionally; never mix them accidentally in one locomotion state.
- [ ] Verify source frame rate and duration. Current Universal Animation Library files target 30 fps.
- [ ] Check left/right foot contacts, loop seam, stride distance, ground height, and playback speed in game.
- [ ] Test idle → walk → run → stop and 8-direction changes with equipped gear.
- [ ] Test combat, gathering, emotes, and death clips against the same retargeted skeleton.
- [ ] Reject deformed shoulders, twisted elbows, sliding feet, doubled roots, or floating characters.

## 7. Performance and distance

- [ ] Provide sensible mesh/detail tiers without changing the structure's footprint or making it disappear nearby.
- [ ] Keep castles, gatehouses, city walls, and other navigational landmarks resident beyond the immediate screen edge.
- [ ] Reduce small clutter before reducing architectural draw distance.
- [ ] Reuse atlas textures, static meshes, and instancing where practical.
- [ ] Test desktop and mobile budgets separately; performance work must not silently lower normal visual quality.

## 8. Required evidence before merge

- [ ] Exterior screenshot with a player at the entrance for scale.
- [ ] Interior/cutaway screenshot proving the room is real.
- [ ] Stair or ramp screenshot showing the continuous route and upper landing.
- [ ] Route test covering entrance, interior, upper level, and exit.
- [ ] Collision test for walls, openings, closed gates, and elevated edges.
- [ ] Camera orbit test and normal/wide draw-distance test.
- [ ] GPU render plus software-fallback render.
- [ ] Asset provenance and license test.
- [ ] Commit only after the visual and functional evidence match the same source revision.

## Current city-gate acceptance gate

- [x] Complete decorative `towerBase` model removed from city-gate duty.
- [x] Gate towers rebuilt from modular structural geometry.
- [x] Guard-tower footprint increased to 11 × 13 world units.
- [x] Player-scale 2.4 × 3.2 doorway openings added to both faces.
- [x] Tower perimeter collision and doorway collision openings share the visible plan.
- [x] Continuous physical stair geometry and upper guard walk remain in the overworld.
- [x] Final exterior render comparison approved.
- [x] Final interior/cutaway render approved.
- [x] Full navigation and regression suite passed.
- [ ] Corrected public release verified from a fresh and already-open game tab.
