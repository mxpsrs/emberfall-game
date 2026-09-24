#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
command -v assimp >/dev/null || { echo "assimp is required to rebuild native desktop meshes" >&2; exit 1; }
mkdir -p "$root/native/assets/models"
for source in "$root"/art/external/kenney-nature/*.glb; do
  name="$(basename "$source" .glb)"
  assimp export "$source" "$root/native/assets/models/$name.obj"
done
