"""Fit CH0SAN's modular meshes to Veldren's existing male/female animation rigs.

python scripts/import-modular-armor.py /path/to/ModularWarior1.glb
The source is obtained from https://ch0san.itch.io/modular-warrior.
Only selected, fitted game meshes are shipped; the 30 MB source is not a startup asset.
"""
import base64
import hashlib
import importlib.util
import io
import json
import pathlib
import re
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy.interpolate import RBFInterpolator

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('motion', ROOT/'scripts/import-authored-motion.py')
motion = importlib.util.module_from_spec(spec)
spec.loader.exec_module(motion)


def unpack(s, dtype='<f4'):
    return np.frombuffer(base64.b64decode(s), dtype=dtype)


def build(path):
    g = motion.Gltf(path)
    dest = ROOT/'dist/assets/realms/models.js'
    world = json.loads(dest.read_text().split('=', 1)[1].rstrip(';\n'))
    skin = g.g['skins'][0]
    bind = g.acc(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    rest = np.linalg.inv(bind)
    names = [g.nodes[n]['name'] for n in skin['joints']]
    # Sample the author's pixel palette at the exact source UV. This avoids
    # filtering adjacent palette cells into pink/green seams and needs no atlas tile.
    image = g.g['images'][g.g['textures'][1]['source']]
    view = g.g['bufferViews'][image['bufferView']]
    raw = g.buffers[view['buffer']][view.get('byteOffset', 0):view.get('byteOffset', 0)+view['byteLength']]
    palette = np.asarray(Image.open(io.BytesIO(raw)).convert('RGB'))
    parts = [f'{part}.{kind}.001' for kind in ['B','I','G','M','DS']
             for part in ['Headgear','Shoulder','Chestplate','Gauntlets','Legguards','Boots','Belt']]
    parts += [f'HeadAttach.{i:03}' for i in range(1,6)] + ['BeltAttch.001','BeltAttch.002']
    parts += ['Default_Male_'+p+'_Medium' for p in ['Head','Arms','Feet','Legs','Torso']]
    parts += ['Male_Shirt.002','Male_Pants.002','Beard.007','Hair.007']
    # Weapons retain the source mesh, with a new handle-centered socket transform.
    rigid = [k+'_Sword' for k in ['B','I','G','M','DS']] + ['B_Shield','I_Shield','G__Shield','M_Shield','DS_Shield']
    result = {}
    joint_map = {}
    for sex, avatar in world['avatars'].items():
        target_names = avatar['rig']['names']
        tb = unpack(avatar['rig']['bind']).reshape(-1,3,4)
        tr = np.linalg.inv(np.concatenate([tb, np.tile([[[0,0,0,1]]],(len(tb),1,1))],axis=1))
        target = dict(zip(target_names, tr[:,:3,3]))
        basic = {'DEF-spine':'pelvis','DEF-pelvis.L':'pelvis','DEF-pelvis.R':'pelvis',
                 'DEF-spine.001':'spine_01','DEF-spine.002':'spine_02','DEF-spine.003':'spine_03',
                 'DEF-spine.004':'neck_01','DEF-spine.005':'Head','DEF-spine.006':'Head','Head_Attach':'Head',
                 'DEF-breast.L':'spine_03','DEF-breast.R':'spine_03'}
        def mapped(name):
            if name in basic:return basic[name]
            side = 'l' if '.L' in name else 'r'
            for src,dst in [('DEF-shoulder.','clavicle'),('DEF-upper_arm.','upperarm'),('DEF-forearm.','lowerarm'),
                            ('DEF-hand.','hand'),('DEF-thigh.','thigh'),('DEF-shin.','calf'),('DEF-foot.','foot'),('DEF-toe.','ball')]:
                if name.startswith(src):return dst+'_'+side
            match = re.match(r'DEF-(?:f_)?(index|middle|ring|pinky|thumb)\.(\d\d)',name)
            if match:return match[1]+'_'+match[2]+'_'+side
            if name.startswith('DEF-palm') or name.startswith('Weapon_Socket'):return 'hand_'+side
            return 'pelvis' if 'Hip' in name else 'spine_03'
        mapping = np.array([target_names.index(mapped(name)) for name in names])
        # Fit proportions in bind space, including every finger. A smooth warp
        # keeps neighboring plate vertices together while matching bone anchors.
        src_points, dst_points = [], []
        for i,name in enumerate(names):
            if name in ['DEF-pelvis.L','DEF-pelvis.R','DEF-spine.005','Head_Attach'] or any(s in name for s in ['Socket','breast','palm']):continue
            pos = target[mapped(name)].copy()
            if name.endswith('.001') and any(k in name for k in ['upper_arm','forearm','thigh','shin']):
                end = {'upperarm':'lowerarm','lowerarm':'hand','thigh':'calf','calf':'foot'}[mapped(name).rsplit('_',1)[0]]+'_'+mapped(name)[-1]
                pos = (pos+target[end])*.5
            src_points.append(rest[i,:3,3]);dst_points.append(pos)
        height = unpack(avatar['mesh']['p']).reshape(-1,3)[:,1].max()
        src_points += [[0,2.004,.03],[0,0,0]]
        dst_points += [[0,float(height),.015],[0,0,0]]
        src_points, dst_points = np.asarray(src_points),np.asarray(dst_points)
        warp = RBFInterpolator(src_points,dst_points-src_points,kernel='thin_plate_spline',smoothing=0.00002)
        def fit(p):return p+warp(p)
        fitted = {}
        for name in parts+rigid:
            node = g.nodes[g.names[name]];pr=g.g['meshes'][node['mesh']]['primitives'][0];attr=pr['attributes']
            p=g.acc(attr['POSITION']).astype(float);normal=g.acc(attr['NORMAL']).astype(float)
            uv=g.acc(attr['TEXCOORD_0']);indices=g.acc(pr['indices']).ravel().astype(int)
            color=palette[np.clip((uv[:,1]*palette.shape[0]).astype(int),0,palette.shape[0]-1),np.clip((uv[:,0]*palette.shape[1]).astype(int),0,palette.shape[1]-1)]/255
            if name in rigid:
                # Original author socket is in bind space; carry its orientation
                # into the game's Y-axis blade / Z-axis shield conventions.
                left='Shield' in name
                socket=g.rest[g.names['Weapon_Socket.'+('L' if left else 'R')]]
                mesh_world=g.rest[g.names[name]]
                p=(mesh_world@np.c_[p,np.ones(len(p))].T).T[:,:3]
                normal=(mesh_world[:3,:3]@normal.T).T
                # All variants share a grip position; derive it from the socket.
                center=socket[:3,3]
                if left:
                    p=(p-center)*.63
                    # Socket-local axes are shared with Veldren's palm frame.
                    p=p@np.linalg.inv(socket[:3,:3]).T
                    normal=normal@np.linalg.inv(socket[:3,:3]).T
                    p=p[:,[0,2,1]]*[1,-1,1]
                    normal=normal[:,[0,2,1]]*[1,-1,1]
                else:
                    p=(p-center)*.62
                    # In source bind space the blade extends along +Z, the hilt
                    # lies along X. Rotate it onto the existing palm's +Y axis.
                    p=p[:,[0,2,1]]*[-1,1,1]
                    normal=normal[:,[0,2,1]]*[-1,1,1]
                joints=np.zeros((len(p),4),int);weights=np.tile([1,0,0,0],(len(p),1))
            else:
                original=p.copy();p=fit(p)
                # Transform normals using the inverse transpose of the local
                # fitting Jacobian; preserve the author's deliberate hard edges.
                eps=.0001
                jac=np.stack([(fit(original+np.eye(3)[a]*eps)-p)/eps for a in range(3)],axis=2)
                normal=np.einsum('nij,nj->ni',np.linalg.inv(jac).transpose(0,2,1),normal)
                if name.startswith(('Headgear.','HeadAttach.')):
                    # Match the receiving head's depth as well as bone length.
                    # Bone landmarks alone squeeze a helmet's back into the skull.
                    helmet_fit=np.array([1.14,1,1.40]);p*=helmet_fit;normal/=helmet_fit
                joints=mapping[g.acc(attr['JOINTS_0']).astype(int)]
                weights=g.acc(attr['WEIGHTS_0']).astype(float);weights/=weights.sum(1)[:,None]
                # Merge twist/palm influences mapped onto a single target bone.
                for v in range(len(p)):
                    merged={}
                    for j,w in zip(joints[v],weights[v]):merged[j]=merged.get(j,0)+w
                    terms=sorted(merged.items(),key=lambda x:-x[1]);joints[v]=0;weights[v]=0
                    for k,(j,w) in enumerate(terms):joints[v,k]=j;weights[v,k]=w
            normal/=np.maximum(1e-8,np.linalg.norm(normal,axis=1)[:,None])
            data={'p':p,'n':np.rint(np.clip(normal,-1,1)*127),'uv':np.zeros((len(p),2)),
                  'c':np.rint(color*255),'f':np.rint(color*255),'t':np.full(len(p),20),
                  'j':joints,'w':np.rint(weights*255),'i':indices}
            # 0.1 mm bind-space positions are sufficient at game scale. These
            # meshes use solid palette colors, so omit redundant UV/atlas/fallback arrays.
            mesh={k:motion.packed(data[k],dt) for k,dt in [('n','i1'),('c','u1'),('j','u1'),('w','u1'),('i','<u2')]}
            assert abs(p).max()<3.27
            mesh['p']=motion.packed(np.rint(p*10000),'<i2');mesh['pScale']=.0001
            mesh['bounds']=[p.min(0).tolist(),p.max(0).tolist()]
            fitted[name]=mesh
        result[sex]=fitted
        joint_map[sex]={name:target_names[mapping[i]] for i,name in enumerate(names)}
        print(sex,len(fitted),'parts',sum(len(unpack(m['p'],'<i2'))//3 for m in fitted.values()),'vertices',flush=True)
    world['armor']=result
    # Inventory icons are rendered once from the fitted meshes, at import time.
    icon_names=[n for n in parts+rigid if not n.startswith(('Default_','Male_','Beard','Hair'))]+['PermanentToolBelt']
    sheet=Image.new('RGBA',(1024,128*((len(icon_names)+7)//8)))
    yaw=-.4;right=np.array([np.cos(yaw),0,-np.sin(yaw)]);up=np.array([np.sin(yaw)*-.28,.96,np.cos(yaw)*-.28]);depth=np.cross(right,up)
    light=np.array([-.35,.75,.6]);light/=np.linalg.norm(light)
    for number,name in enumerate(icon_names):
        meshes=[result['male'][s] for s in (['Belt.B.001','BeltAttch.001'] if name=='PermanentToolBelt' else [name])]
        p=np.concatenate([unpack(m['p'],'<i2').reshape(-1,3)*m['pScale'] for m in meshes]);n=np.concatenate([unpack(m['n'],'i1').reshape(-1,3)/127 for m in meshes]);color=np.concatenate([unpack(m['c'],'u1').reshape(-1,3) for m in meshes]);indices=[];offset=0
        for m in meshes:indices.extend(unpack(m['i'],'<u2')+offset);offset+=len(unpack(m['p'],'<i2'))//3
        if name.endswith('_Shield'):p=p[:,[1,2,0]];n=n[:,[1,2,0]]
        if name.startswith('Gauntlets.'):
            side=np.sign(p[:,0]);p=np.c_[side*.14+p[:,2]+.06,abs(p[:,0])-.52,p[:,1]-1.45];n=np.c_[n[:,2],n[:,0]*side,n[:,1]]
        xy=np.c_[p@right,-p@up];extent=np.ptp(xy,axis=0);scale=222/max(extent)
        xy=(xy-(xy.min(0)+xy.max(0))*.5)*scale+128
        canvas=Image.new('RGBA',(256,256));draw=ImageDraw.Draw(canvas)
        triangles=np.asarray(indices).reshape(-1,3);order=np.argsort((p[triangles]@depth).mean(1))
        for t in triangles[order]:
            shade=.60+.40*max(0,float((n[t].mean(0))@light));rgb=tuple(np.clip(color[t].mean(0)*shade,0,255).astype(int))+(255,)
            draw.polygon([tuple(v) for v in xy[t]],fill=rgb)
        sheet.paste(canvas.resize((128,128),Image.Resampling.LANCZOS),(number%8*128,number//8*128))
    sheet.save(ROOT/'dist/assets/realms/armor-icons.png',optimize=True)
    world['armorIcons']={name:i for i,name in enumerate(icon_names)}
    dest.write_text('const REALM_MODELS='+json.dumps(world,separators=(',',':'))+';\n')
    manifest={'author':'CH0SAN','pack':'Modular Warrior','url':'https://ch0san.itch.io/modular-warrior',
              'source':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
              'permission':'Author explicitly permits free commercial use in the product page comments. No bundled license text in GLB/Unity documentation.',
              'animations':'No animations in GLB. Uses existing retargeted Quaternius UAL character clips.',
              'parts':parts+rigid,'jointMap':joint_map,
              'names':'Source uses B/I/G/M/DS. Iron and Dragonslayer are named in author-page comments; Bronze, Gold and Mithril are Veldren display names for the other material families.'}
    (ROOT/'dist/assets/realms/CH0SAN-provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')


if __name__=='__main__':build(pathlib.Path(sys.argv[1]))
