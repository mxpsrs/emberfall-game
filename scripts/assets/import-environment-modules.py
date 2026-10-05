"""Add selected modules from the already-used, pinned CC0 KayKit town pack.

Never rebuild avatars or remove existing assets. Source catalog and licenses are
retained in docs/archive/environment-pack-catalog.json and assets/briarhaven/.
"""
import pathlib, json, base64
import numpy as np

root = pathlib.Path(__file__).resolve().parents[2]
scope = {'__file__': str(root / 'scripts/assets/import-briarhaven-assets.py')}
exec((root / 'scripts/assets/import-briarhaven-assets.py').read_text().split("out={'models':{},'rigs':{}}")[0], scope)
Model, packed = scope['Model'], scope['packed']
selected = {
    'curtainWall': 'neutral/wall_straight',
    'timberFence': 'neutral/fence_wood_straight',
    'watchTower': 'blue/building_tower_A_blue',
    'towerBase': 'blue/building_tower_base_blue',
}
target = root / 'client/assets/briarhaven/models.js'
prefix, raw = target.read_text().split('=', 1)
atlas = json.loads(raw.rstrip().rstrip(';'))
for key, path in selected.items():
    model = Model('town', 'Assets/gltf/buildings/' + path + '.gltf')
    arrays = {k: [] for k in ['p','n','c','i']}
    offset = 0
    bounds = []
    for node, n in enumerate(model.g['nodes']):
        if 'mesh' not in n: continue
        for primitive in range(len(model.g['meshes'][n['mesh']]['primitives'])):
            part = model.mesh(node, primitive=primitive)
            bounds.append(part['bounds'])
            for field, dtype in [('p','<f4'),('n','i1'),('c','u1'),('i','<u2')]:
                values = np.frombuffer(base64.b64decode(part[field]), dtype=dtype)
                arrays[field].append(values.astype(np.int64)+offset if field=='i' else values)
            offset += part['count']
    assert 0 < offset < 65536
    mesh = {k: packed(np.concatenate(arrays[k]), dtype) for k,dtype in [('p','<f4'),('n','i1'),('c','u1'),('i','<u2')]}
    mesh.update(count=offset,bounds=[np.min([b[0] for b in bounds],axis=0).tolist(),np.max([b[1] for b in bounds],axis=0).tolist()])
    atlas['models'][key] = mesh
    print(key, sum(len(a) for a in arrays['i'])//3, mesh['bounds'], flush=True)
target.write_text(prefix+'='+json.dumps(atlas,separators=(',',':'))+';\n')
