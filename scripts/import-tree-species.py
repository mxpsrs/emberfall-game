"""Import six resource silhouettes from Quaternius Textured Stylized Trees (CC0).

Usage: python3 scripts/import-tree-species.py /path/to/Textured-Stylized-Trees
Textures remain the artist's originals; only scale and species assignment vary.
"""
import base64, hashlib, json, pathlib, shutil, sys
import numpy as np
from PIL import Image

root = pathlib.Path(__file__).resolve().parents[1]
source = pathlib.Path(sys.argv[1])
dest = root / 'dist/assets/realms'
out = json.loads((dest / 'models.js').read_text().split('=', 1)[1].rstrip(';\n'))
atlas = Image.open(dest / 'atlas.png').convert('RGBA')
slots = out.setdefault('treeTextures', {})
choices = {
    'normal': ('Tree_1', 'Tree_Leaves.png'),
    'oak': ('Tree_5', 'Tree_Leaves.png'),
    'willow': ('Tree_9', 'Color Variations/Leaves_Light.png'),
    'maple': ('Birch_3', 'Color Variations/Leaves_Orange.png'),
    'yew': ('Pine_3', 'Pine_Leaves.png'),
    'magic': ('Tree_10', 'Color Variations/Leaves_Cyan.png'),
}
def pack(a, dtype):
    return base64.b64encode(np.asarray(a, dtype=dtype).tobytes()).decode()

for species, (name, leaves) in choices.items():
    path = next(source.rglob(name + '.obj'))
    positions, normals, texcoords, faces = [], [], [], []
    material = 'Bark'
    for line in path.read_text().splitlines():
        parts = line.split()
        if not parts: continue
        if parts[0] == 'v': positions.append(list(map(float, parts[1:4])))
        elif parts[0] == 'vn': normals.append(list(map(float, parts[1:4])))
        elif parts[0] == 'vt': texcoords.append(list(map(float, parts[1:3])))
        elif parts[0] == 'usemtl': material = parts[1]
        elif parts[0] == 'f':
            verts = [tuple(int(i) for i in v.split('/')) for v in parts[1:]]
            for i in range(1, len(verts)-1): faces.append((material, [verts[0], verts[i], verts[i+1]]))
    used = {}
    for mat, _ in faces:
        if mat in used: continue
        filename = leaves if 'Leaves' in mat else 'Birch_Bark.png' if 'Birch' in mat else 'Tree_Bark.jpg'
        texture = source / 'Textures' / filename
        digest = hashlib.sha256(texture.read_bytes()).hexdigest()
        if digest not in slots:
            slot = max([0] + list(out['tiles'].values()) + list(slots.values())) + 1
            assert slot < 64, 'World atlas is full'
            im = Image.open(texture).convert('RGBA').resize((508,508), Image.Resampling.LANCZOS)
            tile = im.resize((512,512)); tile.paste(im,(2,2))
            atlas.paste(tile,((slot%8)*512,(slot//8)*512)); slots[digest] = slot
        used[mat] = slots[digest]
        out['tiles']['ResourceTree_' + texture.stem] = slots[digest]
    p,n,uv,t,c,f,indices = [],[],[],[],[],[],[]
    lookup = {}; pixels = np.asarray(atlas)
    for mat, face in faces:
        slot = used[mat]
        for vertex in face:
            key = (mat,vertex)
            if key not in lookup:
                lookup[key] = len(p)
                vi,ti,ni = vertex
                pos = positions[vi-1]; normal = normals[ni-1]
                tex = texcoords[ti-1]; tex = [tex[0],1-tex[1]]
                p.append(pos);n.append(normal);uv.append(tex);t.append(20+slot);c.append([255,255,255])
                x = (slot%8)*512+2+int((tex[0]%1)*507)
                y = (slot//8)*512+2+int((tex[1]%1)*507)
                f.append(pixels[y,x,:3].tolist())
            indices.append(lookup[key])
    p = np.asarray(p); n = np.asarray(n)
    mesh = dict(p=pack(p,'<f4'),n=pack(np.round(np.clip(n,-1,1)*127),'i1'),uv=pack(uv,'<f4'),
                i=pack(indices,'<u2'),t=pack(t,'u1'),c=pack(c,'u1'),f=pack(f,'u1'),
                bounds=[p.min(0).tolist(),p.max(0).tolist()])
    out['models']['ResourceTree_'+species] = mesh
    out.setdefault('resourceTreeSources',{})[species] = dict(file=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),author='Quaternius',license='CC0 1.0',url='https://quaternius.itch.io/textured-lowpoly-trees')
    print(species, name, len(p), 'vertices,', len(indices)//3, 'triangles')

atlas.save(dest / 'atlas.png', optimize=True)
(dest / 'models.js').write_text('const REALM_MODELS='+json.dumps(out,separators=(',',':'))+';\n')
shutil.copyfile(next(source.rglob('License.txt')),dest / 'textured-trees-license.txt')
