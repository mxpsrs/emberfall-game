"""Append selected CC0 Quaternius Fantasy Props to the existing world atlas.

Usage: python scripts/assets/import-world-props.py path/to/Fantasy-Props-Standard
The existing character meshes, animation data and texture slots are preserved.
"""
import base64, hashlib, json, pathlib, sys
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCE = pathlib.Path(sys.argv[1])
helpers = (ROOT / 'scripts/assets/import-briarhaven-assets.py').read_text()
exec(helpers[:helpers.index("out={'models':")])
DEST = ROOT / 'client/assets/realms'
out = json.loads((DEST / 'models.js').read_text().split('=', 1)[1].rstrip(';\n'))
atlas = Image.open(DEST / 'atlas.png').convert('RGBA')
slots = out.setdefault('propTextures', {})
selected = '''Anvil_Log Barrel Bed_Twin1 Bed_Twin2 Bench Bookcase_2
BookGroup_Medium_1 BookStand Bucket_Wooden_1 CandleStick Chair_1 Chest_Wood
Crate_Wooden FarmCrate_Apple Lantern_Wall Mug Pickaxe_Bronze Potion_1
Pouch_Large Stall_Cart_Empty Table_Large Table_Plate WeaponStand Workbench'''.split()
for name in list(out['models']):
    if name.startswith('World_') and name[6:] not in selected:
        del out['models'][name]

class SourceModel(Model):
    def __init__(self, path):
        self.path = path
        self.g = json.loads(path.read_text())
        self.buffers = [base64.b64decode(b['uri'].split(',')[1]) if b['uri'].startswith('data:')
                        else (path.parent / b['uri']).read_bytes() for b in self.g['buffers']]
        self.parent = {c:i for i,n in enumerate(self.g['nodes']) for c in n.get('children', [])}

for name in selected:
    model = SourceModel(next(SOURCE.rglob(name + '.gltf')))
    merged = {k:[] for k in ['p','n','uv','i','t','c','f']}
    offset = 0
    pose = model.pose()
    for node, n in enumerate(model.g['nodes']):
        if 'mesh' not in n:
            continue
        for primitive in model.g['meshes'][n['mesh']]['primitives']:
            a = primitive['attributes']
            p = model.acc(a['POSITION']); normal = model.acc(a['NORMAL'])
            m = pose[node]
            p = (m @ np.c_[p,np.ones(len(p))].T).T[:,:3]
            normal = (np.linalg.inv(m[:3,:3]).T @ normal.T).T
            normal /= np.maximum(1e-8, np.linalg.norm(normal,axis=1)[:,None])
            uv = model.acc(a['TEXCOORD_0']) if 'TEXCOORD_0' in a else np.zeros((len(p),2))
            mat = model.g['materials'][primitive.get('material',0)].get('pbrMetallicRoughness',{})
            factor = np.asarray(mat.get('baseColorFactor',[1,1,1,1])[:3])
            slot = 0
            if 'baseColorTexture' in mat:
                tex = model.g['textures'][mat['baseColorTexture']['index']]['source']
                path = model.path.parent / model.g['images'][tex]['uri']
                digest = hashlib.sha256(path.read_bytes()).hexdigest()
                if digest not in slots:
                    slot = max([0] + list(out['tiles'].values()) + list(slots.values())) + 1
                    assert slot < 64, 'World atlas is full'
                    im = Image.open(path).convert('RGBA').resize((508,508),Image.Resampling.LANCZOS)
                    tile = im.resize((512,512)); tile.paste(im,(2,2))
                    atlas.paste(tile,((slot%8)*512,(slot//8)*512))
                    slots[digest] = slot
                slot = slots[digest]
                out['tiles']['FantasyProps_' + path.stem] = slot
            u = ((slot%8)*512+2+(uv[:,0]%1)*508).astype(int)
            v = ((slot//8)*512+2+(uv[:,1]%1)*508).astype(int)
            fallback = np.asarray(atlas)[v,u,:3]/255*factor
            data = dict(p=p,n=normal,uv=uv,i=model.acc(primitive['indices']).ravel()+offset,
                        t=np.full(len(p),20+slot),c=np.tile(factor,(len(p),1)),f=fallback)
            for k,value in data.items(): merged[k].append(value)
            offset += len(p)
    merged = {k:np.concatenate(v) for k,v in merged.items()}
    assert offset < 65536
    mesh = {k:packed(merged[k],dt) for k,dt in [('p','<f4'),('uv','<f4'),('i','<u2'),('t','u1')]}
    mesh['n'] = packed(np.round(np.clip(merged['n'],-1,1)*127),'i1')
    for k in ['c','f']: mesh[k] = packed(np.round(np.clip(merged[k],0,1)*255),'u1')
    mesh['bounds'] = [merged['p'].min(axis=0).tolist(),merged['p'].max(axis=0).tolist()]
    out['models']['World_' + name] = mesh
    print(name, offset, 'vertices')

# The twisted-tree leaf sheet is a red channel mask in the source pack. Its
# default red was reaching the game without the source engine's leaf tint.
# Bake the woodland palette once, preserving the artist's alpha and shading.
if out.get('woodlandPaletteVersion') != 1:
    slot = out['tiles']['Leaves_TwistedTree_C']
    box = ((slot%8)*512,(slot//8)*512,(slot%8+1)*512,(slot//8+1)*512)
    pixels = np.array(atlas.crop(box))
    tone = pixels[:,:,:3].max(axis=2).astype(float)
    for channel,factor in enumerate([.43,.61,.39]): pixels[:,:,channel] = np.round(tone*factor).astype('uint8')
    atlas.paste(Image.fromarray(pixels),box[:2])
    for model in out['models'].values():
        materials = np.frombuffer(base64.b64decode(model['t']),dtype='u1')
        if not np.any(materials == 20+slot): continue
        fallback = np.frombuffer(base64.b64decode(model['f']),dtype='u1').copy().reshape(-1,3)
        uv = np.frombuffer(base64.b64decode(model['uv']),dtype='<f4').reshape(-1,2)
        u = (2+(uv[:,0]%1)*508).astype(int); v = (2+(uv[:,1]%1)*508).astype(int)
        fallback[materials==20+slot] = pixels[v,u,:3][materials==20+slot]
        model['f'] = packed(fallback,'u1')
    out['woodlandPaletteVersion'] = 1

(DEST / 'models.js').write_text('const REALM_MODELS='+json.dumps(out,separators=(',',':'))+';\n')
atlas.save(DEST / 'atlas.png',optimize=True)
credits = DEST / 'CREDITS.txt'
line = '\nQuaternius Fantasy Props MegaKit, Standard edition, CC0 1.0.\nhttps://quaternius.itch.io/fantasy-props-megakit\n'
if 'Fantasy Props MegaKit' not in credits.read_text(): credits.write_text(credits.read_text()+line)
license_path = next(SOURCE.rglob('License_Standard.txt'), None)
if license_path: (DEST / 'FANTASY-PROPS-LICENSE.txt').write_text(license_path.read_text())
print('Imported',len(selected),'models with',len(slots),'shared texture sets.')
