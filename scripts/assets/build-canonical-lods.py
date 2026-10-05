"""Derive static PBR LODs without crossing materials, UV islands or hard edges."""
import base64, copy, hashlib, json, pathlib
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
PATH = ROOT / 'client/assets/canonical/registry.json'
registry = json.loads(PATH.read_text())
records = {r['id']: r for r in registry['records']
           if r.get('importSettings', {}).get('derivation') != 'vertex-cluster-lod-v1'}
report = []

def decode(stream):
    return np.frombuffer(base64.b64decode(stream['data']), '<f4').reshape(-1, stream['components']).copy()

def stream(values):
    values = np.asarray(values, dtype='<f4')
    return dict(encoding='float32-le', components=values.shape[1], count=len(values),
                data=base64.b64encode(values.tobytes()).decode())

def simplify(primitive, divisor, uv_divisor):
    attrs = {key: decode(value) for key, value in primitive['attributes'].items()}
    p, n = attrs['POSITION'], attrs['NORMAL']
    step = float(np.max(np.ptp(p, axis=0))) / divisor
    if step <= 0:
        return False
    dominant = np.argmax(np.abs(n), axis=1)
    keys = [np.rint(p / step), dominant[:, None], np.sign(n[np.arange(len(n)), dominant])[:, None]]
    for key, values in attrs.items():
        if key.startswith('TEXCOORD_'):
            keys.append(np.rint(values * uv_divisor))
    _, first, inverse = np.unique(np.concatenate(keys, axis=1), axis=0, return_index=True, return_inverse=True)
    sizes = np.bincount(inverse)
    output = {}
    for key, values in attrs.items():
        out = np.zeros((len(first), values.shape[1]))
        np.add.at(out, inverse, values)
        out /= sizes[:, None]
        if key in ('NORMAL', 'TANGENT'):
            length = np.linalg.norm(out[:, :3], axis=1)
            zero = length < 1e-9
            out[zero, :3] = values[first[zero], :3]
            out[:, :3] /= np.maximum(np.linalg.norm(out[:, :3], axis=1)[:, None], 1e-9)
            if key == 'TANGENT':
                out[:, 3] = values[first, 3]
        output[key] = out
    indices = np.frombuffer(base64.b64decode(primitive['indices']['data']), '<u4').reshape(-1, 3)
    indices = inverse[indices]
    indices = indices[(indices[:, 0] != indices[:, 1]) & (indices[:, 1] != indices[:, 2]) & (indices[:, 0] != indices[:, 2])]
    vertices = output['POSITION']
    area = np.cross(vertices[indices[:, 1]] - vertices[indices[:, 0]], vertices[indices[:, 2]] - vertices[indices[:, 0]])
    indices = indices[np.linalg.norm(area, axis=1) > 1e-9]
    _, unique = np.unique(np.sort(indices, axis=1), axis=0, return_index=True)
    indices = indices[np.sort(unique)].astype('<u4')
    if not len(indices):
        return False
    primitive['attributes'] = {key: stream(value) for key, value in output.items()}
    primitive['indices'] = dict(encoding='uint32-le', count=int(indices.size), data=base64.b64encode(indices.tobytes()).decode())
    return True

def count(model):
    return sum(p['indices']['count'] // 3 for m in model['meshes'] for p in m['primitives'])

for root_id, original in list(records.items()):
    if original['type'] != 'model' or not root_id.startswith('rebuilt:Roof_'):
        continue
    model = json.loads((ROOT / 'client' / original['derivedPath']).read_text())
    if model.get('skeletons') or model.get('animations') or any(p.get('morphTargets') for m in model['meshes'] for p in m['primitives']):
        continue
    near_count = count(model)
    if near_count < 300:
        continue
    levels = [dict(level=0, asset=root_id, threshold=0, bounds=original['bounds'])]
    counts = [near_count]
    for number, divisor, uv_divisor in [(1, 28, 24), (2, 10, 12)]:
        child = copy.deepcopy(model)
        if not all(simplify(p, divisor, uv_divisor) for m in child['meshes'] for p in m['primitives']):
            continue
        triangles = count(child)
        if triangles >= counts[-1] * .92:
            continue
        child_id = root_id + '_LOD' + str(number)
        ids = {root_id: child_id}
        for mesh in model['meshes']:
            ids[mesh['id']] = mesh['id'].replace(root_id, child_id, 1)
            for primitive in mesh['primitives']:
                ids[primitive['id']] = primitive['id'].replace(root_id, child_id, 1)
        def remap(value):
            if isinstance(value, str):
                return ids.get(value, value)
            if isinstance(value, list):
                return [remap(v) for v in value]
            if isinstance(value, dict):
                return {k: remap(v) for k, v in value.items()}
            return value
        child = remap(child)
        data = (json.dumps(child, sort_keys=True, separators=(',', ':')) + '\n').encode()
        relative = 'assets/canonical/models/' + hashlib.sha256(data).hexdigest() + '.json'
        (ROOT / 'client' / relative).write_bytes(data)
        for old_id, new_id in ids.items():
            record = copy.deepcopy(original if old_id == root_id else records[old_id])
            record.update(id=new_id, derivedPath=relative)
            record['dependencies'] = [ids.get(v, v) for v in record.get('dependencies', [])]
            record['importSettings'] = {**record.get('importSettings', {}), 'derivation': 'vertex-cluster-lod-v1', 'sourceModel': root_id}
            record.pop('lods', None)
            records[new_id] = record
        levels.append(dict(level=len(levels), asset=child_id, threshold=55 if number == 1 else 125, bounds=original['bounds']))
        counts.append(triangles)
    original['lods'] = levels
    if len(levels) > 1:
        report.append(dict(model=root_id, triangles=counts, lods=levels))

registry['records'] = sorted(records.values(), key=lambda r: r['id'])
PATH.write_text(json.dumps(registry, sort_keys=True, separators=(',', ':')) + '\n')
(ROOT / 'client/assets/canonical/lods.json').write_text(json.dumps(dict(method='PBR material/UV/hard-edge-preserving clustering', models=report), indent=2) + '\n')
print('Canonical PBR LODs:', len(report), 'roofs;', sum(r['triangles'][0] for r in report), 'near triangles ->', sum(r['triangles'][-1] for r in report), 'far triangles')
