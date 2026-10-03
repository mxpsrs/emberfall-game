# Modular building repair

Settlement generation now uses purpose-specific footprints: narrow shops, broad workshops, long temples, larger inns/halls, and five residence proportions. Ordinary buildings use one main roof per volume, with two authored gable closures; terraces and temple caps have their own assemblies.

Wall courses join on their structural two-metre span. Closing bays adjust width without stretching the wall height or thickness. Entrance bays keep their authored size and align with the existing service threshold and animated door hinge. Floors cover every house shell, including cutaways and buildings with separate interiors. Loft depth reserves enough length for physical stairs in shorter houses.

Twelve additional modules are reproducibly packed from the existing canonical Quaternius imports, preserving their geometry, UVs, atlas assignments, and canonical material identities. Window openings, inserts, and shutters share the same bay position and rotation. Editor wall snapping uses structural joints rather than projecting trim thickness into adjoining walls. Loading the older generated modular-shell format also repairs duplicate roofs, missing floors/gables and misaligned entrance leaves while preserving saved parent placement, walls and furniture. These repairs enter the canonical Scene and persist on the next owner editor save.

Validation:
- 224 ordinary building shells: 19 footprint sizes, 30 used kit modules, complete floors, one main roof, paired gables, and door leaf/opening/threshold alignment.
- All four door orientations, closed/open collision and clear inside/outside approaches.
- Actual stairs and reachable rooms across 13 settlements, three castles, and 16 intentional interior floors.
- Native Scene geometry parity, hierarchy transforms, door state, save/load/unload, editor module history, serialization, and isolated invalid edits.
- Authenticated shared castle gates, upper floors, preserved character saves, and quarry interactions.
- Filament renderer contract and real Filament/WASM static transform submission.
- Offscreen geometry inspections of Briar Haven and a small village. These use the existing capture renderer and do not certify browser, phone, or live hosting performance.

No account reset, renderer replacement, PR merge, or change to PR #1 is part of this update. The pre-existing tutorial edit warning for missing entity 5100005 remains.
