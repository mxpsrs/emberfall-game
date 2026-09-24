"""Import the two CC-BY cape assets used by Veldren.

Usage: python scripts/import-capes.py /path/to/cape /path/to/red-leather-cape

The first directory is the extracted Karnage cape archive.  The second is the
extracted KodaWowo red leather cape archive.  Source files remain external;
the game stores fitted web meshes, an attributed leather atlas tile, a locally
authored woven-cloth tile, and provenance hashes.
"""
import base64
import hashlib
import importlib.util
import json
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
CLOTH_TEXTURE = ROOT/'art/cape-adventure-cloth.png'
ATLAS_TILE = 512
ATLAS_CONTENT = 508
ATLAS_INSET = 2
spec = importlib.util.spec_from_file_location('motion', ROOT/'scripts/import-authored-motion.py')
motion = importlib.util.module_from_spec(spec)
spec.loader.exec_module(motion)


def normal_matrix(matrix):
    return np.linalg.inv(matrix[:3, :3]).T


def primitives(source, names=None, texture=False):
    result = []
    base = None
    if texture:
        base = np.asarray(Image.open(source.path.parent/'textures/Scene_-_Root_baseColor.png').convert('RGB'), dtype=float)/255
    for node_index, node in enumerate(source.nodes):
        if 'mesh' not in node or names is not None and node.get('name') not in names:
            continue
        matrix = source.rest[node_index]
        for primitive in source.g['meshes'][node['mesh']]['primitives']:
            attributes = primitive['attributes']
            position = source.acc(attributes['POSITION']).astype(float)
            position = (matrix@np.c_[position, np.ones(len(position))].T).T[:, :3]
            normal = source.acc(attributes['NORMAL']).astype(float)@normal_matrix(matrix).T
            normal /= np.maximum(1e-8, np.linalg.norm(normal, axis=1)[:, None])
            uv = source.acc(attributes['TEXCOORD_0']).astype(float) if 'TEXCOORD_0' in attributes else np.zeros((len(position), 2))
            if base is None:
                color = np.ones((len(position), 3))
            else:
                x = np.clip(np.rint((uv[:, 0] % 1)*max(0, base.shape[1]-1)).astype(int), 0, base.shape[1]-1)
                y = np.clip(np.rint((1-(uv[:, 1] % 1))*max(0, base.shape[0]-1)).astype(int), 0, base.shape[0]-1)
                color = base[y, x]
            index = source.acc(primitive['indices']).ravel().astype(np.int64) if 'indices' in primitive else np.arange(len(position))
            result.append({'name': node.get('name'), 'p': position, 'n': normal, 'c': color, 'uv': uv, 'i': index})
    return result


def combine(parts):
    out = {key: [] for key in ['p', 'n', 'c', 'uv', 'i']}
    offset = 0
    for part in parts:
        for key in ['p', 'n', 'c', 'uv']:
            out[key].append(part[key])
        out['i'].append(part['i']+offset)
        offset += len(part['p'])
    return {key: np.concatenate(value) for key, value in out.items()}


def cluster(mesh, cell, uv_cell=None):
    """Web LOD with optional UV-aware clustering for runtime textures."""
    keys = np.rint(mesh['p']/cell).astype(np.int64)
    if uv_cell:
        # Do not collapse distinct texture seams merely because two vertices
        # occupy the same position. That was harmless for baked colours but
        # smears the artist's leather texture when sampled at runtime.
        keys = np.c_[keys, np.rint(mesh['uv']/uv_cell).astype(np.int64)]
    _, inverse = np.unique(keys, axis=0, return_inverse=True)
    count = int(inverse.max())+1
    data = {}
    totals = np.bincount(inverse, minlength=count).astype(float)
    for key in ['p', 'n', 'c', 'uv']:
        value = np.zeros((count, mesh[key].shape[1]), dtype=float)
        np.add.at(value, inverse, mesh[key])
        data[key] = value/totals[:, None]
    data['n'] /= np.maximum(1e-8, np.linalg.norm(data['n'], axis=1)[:, None])
    triangles = inverse[mesh['i']].reshape(-1, 3)
    triangles = triangles[(triangles[:, 0] != triangles[:, 1]) & (triangles[:, 1] != triangles[:, 2]) & (triangles[:, 2] != triangles[:, 0])]
    # Exact duplicates are common in the rope exports after clustering.
    canonical = np.sort(triangles, axis=1)
    _, keep = np.unique(canonical, axis=0, return_index=True)
    data['i'] = triangles[np.sort(keep)].ravel()
    return data


def fitted_weights(position, rig_names, collar_min_y):
    pelvis, spine1, spine2, spine3 = [rig_names.index(name) for name in ['pelvis', 'spine_01', 'spine_02', 'spine_03']]
    anchors = np.array([.18, .68, 1.10, collar_min_y])
    joints = np.zeros((len(position), 4), dtype=np.uint8)
    weights = np.zeros((len(position), 4), dtype=float)
    bones = [pelvis, spine1, spine2, spine3]
    for row, y in enumerate(position[:, 1]):
        if y <= anchors[0]:
            joints[row, 0], weights[row, 0] = bones[0], 1
        elif y >= anchors[-1]:
            joints[row, 0], weights[row, 0] = bones[-1], 1
        else:
            hi = int(np.searchsorted(anchors, y)); lo = hi-1
            mix = (y-anchors[lo])/(anchors[hi]-anchors[lo])
            mix = mix*mix*(3-2*mix)
            joints[row, :2] = [bones[lo], bones[hi]]
            weights[row, :2] = [1-mix, mix]
    return joints, weights


def encode(mesh, rig_names, source, note, material_slot, collar_min_y):
    joints, weights = fitted_weights(mesh['p'], rig_names, collar_min_y)
    position = mesh['p']
    bounds = [position.min(0).tolist(), position.max(0).tolist()]
    fallback = mesh.get('f', mesh['c']*.78)
    record = {
        'p': motion.packed(np.rint(position*10000), '<i2'), 'pScale': .0001,
        'n': motion.packed(np.rint(np.clip(mesh['n'], -1, 1)*127), 'i1'),
        'c': motion.packed(np.rint(np.clip(mesh['c'], 0, 1)*255), 'u1'),
        'f': motion.packed(np.rint(np.clip(fallback, 0, 1)*255), 'u1'),
        'uv': motion.packed(mesh['uv'], '<f4'),
        't': motion.packed(np.full(len(position), 20+material_slot), 'u1'),
        'j': motion.packed(joints, 'u1'), 'w': motion.packed(np.rint(weights*255), 'u1'),
        'i': motion.packed(mesh['i'], '<u2'), 'bounds': bounds,
        'capeSource': source, 'capeAdaptation': note,
        'capeCollarMinY': collar_min_y, 'capeMaterialSlot': material_slot,
    }
    assert len(position) < 65536 and mesh['i'].max(initial=0) < 65536
    return record


def fit_adventure(mesh, female=False):
    p = mesh['p'].copy()
    n = mesh['n'].copy()
    source_y = p[:, 1].copy()
    collar = p[source_y >= source_y.max()-.10].mean(0)
    scale = 1.45/(p[:, 1].max()-p[:, 1].min())
    sx = scale*.92*(.94 if female else 1)
    height = (source_y-source_y.min())/(source_y.max()-source_y.min())
    p[:, 0] = (p[:, 0]-collar[0])*sx
    p[:, 1] = (source_y-source_y.min())*scale+.12+height*(0 if female else .05)
    # Center the source model's actual neck opening around the avatar neck.
    # The lower drape eases rearward so the collar can wrap the neck without
    # pushing the whole cape through the torso.
    p[:, 2] = (p[:, 2]-collar[2])*scale-.04-(1-height)*.12
    n *= np.array([1/sx, 1/scale, 1/scale])
    n /= np.maximum(1e-8, np.linalg.norm(n, axis=1)[:, None])
    out = {**mesh, 'p': p, 'n': n}
    return out


def fit_leather(mesh, anchor, scale, female=False):
    p = mesh['p'].copy()
    n = mesh['n'].copy()
    sx = scale*(.94 if female else 1)
    sz = scale
    p[:, 0] = (p[:, 0]-anchor[0])*sx
    p[:, 1] = (p[:, 1]-.05490172)*scale+.10
    # Keep the complete authored collar and folds. The neck opening intentionally
    # wraps around the upper torso instead of being clamped behind its rear face.
    p[:, 2] = (p[:, 2]-anchor[2])*sz-.35
    n *= np.array([1/sx, 1/scale, 1/sz])
    n /= np.maximum(1e-8, np.linalg.norm(n, axis=1)[:, None])
    return {**mesh, 'p': p, 'n': n}


def sampled_color(mesh, texture):
    image = np.asarray(Image.open(texture).convert('RGB'), dtype=float)/255
    uv = mesh['uv'] % 1
    x = np.clip(np.rint(uv[:, 0]*(image.shape[1]-1)).astype(int), 0, image.shape[1]-1)
    y = np.clip(np.rint((1-uv[:, 1])*(image.shape[0]-1)).astype(int), 0, image.shape[0]-1)
    return image[y, x]


def reserve_texture_slot(world, key):
    slots = world.setdefault('capeTextures', {})
    if key not in slots:
        used = []
        for table in ['tiles', 'treeTextures', 'approvedCreatureTextures', 'capeTextures']:
            used.extend(world.get(table, {}).values())
        slots[key] = max([0]+used)+1
    assert slots[key] < 64, 'World atlas is full'
    return slots[key]


def paste_texture(atlas, texture, slot):
    image = Image.open(texture).convert('RGBA').resize((ATLAS_CONTENT, ATLAS_CONTENT), Image.Resampling.LANCZOS)
    # Wrap the two-pixel guard band from the opposite edge. This keeps repeat
    # seams clean at every camera angle while mipmaps remove distant shimmer.
    pixels = np.asarray(image)
    tile = Image.fromarray(np.pad(pixels, ((ATLAS_INSET, ATLAS_INSET), (ATLAS_INSET, ATLAS_INSET), (0, 0)), mode='wrap'))
    atlas.paste(tile, ((slot % 8)*ATLAS_TILE, (slot // 8)*ATLAS_TILE))


def save_filament_atlas(atlas, destination, tile_size=256):
    # Filament decodes PNGs into RGBA before upload. A tile-by-tile half-size
    # copy keeps startup memory modest and preserves every guarded tile edge.
    output = Image.new('RGBA', (tile_size*8, tile_size*8))
    for row in range(8):
        for column in range(8):
            tile = atlas.crop((column*512, row*512, (column+1)*512, (row+1)*512))
            output.paste(tile.resize((tile_size, tile_size), Image.Resampling.LANCZOS), (column*tile_size, row*tile_size))
    output.save(destination, optimize=True)


def source_hashes(folder):
    return [{'file': str(path.relative_to(folder)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
            for path in sorted(folder.rglob('*')) if path.is_file()]


def build(adventure_folder, leather_folder):
    adventure_source = motion.Gltf(adventure_folder/'scene.gltf')
    leather_source = motion.Gltf(leather_folder/'scene.gltf')
    adventure = combine(primitives(adventure_source))
    static_names = {'cape__0', 'cape rune holder.001__0', 'cape rune holder__0', 'rope__0'}
    wind_names = {'windy cape__0', 'Windy cape rune holder.001__0', 'Windy cape rune holder__0', 'rope.001__0'}
    static = cluster(combine(primitives(leather_source, static_names)), .02, .025)
    wind = cluster(combine(primitives(leather_source, wind_names)), .02, .025)
    leather_texture = leather_folder/'textures/Scene_-_Root_baseColor.png'
    adventure['f'] = sampled_color(adventure, CLOTH_TEXTURE)
    static['f'] = sampled_color(static, leather_texture)
    wind['f'] = sampled_color(wind, leather_texture)
    # Align both authored poses by their upper attachment area, not their broad hem.
    static_anchor = static['p'][static['p'][:, 1] > 1.50].mean(0)
    wind_anchor = wind['p'][wind['p'][:, 1] > 1.50].mean(0)
    scale = 1.45/(static['p'][:, 1].max()-static['p'][:, 1].min())

    destination = ROOT/'dist/assets/realms/models.js'
    world = json.loads(destination.read_text().split('=', 1)[1].rstrip(';\n'))
    atlas_path = ROOT/'dist/assets/realms/atlas.png'
    atlas = Image.open(atlas_path).convert('RGBA')
    cloth_slot = reserve_texture_slot(world, 'adventureCloth')
    leather_slot = reserve_texture_slot(world, 'redLeather')
    paste_texture(atlas, CLOTH_TEXTURE, cloth_slot)
    paste_texture(atlas, leather_texture, leather_slot)
    atlas.save(atlas_path, optimize=True)
    save_filament_atlas(atlas, ROOT/'dist/assets/realms/atlas-filament.png')
    save_filament_atlas(atlas, ROOT/'dist/assets/realms/atlas-filament-mobile.png', 128)
    for sex, avatar in world['avatars'].items():
        names = avatar['rig']['names']
        female = sex == 'female'
        world['armor'][sex]['Adventure_Cloak'] = encode(
            fit_adventure(adventure, female), names, 'Karnage Cape',
            'Woven-cloth atlas texture with dye tint; the authored neck opening is centered around the Veldren neck while the full lower drape eases behind the torso.',
            cloth_slot, 1.38)
        world['armor'][sex]['Red_Leather_Cape_Static'] = encode(
            fit_leather(static, static_anchor, scale, female), names, 'KodaWowo Red Leather Cape',
            'Artist base-color texture in the runtime atlas; UV-aware web LOD; complete neck opening and static authored drape.',
            leather_slot, 1.38)
        world['armor'][sex]['Red_Leather_Cape_Wind'] = encode(
            fit_leather(wind, wind_anchor, scale, female), names, 'KodaWowo Red Leather Cape',
            'Artist base-color texture in the runtime atlas; UV-aware web LOD; complete neck opening and authored wind-blown drape.',
            leather_slot, 1.38)
    destination.write_text('const REALM_MODELS='+json.dumps(world, separators=(',', ':'))+';\n')

    provenance = {
        'assets': [
            {'title': 'Cape', 'author': 'Karnage', 'author_url': 'https://sketchfab.com/Ring1',
             'source': 'https://sketchfab.com/3d-models/cape-61e185ae00b640258071c581ab40f749',
             'license': 'CC-BY-4.0', 'files': source_hashes(adventure_folder)},
            {'title': 'Red Leather Cape - static and blowing', 'author': 'KodaWowo',
             'author_url': 'https://sketchfab.com/KodaWowo',
             'source': 'https://sketchfab.com/3d-models/red-leather-cape-static-and-blowing-616ee4f1d77742bfab6a90044c1116a3',
             'license': 'CC-BY-4.0', 'files': source_hashes(leather_folder)},
        ],
        'adaptation': 'Fitted to both Veldren bodies while preserving each authored neck opening and the full front-to-back drape. Collars remain rigid on the upper torso and the lower cloth uses smooth torso weighting. The Adventure Cloak uses a woven cloth atlas texture beneath its five dyes. The red cape uses KodaWowo\'s base-color texture at runtime with UV-aware deterministic clustering. The artist-supplied static and wind-blown red meshes remain distinct movement states.',
        'textures': {
            'adventure_cloth': {'file': str(CLOTH_TEXTURE.relative_to(ROOT)), 'sha256': hashlib.sha256(CLOTH_TEXTURE.read_bytes()).hexdigest(), 'atlas_slot': cloth_slot, 'authoring': 'OpenAI image generation, normalized to neutral grayscale for Veldren dyes'},
            'red_leather': {'file': str(leather_texture.relative_to(leather_folder)), 'sha256': hashlib.sha256(leather_texture.read_bytes()).hexdigest(), 'atlas_slot': leather_slot, 'author': 'KodaWowo', 'license': 'CC-BY-4.0'},
        },
        'web_meshes': {'adventure_vertices': len(adventure['p']), 'adventure_triangles': len(adventure['i'])//3,
                       'red_static_vertices': len(static['p']), 'red_static_triangles': len(static['i'])//3,
                       'red_wind_vertices': len(wind['p']), 'red_wind_triangles': len(wind['i'])//3},
    }
    (ROOT/'dist/assets/realms/cape-provenance.json').write_text(json.dumps(provenance, indent=2)+'\n')
    credits = ROOT/'dist/assets/realms/CREDITS.txt'
    text = credits.read_text()
    block = ('\nCape: Karnage, CC BY 4.0.\nhttps://sketchfab.com/3d-models/cape-61e185ae00b640258071c581ab40f749\n'
             'Red Leather Cape - static and blowing: KodaWowo, CC BY 4.0.\nhttps://sketchfab.com/3d-models/red-leather-cape-static-and-blowing-616ee4f1d77742bfab6a90044c1116a3\n')
    if 'cape-61e185ae00b640258071c581ab40f749' not in text:
        credits.write_text(text.rstrip()+"\n"+block)
    print(json.dumps(provenance['web_meshes']))


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    build(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]))
