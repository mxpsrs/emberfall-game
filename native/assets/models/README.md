# Native desktop model cache

These OBJ/MTL files are lossless geometry conversions of the eleven local GLB
files in `art/external/kenney-nature`. They exist so the C++ desktop renderer can
load predictable, dependency-free native meshes without executing browser code.

Rebuild them with `scripts/build-native-models.sh`. The source pack is Kenney's
Nature Kit and is released under CC0 1.0; the original local license remains at
`art/external/kenney-nature/License.txt`.
