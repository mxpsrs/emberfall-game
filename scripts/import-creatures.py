"""Import replacement Quaternius creature meshes and their authored motion.

python scripts/import-creatures.py .asset-cache/quaternius
Native animal rigs keep their own animation. Bestiary monsters use UAL/UAL2,
retargeted to their actual anatomy. Only baked game data is distributed.
"""
import base64
import hashlib
import importlib.util
import io
import json
import math
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('motion', ROOT/'scripts/import-authored-motion.py')
motion = importlib.util.module_from_spec(spec)
spec.loader.exec_module(motion)
Gltf, packed, quaternion, trs = motion.Gltf, motion.packed, motion.quaternion, motion.trs


def build(cache):
    dest = ROOT/'dist/assets/realms'
    world = json.loads((dest/'models.js').read_text().split('=', 1)[1].rstrip(';\n'))
    atlas = Image.open(dest/'atlas.png').convert('RGBA')
    slots = world.setdefault('creatureTextures', {})
    lib1 = Gltf(next(cache.rglob('UAL1_Standard.glb')))
    lib2 = Gltf(next(cache.rglob('UAL2_Standard.glb')))
    result = {}

    def image_bytes(g, index):
        im = g.g['images'][index]
        if 'bufferView' in im:
            v = g.g['bufferViews'][im['bufferView']]
            return g.buffers[v['buffer']][v.get('byteOffset', 0):v.get('byteOffset', 0)+v['byteLength']]
        uri = im['uri']
        return base64.b64decode(uri.split(',')[1]) if uri.startswith('data:') else (g.path.parent/uri).read_bytes()

    def material(g, primitive):
        mat = g.g.get('materials', [{}])[primitive.get('material', 0)].get('pbrMetallicRoughness', {})
        # glTF constants are linear; the game's palette/atlas are display RGB.
        linear = np.asarray(mat.get('baseColorFactor', [1, 1, 1, 1])[:3])
        factor = np.where(linear <= .0031308, linear*12.92, 1.055*linear**(1/2.4)-.055)
        slot = 0
        if 'baseColorTexture' in mat:
            data = image_bytes(g, g.g['textures'][mat['baseColorTexture']['index']]['source'])
            digest = hashlib.sha256(data).hexdigest()
            if digest not in slots:
                slot = max([0]+list(world['tiles'].values())+list(slots.values()))+1
                assert slot < 64
                im = Image.open(io.BytesIO(data)).convert('RGBA').resize((508, 508), Image.Resampling.LANCZOS)
                tile = im.resize((512, 512)); tile.paste(im, (2, 2))
                atlas.paste(tile, (slot%8*512, slot//8*512)); slots[digest] = slot
            slot = slots[digest]
            world['tiles']['Creature_'+digest[:10]] = slot
        return slot, factor

    sources = [
        ('goblin', next(cache.rglob('Puglin.glb')), 1.48, 'bestiary'),
        ('king', next(cache.rglob('Imp.glb')), 2.45, 'bestiary'),
        ('wolf', cache/'animated-creatures/Wolf.glb', 1.18, 'native'),
        ('rat', cache/'animated-creatures/Rat.glb', .50, 'native'),
        ('skeleton', cache/'animated-creatures/Skeleton2.glb', 1.92, 'native'),
        ('slime', cache/'animated-creatures/Slime.glb', .66, 'native'),
    ]
    for kind, path, height, source_type in sources:
        g = Gltf(path)
        # Include rigid attachments as bones too: an authored dagger must follow
        # its hand, not remain in the original model's T-pose location.
        depth = lambda n: 1+depth(g.parent[n]) if n in g.parent else 0
        nodes = sorted(range(len(g.nodes)), key=depth)
        order = {node:i for i,node in enumerate(nodes)}
        parents = [order.get(g.parent.get(node), -1) for node in nodes]
        deforms=[]; binds=[]; rest_positions=[]; skin_offsets={}
        parts = {k:[] for k in ['p','n','uv','i','t','c','f','j','w']}
        offset = 0
        for node, n in enumerate(g.nodes):
            if 'mesh' not in n:
                continue
            for pr in g.g['meshes'][n['mesh']]['primitives']:
                attr = pr['attributes']; p = g.acc(attr['POSITION']); normal = g.acc(attr['NORMAL'])
                if 'skin' in n:
                    skin = g.g['skins'][n['skin']]
                    ibm = g.acc(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
                    if n['skin'] not in skin_offsets:
                        skin_offsets[n['skin']]=len(deforms)
                        deforms.extend(order[j] for j in skin['joints']);binds.extend(ibm)
                    start=skin_offsets[n['skin']]
                    joints = g.acc(attr['JOINTS_0']).astype(int)+start
                    weights = g.acc(attr['WEIGHTS_0']).astype(float)
                    weights /= np.maximum(1e-8, weights.sum(axis=1)[:,None])
                else:
                    joints = np.full((len(p),4),len(deforms)); weights = np.tile([1,0,0,0], (len(p),1))
                    deforms.append(order[node]);binds.append(np.eye(4))
                rest_p=np.zeros_like(p,dtype=float)
                for influence in range(4):
                    for joint in np.unique(joints[:,influence]):
                        ids=np.flatnonzero(joints[:,influence]==joint)
                        matrix=g.rest[nodes[deforms[joint]]]@binds[joint]
                        rest_p[ids]+=(matrix@np.c_[p[ids],np.ones(len(ids))].T).T[:,:3]*weights[ids,influence,None]
                rest_positions.append(rest_p)
                uv = g.acc(attr['TEXCOORD_0']) if 'TEXCOORD_0' in attr else np.zeros((len(p),2))
                slot, factor = material(g, pr)
                u = (slot%8*512+2+(uv[:,0]%1)*508).astype(int)
                v = (slot//8*512+2+(uv[:,1]%1)*508).astype(int)
                data = dict(p=p,n=normal,uv=uv,i=g.acc(pr['indices']).ravel()+offset,
                            t=np.full(len(p),20+slot),c=np.tile(factor,(len(p),1)),
                            f=np.asarray(atlas)[v,u,:3]/255*factor,j=joints,w=weights)
                for key,value in data.items(): parts[key].append(value)
                offset += len(p)
        data = {k:np.concatenate(v) for k,v in parts.items()}
        # The animal exports split vertices on every face. Join their lighting
        # normals across gentle contours while retaining sharp ears and claws.
        if kind in ('wolf','rat','slime'):
            buckets={}
            for i,p in enumerate(data['p']):
                buckets.setdefault((*np.round(p,5),int(data['t'][i]),*np.round(data['c'][i],3)),[]).append(i)
            smooth=data['n'].copy()
            for indices in buckets.values():
                normals=data['n'][indices]
                for i in indices:
                    adjacent=normals[normals@data['n'][i]>.45]
                    normal=adjacent.sum(0);length=np.linalg.norm(normal)
                    if length>1e-7: smooth[i]=normal/length
            data['n']=smooth
        assert offset < 65536 and len(nodes) < 256 and len(deforms)<256
        rest_p=np.concatenate(rest_positions);lo,hi=rest_p.min(0),rest_p.max(0)
        scale = height/(hi[1]-lo[1])
        mesh = {k:packed(data[k],dt) for k,dt in [('p','<f4'),('uv','<f4'),('i','<u2'),('t','u1'),('j','u1')]}
        mesh['n'] = packed(np.round(np.clip(data['n'],-1,1)*127),'i1')
        for k in ['c','f','w']: mesh[k] = packed(np.round(np.clip(data[k],0,1)*255),'u1')
        mesh['bounds'] = [lo.tolist(),hi.tolist()]
        rig = {'names':[g.nodes[i].get('name',str(i)) for i in nodes], 'parents':parents, 'deforms':deforms, 'bind':packed(np.asarray(binds)[:,:3])}
        clips = {}
        if source_type == 'bestiary':
            r1, r2 = motion.Retarget(lib1,g), motion.Retarget(lib2,g)
            original = {
                'idle':(r1,'Sword_Idle',1.67), 'walk':(r1,'Walk_Loop',1.1),
                'run':(r1,'Jog_Fwd_Loop',.74), 'attack':(r2,'Sword_Regular_A',1.05),
                'hit':(r1,'Hit_Chest',.33), 'death':(r1,'Death01',1.45),
            }
        else:
            def find(word):
                # Some FBX conversions repeat an armature prefix in clip names.
                return next(a for a in g.animations if a==word or ('|'+word+'|') in a or a.endswith('|'+word) or a.endswith('_'+word))
            if kind=='wolf': names={'idle':'Idle_2_HeadLow','walk':'Walk','run':'Gallop','attack':'Attack','hit':'Idle_HitReact_Left','death':'Death'}
            elif kind=='skeleton': names={'idle':'Idle','walk':'Walk','run':'Run','attack':'Sword','hit':'HitReact','death':'Death'}
            else: names={'idle':'Idle','walk':'Walk','run':'Run','attack':'Attack','hit':'HitRecieve','death':'Death'}
            original={}
            for key,name in names.items():
                try: clip=find(name)
                except StopIteration:
                    if key=='run': clip=find('Walk')
                    elif key=='hit':
                        try: clip=find('Hit')
                        except StopIteration: continue
                    else: raise
                duration=float(g.duration(clip))
                original[key]=(None,clip,.9 if key=='attack' else duration)
        for key,(retarget,clip,duration) in original.items():
            fps=24; count=math.ceil(duration*fps)+1; frames=[]
            provider=retarget.source if retarget else g
            for frame in range(count):
                age=frame/(count-1)*provider.duration(clip)
                if retarget and key=='attack':
                    # Attack and recovery are separate source actions. Preserve
                    # their joined endpoints; contact occurs near the .30s hit.
                    play=frame/(count-1)*duration
                    action='Sword_Regular_A' if play<.6 else 'Sword_Regular_A_Rec'
                    age=(play/.6 if play<.6 else (play-.6)/.45)*provider.duration(action)
                    pose=retarget.pose(action,age)
                else: pose=retarget.pose(clip,age) if retarget else g.pose(clip,age)
                local=[]
                for node,parent in zip(nodes,parents):
                    mat=np.linalg.inv(pose[nodes[parent]])@pose[node] if parent>=0 else pose[node].copy()
                    sc=np.linalg.norm(mat[:3,:3],axis=0); q=quaternion(mat[:3,:3]/sc)
                    assert np.max(abs(trs(mat[:3,3],q,sc)-mat)) < .005
                    local.append([*mat[:3,3],*q,*sc])
                if kind=='skeleton':
                    # Fit this new mesh to the established adult proportions.
                    # Scale the skull about its neck, including eyes and jaw.
                    for i,node in enumerate(nodes):
                        if g.nodes[node].get('name')=='Head': local[i][7:10]=(np.asarray(local[i][7:10])*.64).tolist()
                frames.append(local)
            clips[key]={'source':clip+(' + Sword_Regular_A_Rec' if retarget and key=='attack' else ''),'library':provider.path.name,'duration':duration,'frames':count,'trs':packed(np.asarray(frames))}
        result[kind]={'mesh':mesh,'rig':rig,'joints':len(nodes),'clips':clips,'scale':scale,'height':height,
                      'source':{'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'author':'Quaternius',
                                'license':'QAL 1.0' if source_type=='bestiary' else 'CC0 1.0'}}
        print(kind,offset,'vertices;',len(nodes),'bones;',list(clips),flush=True)
    (dest/'monsters.js').write_text('const REALM_CREATURES='+json.dumps(result,separators=(',',':'))+';\n')
    (dest/'models.js').write_text('const REALM_MODELS='+json.dumps(world,separators=(',',':'))+';\n')
    atlas.save(dest/'atlas.png', optimize=True)
    (dest/'BESTIARY-LICENSE.txt').write_text(next((cache/'bestiary-dungeon-monsters-kit').rglob('License_Standard.txt')).read_text())


if __name__=='__main__': build(pathlib.Path(sys.argv[1]))
