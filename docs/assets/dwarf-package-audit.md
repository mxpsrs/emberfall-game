# Dwarf package audit

The uploaded `Dwarf.rar` is not suitable as Veldren's production dwarf character.

- Source: one FBX, 36,233 vertices, 53,100 faces, 25 meshes.
- Rig: no skinning bones or vertex weights.
- Animation: one 0.5125-second transform track whose start and end transforms are
  identical. It contains no walk, idle, attack, hit, or death motion.
- Materials: 24 materials reference diffuse, opacity, specular, and normal textures.
- Included textures: twenty normal/bump maps only. Every diffuse/base-color, opacity,
  and specular image referenced by the FBX is absent.

Replacing current dwarves with this package would create a static, incorrectly shaded
character. It may be reconsidered only after the original textures are supplied and the
mesh is properly rigged with the required gameplay animation set.

