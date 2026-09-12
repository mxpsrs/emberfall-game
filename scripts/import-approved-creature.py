"""Import a reviewed native FBX rig export into Emberfall, preserving source actions.

python scripts/import-approved-creature.py CONFIG.json
The JSON points to export-rigged-fbx output and an explicitly selected texture.
Original downloads stay outside public game assets; only baked runtime data ships.
"""
from pathlib import Path
import base64
import hashlib
import importlib.util
import json
import sys
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('motion', ROOT/'scripts/import-authored-motion.py')
motion = importlib.util.module_from_spec(spec)
spec.loader.exec_module(motion)
DEST = ROOT/'dist/assets/realms'

def matrix(value):
    out = np.eye(4)
    out[:3] = np.asarray(value).reshape(3, 4)
    return out

def build(config):
    data = json.loads(Path(config['export']).read_text())
    world = json.loads((DEST/'models.js').read_text().split('=', 1)[1].rstrip(';\n'))
    atlas = Image.open(DEST/'atlas.png').convert('RGBA')
    slots = world.setdefault('approvedCreatureTextures', {})
    texture_path = Path(config['texture'])
    digest = hashlib.sha256(texture_path.read_bytes()).hexdigest()
    if digest not in slots:
        slot = max([0] + list(world['tiles'].values()) + list(slots.values())) + 1
        if slot >= 64: raise ValueError('The world atlas is full')
        art = Image.open(texture_path).convert('RGBA').resize((508,508), Image.Resampling.LANCZOS)
        tile = art.resize((512,512)); tile.paste(art, (2,2))
        atlas.paste(tile, (slot%8*512, slot//8*512)); slots[digest] = slot
    slot = slots[digest]
    world['tiles']['Approved_'+digest[:12]] = slot
    nodes = data['nodes']
    def depth(i): return 0 if nodes[i]['parent'] < 0 else 1 + depth(nodes[i]['parent'])
    order = sorted(range(len(nodes)), key=depth)
    node_index = {old:new for new,old in enumerate(order)}
    parents = [node_index.get(nodes[i]['parent'], -1) for i in order]
    deforms, binds, chunks = [], [], []
    for mesh in data['meshes']:
        vertices = np.asarray(mesh['vertices'], dtype=float)
        offset = len(deforms)
        for deform in mesh['deforms']:
            deforms.append(node_index[deform['node']]); binds.append(matrix(deform['bind']))
        vertices[:,9:13] += offset
        chunks.append(vertices)
    vertices = np.concatenate(chunks)
    # Index vertices by all skin/material attributes, keeping authored hard edges.
    vertices, inverse = np.unique(vertices, axis=0, return_inverse=True)
    if len(vertices) >= 65536 or len(nodes) >= 256 or len(deforms) > 80:
        raise ValueError('Model exceeds the current vertex or GPU skeleton budget')
    p, normal, uv = vertices[:,:3].copy(), vertices[:,3:6], vertices[:,6:8].copy()
    joints, weights = vertices[:,9:13].astype(int), vertices[:,13:17]
    weights /= np.maximum(weights.sum(axis=1, keepdims=True), 1e-9)
    rest = np.asarray([matrix(nodes[i]['rest']) for i in order])
    bind = np.asarray(binds)
    posed = np.zeros_like(p)
    for influence in range(4):
        for joint in np.unique(joints[:,influence]):
            ids = np.flatnonzero(joints[:,influence] == joint)
            m = rest[deforms[joint]] @ bind[joint]
            posed[ids] += (m @ np.c_[p[ids],np.ones(len(ids))].T).T[:,:3] * weights[ids,influence,None]
    lo, hi = posed.min(0), posed.max(0)
    center = np.array([(lo[0]+hi[0])/2, lo[1], (lo[2]+hi[2])/2])
    to_world = np.eye(4); to_world[:3,3] = center
    bind = bind @ to_world
    p -= center; lo -= center; hi -= center
    # FBX image coordinates use a bottom origin; the game atlas uses a top origin.
    uv[:,1] = 1 - uv[:,1]
    tex = np.asarray(atlas)
    u = (slot%8*512+2+(uv[:,0]%1)*508).astype(int)
    v = (slot//8*512+2+(uv[:,1]%1)*508).astype(int)
    fallback = tex[v,u,:3]/255
    packed = motion.packed
    mesh = {k:packed(val,kind) for k,val,kind in [
        ('p',p,'<f4'),('n',np.round(np.clip(normal,-1,1)*127),'i1'),
        ('uv',uv,'<f4'),('i',inverse,'<u2'),('t',np.full(len(p),20+slot),'u1'),
        ('c',np.full((len(p),3),255),'u1'),('f',np.round(fallback*255),'u1'),
        ('j',joints,'u1'),('w',np.round(weights*255),'u1')]}
    mesh['bounds'] = [lo.tolist(), hi.tolist()]
    native = {a['name']:a for a in data['animations']}
    clips = {}
    for target, entry in config['clips'].items():
        source = entry if isinstance(entry,str) else entry['source']
        if source not in native: raise ValueError('Missing source action '+source)
        animation = native[source]
        duration = animation['duration'] if isinstance(entry,str) else entry.get('duration',animation['duration'])
        frames = []
        for frame in animation['frames']:
            world_pose = np.asarray([matrix(frame[i]) for i in order])
            world_pose[:,:3,3] -= center
            local = []
            for i, parent in enumerate(parents):
                m = np.linalg.inv(world_pose[parent]) @ world_pose[i] if parent >= 0 else world_pose[i]
                scale = np.linalg.norm(m[:3,:3], axis=0)
                if np.linalg.det(m[:3,:3]) < 0: scale[0] *= -1
                q = motion.quaternion(m[:3,:3]/scale)
                if not np.allclose(motion.trs(m[:3,3],q,scale),m,atol=.003):
                    raise ValueError('Sheared joint requires baking: '+nodes[order[i]]['name'])
                local.append([*m[:3,3],*q,*scale])
            frames.append(local)
        clips[target] = {'source':source,'duration':duration,'frames':len(frames),'trs':packed(np.asarray(frames))}
    required = {'idle','walk','run','attack','death'}
    if not required <= clips.keys(): raise ValueError('Missing required motions '+str(required-clips.keys()))
    model = {'mesh':mesh,'rig':{'names':[nodes[i]['name'] for i in order],'parents':parents,'deforms':deforms,'bind':packed(bind[:,:3])},
             'joints':len(nodes),'clips':clips,'scale':config['height']/(hi[1]-lo[1]),'height':config['height'],
             'source':{**config['source'],'sha256':hashlib.sha256(Path(config['fbx']).read_bytes()).hexdigest(),'file':Path(config['fbx']).name,'nativeActions':list(native)}}
    target_path = DEST/'approved-creatures.js'
    result = json.loads(target_path.read_text().split('=',1)[1].rstrip(';\n')) if target_path.exists() else {}
    result[config['key']] = model
    target_path.write_text('const APPROVED_CREATURES='+json.dumps(result,separators=(',',':'))+';\n')
    (DEST/'models.js').write_text('const REALM_MODELS='+json.dumps(world,separators=(',',':'))+';\n')
    atlas.save(DEST/'atlas.png',optimize=True)
    audit = {k:v for k,v in model.items() if k not in ('mesh','rig','clips')}
    audit.update({'vertices':len(p),'triangles':len(inverse)//3,'deforms':len(deforms),'clips':{k:{field:value for field,value in clip.items() if field!='trs'} for k,clip in clips.items()}})
    (ROOT/'docs/boss-candidates'/(config['key']+'-import.json')).write_text(json.dumps(audit,indent=2)+'\n')
    print(config['key'],len(p),'vertices;',len(deforms),'skin joints;',len(native),'native actions;',list(clips))

if __name__ == '__main__': build(json.loads(Path(sys.argv[1]).read_text()))
