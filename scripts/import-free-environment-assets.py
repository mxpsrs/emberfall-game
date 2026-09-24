"""Import the approved free environment starter set into Veldren.

The checked-in inputs are intentionally small and local:
- selected Kenney Nature Kit GLBs (CC0)
- Poly Haven Forest Ground 01 diffuse map (CC0)

Kenney geometry is converted to Veldren's packed vertex format. Poly Haven's
surface contributes luminance detail only, preserving Veldren's authored grass
palette instead of turning the stylized world into a photogrammetry collage.
"""
import base64
import hashlib
import json
import pathlib
import struct

import numpy as np
from PIL import Image, ImageFilter


ROOT = pathlib.Path(__file__).resolve().parents[1]
KENNEY = ROOT / "art/external/kenney-nature"
POLY = ROOT / "art/external/poly-haven/forrest_ground_01_diff_1k.jpg"
GRASS_BASE = ROOT / "art/environment-source/veldren-ground-grass-base.png"
DEST = ROOT / "dist/assets/realms"

SELECTION = {
    "grass_large": "Kenney_GrassLarge",
    "grass_leafsLarge": "Kenney_GrassLeafsLarge",
    "hanging_moss": "Kenney_HangingMoss",
    "mushroom_redGroup": "Kenney_MushroomRed",
    "mushroom_tanGroup": "Kenney_MushroomTan",
    "log_stackLarge": "Kenney_LogStack",
    "plant_bushDetailed": "Kenney_BushDetailed",
    "rock_largeA": "Kenney_RockLarge",
    "flower_purpleA": "Kenney_FlowerPurple",
    "flower_redA": "Kenney_FlowerRed",
    "flower_yellowA": "Kenney_FlowerYellow",
}

PALETTE = {
    "grass": [0.23, 0.34, 0.14],
    "dirt": [0.48, 0.46, 0.39],
    "woodBark": [0.37, 0.25, 0.16],
    "woodInner": [0.72, 0.58, 0.38],
    "woodDark": [0.25, 0.17, 0.12],
    "colorRed": [0.76, 0.23, 0.20],
    "colorPurple": [0.53, 0.39, 0.72],
    "colorYellow": [0.91, 0.67, 0.20],
    "colorTan": [0.69, 0.48, 0.29],
    "_defaultMat": [0.79, 0.74, 0.62],
}


def pack(values, dtype):
    return base64.b64encode(np.asarray(values, dtype=dtype).tobytes()).decode()


def trs(translation, rotation, scale):
    x, y, z, w = rotation
    matrix = np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), translation[0]],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), translation[1]],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), translation[2]],
        [0, 0, 0, 1],
    ], dtype=float)
    matrix[:3, :3] *= scale
    return matrix


class Glb:
    def __init__(self, path):
        raw = path.read_bytes()
        json_length = struct.unpack_from("<I", raw, 12)[0]
        self.g = json.loads(raw[20:20 + json_length])
        self.buffers = [raw[28 + json_length:]]
        self.parent = {child: index for index, node in enumerate(self.g["nodes"])
                       for child in node.get("children", [])}

    def accessor(self, index):
        accessor = self.g["accessors"][index]
        view = self.g["bufferViews"][accessor["bufferView"]]
        dtype = {5120: "i1", 5121: "u1", 5122: "<i2", 5123: "<u2",
                 5125: "<u4", 5126: "<f4"}[accessor["componentType"]]
        width = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4,
                 "MAT4": 16}[accessor["type"]]
        item_size = np.dtype(dtype).itemsize
        offset = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
        return np.ndarray((accessor["count"], width), dtype=dtype,
                          buffer=self.buffers[view["buffer"]], offset=offset,
                          strides=(view.get("byteStride", item_size * width), item_size)).copy()

    def poses(self):
        output = {}

        def visit(index):
            if index in output:
                return output[index]
            node = self.g["nodes"][index]
            local = (np.asarray(node["matrix"]).reshape(4, 4).T if "matrix" in node else
                     trs(node.get("translation", [0, 0, 0]),
                         node.get("rotation", [0, 0, 0, 1]),
                         node.get("scale", [1, 1, 1])))
            output[index] = visit(self.parent[index]) @ local if index in self.parent else local
            return output[index]

        for index in range(len(self.g["nodes"])):
            visit(index)
        return output


def import_kenney(world):
    provenance = {}
    for stem, target in SELECTION.items():
        path = KENNEY / f"{stem}.glb"
        model = Glb(path)
        poses = model.poses()
        positions, normals, colors, indices = [], [], [], []
        vertex_offset = 0
        for node_index, node in enumerate(model.g["nodes"]):
            if "mesh" not in node:
                continue
            transform = poses[node_index]
            normal_transform = np.linalg.inv(transform[:3, :3]).T
            for primitive in model.g["meshes"][node["mesh"]]["primitives"]:
                attributes = primitive["attributes"]
                points = model.accessor(attributes["POSITION"])
                source_normals = (model.accessor(attributes["NORMAL"])
                                  if "NORMAL" in attributes else np.tile([0, 1, 0], (len(points), 1)))
                points = (transform @ np.c_[points, np.ones(len(points))].T).T[:, :3]
                source_normals = (normal_transform @ source_normals.T).T
                source_normals /= np.maximum(1e-8, np.linalg.norm(source_normals, axis=1)[:, None])
                material = model.g.get("materials", [{}])[primitive.get("material", 0)]
                material_name = material.get("name", "_defaultMat")
                fallback = material.get("pbrMetallicRoughness", {}).get("baseColorFactor", [1, 1, 1, 1])[:3]
                color = np.asarray(PALETTE.get(material_name, fallback), dtype=float)
                local_indices = (model.accessor(primitive["indices"]).ravel()
                                 if "indices" in primitive else np.arange(len(points)))
                positions.append(points)
                normals.append(source_normals)
                colors.append(np.tile(color, (len(points), 1)))
                indices.append(local_indices + vertex_offset)
                vertex_offset += len(points)
        points = np.concatenate(positions)
        source_normals = np.concatenate(normals)
        color = np.concatenate(colors)
        triangles = np.concatenate(indices)
        if vertex_offset >= 65536:
            raise ValueError(f"{path.name} exceeds Veldren's 16-bit mesh limit")
        world["models"][target] = {
            "p": pack(points, "<f4"),
            "n": pack(np.round(np.clip(source_normals, -1, 1) * 127), "i1"),
            "c": pack(np.round(np.clip(color, 0, 1) * 255), "u1"),
            "f": pack(np.round(np.clip(color, 0, 1) * 255), "u1"),
            "t": pack(np.zeros(vertex_offset), "u1"),
            "i": pack(triangles, "<u2"),
            "bounds": [points.min(axis=0).tolist(), points.max(axis=0).tolist()],
        }
        provenance[target] = {
            "file": path.name,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "author": "Kenney",
            "pack": "Nature Kit",
            "license": "CC0 1.0",
            "url": "https://kenney.nl/assets/nature-kit",
        }
        print(target, vertex_offset, "vertices", len(triangles) // 3, "triangles")
    world["kenneyNatureSources"] = provenance


def import_poly_haven_grass():
    base = Image.open(GRASS_BASE).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    source = Image.open(POLY).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    luminance = np.asarray(source.convert("L"), dtype=float) / 255
    broad = np.asarray(source.convert("L").filter(ImageFilter.GaussianBlur(10)), dtype=float) / 255
    detail = np.clip(luminance - broad + 0.5, 0, 1)
    base_pixels = np.asarray(base, dtype=float) / 255
    factor = 0.84 + detail[:, :, None] * 0.32
    output = np.clip(base_pixels * factor, 0, 1)
    grass = Image.fromarray(np.round(output * 255).astype("uint8"), "RGB")
    grass.save(DEST / "ground-grass.png", optimize=True)

    atlas = Image.new("RGB", (1024, 1024))
    for name, x, y in [("grass", 0, 0), ("dirt", 1, 0), ("stone", 0, 1), ("water", 1, 1)]:
        image = Image.open(DEST / f"ground-{name}.png").convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
        atlas.paste(image, (x * 512, y * 512))
    atlas.save(DEST / "ground-surfaces.png", optimize=True)
    atlas.save(ROOT / "dist/assets/terrain.png", optimize=True)
    atlas.resize((512, 512), Image.Resampling.LANCZOS).save(DEST / "ground-surfaces-mobile.png", optimize=True)


def append_credits():
    credits = DEST / "CREDITS.txt"
    text = credits.read_text()
    addition = """

Kenney Nature Kit: selected grass, leafy plants, mushrooms, flowers, logs, bushes and rocks.
CC0 1.0. https://kenney.nl/assets/nature-kit
Source GLBs are retained locally under art/external/kenney-nature and converted to Veldren's packed runtime meshes.

Poly Haven Forest Ground 01 by Rob Tuytel: subtle grass-surface luminance detail.
CC0 1.0. https://polyhaven.com/a/forrest_ground_01
The original 1K diffuse map is retained locally; Veldren's authored color palette is preserved.
"""
    if "Kenney Nature Kit: selected grass" not in text:
        credits.write_text(text.rstrip() + addition)


def main():
    world_path = DEST / "models.js"
    world = json.loads(world_path.read_text().split("=", 1)[1].rstrip(";\n"))
    import_kenney(world)
    import_poly_haven_grass()
    append_credits()
    world_path.write_text("const REALM_MODELS=" + json.dumps(world, separators=(",", ":")) + ";\n")


if __name__ == "__main__":
    main()
