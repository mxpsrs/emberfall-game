"""Import the complete free Quaternius environment catalogs used by Veldren.

Usage:
  python scripts/assets/import-full-quaternius-environment.py /path/to/quaternius-full-v2

The source folder must contain the extracted Standard editions under
``medieval/``, ``nature/`` and ``props/``.  Existing characters, animations,
creatures and hand-authored additions in ``REALM_MODELS`` are preserved.
"""

import base64
import hashlib
import json
import pathlib
import subprocess
import sys

import numpy as np
from PIL import Image


ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCE = pathlib.Path(sys.argv[1])
DEST = ROOT / "client/assets/realms"

helpers = (ROOT / "scripts/assets/import-briarhaven-assets.py").read_text()
scope = {"__file__": str(ROOT / "scripts/assets/import-briarhaven-assets.py")}
exec(helpers[: helpers.index("out={'models':{},'rigs':{}}")], scope)
Model = scope["Model"]
packed = scope["packed"]


class SourceModel(Model):
    def __init__(self, path):
        self.path = path
        self.g = json.loads(path.read_text())
        self.buffers = [
            base64.b64decode(buffer["uri"].split(",")[1])
            if buffer["uri"].startswith("data:")
            else (path.parent / buffer["uri"]).read_bytes()
            for buffer in self.g["buffers"]
        ]
        self.parent = {
            child: index
            for index, node in enumerate(self.g["nodes"])
            for child in node.get("children", [])
        }


def load_runtime():
    raw = (DEST / "models.js").read_text()
    return json.loads(raw.split("=", 1)[1].rstrip(";\n"))


runtime = load_runtime()
try:
    baseline_raw = subprocess.check_output(
        ["git", "show", "HEAD:client/assets/realms/models.js"], cwd=ROOT, text=True
    )
    protected_models = sorted(json.loads(baseline_raw.split("=", 1)[1].rstrip(";\n"))["models"])
except Exception:
    protected_models = sorted(runtime["models"])
atlas = Image.open(DEST / "atlas.png").convert("RGBA")
atlas_pixels = np.array(atlas)
texture_digests = runtime.setdefault("propTextures", {})
tile_names = runtime.setdefault("tiles", {})


def texture_slot(path, pack):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest in texture_digests:
        return texture_digests[digest]
    if path.stem in tile_names:
        slot = tile_names[path.stem]
        texture_digests[digest] = slot
        return slot

    slot = max([0] + list(tile_names.values()) + list(texture_digests.values())) + 1
    assert slot < 64, "The 8x8 world texture atlas is full"
    image = Image.open(path).convert("RGBA").resize((508, 508), Image.Resampling.LANCZOS)
    tile = image.resize((512, 512))
    tile.paste(image, (2, 2))
    tile_x, tile_y = (slot % 8) * 512, (slot // 8) * 512
    atlas.paste(tile, (tile_x, tile_y))
    atlas_pixels[tile_y : tile_y + 512, tile_x : tile_x + 512] = np.asarray(tile)
    texture_digests[digest] = slot
    tile_names.setdefault(path.stem, slot)
    tile_names.setdefault(pack + "_" + path.stem, slot)
    return slot


def convert_model(path, key, pack):
    model = SourceModel(path)
    pose = model.pose()
    merged = {field: [] for field in ["p", "n", "uv", "i", "t", "c", "f"]}
    offset = 0

    for node_index, node in enumerate(model.g["nodes"]):
        if "mesh" not in node:
            continue
        transform = pose[node_index]
        for primitive in model.g["meshes"][node["mesh"]]["primitives"]:
            attributes = primitive["attributes"]
            positions = model.acc(attributes["POSITION"])
            normals = model.acc(attributes["NORMAL"])
            positions = (transform @ np.c_[positions, np.ones(len(positions))].T).T[:, :3]
            normals = (np.linalg.inv(transform[:3, :3]).T @ normals.T).T
            normals /= np.maximum(1e-8, np.linalg.norm(normals, axis=1)[:, None])
            uv = (
                model.acc(attributes["TEXCOORD_0"])
                if "TEXCOORD_0" in attributes
                else np.zeros((len(positions), 2))
            )
            vertex_color = (
                model.acc(attributes["COLOR_0"])[:, :3]
                if "COLOR_0" in attributes
                else np.ones((len(positions), 3))
            )
            material = model.g.get("materials", [{}])[primitive.get("material", 0)]
            pbr = material.get("pbrMetallicRoughness", {})
            factor = np.asarray(pbr.get("baseColorFactor", [1, 1, 1, 1])[:3])
            slot = 0
            if "baseColorTexture" in pbr:
                texture_index = pbr["baseColorTexture"]["index"]
                image_index = model.g["textures"][texture_index]["source"]
                texture_path = path.parent / model.g["images"][image_index]["uri"]
                slot = texture_slot(texture_path, pack)
            u = ((slot % 8) * 512 + 2 + (uv[:, 0] % 1) * 508).astype(int)
            v = ((slot // 8) * 512 + 2 + (uv[:, 1] % 1) * 508).astype(int)
            colors = np.clip(vertex_color * factor, 0, 1)
            fallback = np.clip(atlas_pixels[v, u, :3] / 255 * colors, 0, 1)
            values = {
                "p": positions,
                "n": normals,
                "uv": uv,
                "i": model.acc(primitive["indices"]).ravel() + offset,
                "t": np.full(len(positions), 20 + slot),
                "c": colors,
                "f": fallback,
            }
            for field, value in values.items():
                merged[field].append(value)
            offset += len(positions)

    assert 0 < offset < 65536, f"{key} exceeds the 16-bit mesh limit"
    merged = {field: np.concatenate(values) for field, values in merged.items()}
    encoded = {
        field: packed(merged[field], dtype)
        for field, dtype in [("p", "<f4"), ("uv", "<f4"), ("i", "<u2"), ("t", "u1")]
    }
    encoded["n"] = packed(np.round(np.clip(merged["n"], -1, 1) * 127), "i1")
    for field in ["c", "f"]:
        encoded[field] = packed(np.round(np.clip(merged[field], 0, 1) * 255), "u1")
    encoded["bounds"] = [merged["p"].min(axis=0).tolist(), merged["p"].max(axis=0).tolist()]
    runtime["models"][key] = encoded
    return offset


catalogs = {
    "medieval": (SOURCE / "medieval", ""),
    "nature": (SOURCE / "nature", ""),
    "props": (SOURCE / "props", "World_"),
}
report = {}
imported_models = {}
for pack, (folder, prefix) in catalogs.items():
    paths = sorted(folder.rglob("*.gltf"))
    assert paths, f"No glTF models found under {folder}"
    vertices = 0
    for path in paths:
        vertices += convert_model(path, prefix + path.stem, pack)
    imported_models[pack] = [prefix + path.stem for path in paths]
    report[pack] = {"models": len(paths), "vertices": vertices}
    print(pack, len(paths), "models", vertices, "vertices", flush=True)

runtime["fullEnvironmentCatalog"] = {
    "version": 1,
    "packs": report,
    "source": "Quaternius Standard editions",
    "protectedModels": protected_models,
    "importedModels": imported_models,
}
(DEST / "models.js").write_text(
    "const REALM_MODELS=" + json.dumps(runtime, separators=(",", ":")) + ";\n"
)
atlas.save(DEST / "atlas.png", optimize=True)
print("Wrote", len(runtime["models"]), "runtime models and", len(set(tile_names.values())), "atlas slots")
