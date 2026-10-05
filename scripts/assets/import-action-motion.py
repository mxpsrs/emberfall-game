"""Fit licensed archer motion/props and CC0 casting/kneeling to the shipped rigs.

Usage: python scripts/assets/import-action-motion.py ACTION_SOURCE_DIR
The directory contains converted/ from export-fbx-motion.c, archer/ and ual/.
Only the selected game-ready geometry and local skeletal motion are emitted.
"""
import base64, hashlib, importlib.util, json, math, pathlib, sys, types
import numpy as np
from PIL import Image

ROOT=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('motion',ROOT/'scripts/assets/import-authored-motion.py')
motion=importlib.util.module_from_spec(spec);spec.loader.exec_module(motion)

def matrix(values):
    return np.vstack([np.asarray(values).reshape(3,4),[0,0,0,1]])

def rotation(m):
    return m[:3,:3]/np.linalg.norm(m[:3,:3],axis=0)

def blend(a,b,t):
    b=b.copy();b[:,3:7]*=np.where((a[:,3:7]*b[:,3:7]).sum(1)<0,-1,1)[:,None]
    out=a*(1-t)+b*t;out[:,3:7]/=np.linalg.norm(out[:,3:7],axis=1)[:,None];return out

def smooth(t):
    t=np.clip(t,0,1);return t*t*(3-2*t)

def target_from_avatar(a):
    names=a['rig']['names'];parents=a['rig']['parents']
    bind=np.frombuffer(base64.b64decode(a['rig']['bind']),'<f4').reshape(-1,3,4)
    rest={i:np.linalg.inv(matrix(v)) for i,v in enumerate(bind)}
    return types.SimpleNamespace(nodes=[{'name':n} for n in names],names={n:i for i,n in enumerate(names)},
        parent={i:p for i,p in enumerate(parents) if p>=0},rest=rest,g={'skins':[{'joints':list(range(len(names)))}]})

ALIASES={'root':'B-root','pelvis':'B-hips','spine_01':'B-spine','spine_02':'B-spine','spine_03':'B-chest','neck_01':'B-neck','Head':'B-head'}
for side in ['l','r']:
    for target,source in [('clavicle','shoulder'),('upperarm','upperArm'),('lowerarm','forearm'),('hand','hand'),('thigh','thigh'),('calf','shin'),('foot','foot'),('ball','toe')]:
        ALIASES[target+'_'+side]='B-'+source+'.'+side.upper()
    for finger,source in [('index','indexFinger'),('middle','middleFinger'),('ring','ringFinger'),('pinky','pinky'),('thumb','thumb')]:
        for i in range(1,4):ALIASES[finger+'_'+str(i).zfill(2)+'_'+side]='B-'+source+str(i).zfill(2)+'.'+side.upper()

def fbx_poses(path,target):
    data=json.loads(path.read_text());names={n['name']:i for i,n in enumerate(data['nodes'])}
    rest=[matrix(n['rest']) for n in data['nodes']];inverse=[rotation(m).T for m in rest]
    parents=[target.parent.get(i,-1) for i in range(len(target.nodes))]
    local=[np.linalg.inv(target.rest[p])@target.rest[i] if p>=0 else target.rest[i] for i,p in enumerate(parents)]
    scale=target.rest[target.names['pelvis']][1,3]/rest[names['B-hips']][1,3]
    result=[]
    for frame in data['animations'][0]['frames']:
        src=[matrix(m) for m in frame];world=[]
        for i,node in enumerate(target.nodes):
            p=parents[i];m=world[p]@local[i] if p>=0 else local[i].copy();alias=ALIASES.get(node['name'])
            if alias in names:
                j=names[alias];m[:3,:3]=rotation(src[j])@inverse[j]@target.rest[i][:3,:3]
                if node['name']=='pelvis':m[:3,3]+=(src[j][:3,3]-rest[j][:3,3])*scale
            world.append(m)
        values=[]
        for i,p in enumerate(parents):
            m=np.linalg.inv(world[p])@world[i] if p>=0 else world[i];sc=np.linalg.norm(m[:3,:3],axis=0)
            values.append([*m[:3,3],*motion.quaternion(m[:3,:3]/sc),*sc])
        result.append(values)
    return np.asarray(result),data

def sample(frames,phase):
    f=np.clip(phase,0,1)*(len(frames)-1);i=int(f);return blend(frames[i],frames[min(i+1,len(frames)-1)],f-i)

def planted(a,poses,whole=False):
    raw=a['mesh'];p=np.frombuffer(base64.b64decode(raw['p']),'<f4').reshape(-1,3)
    ids=np.arange(len(p)) if whole else np.flatnonzero(p[:,1]<.25);p=np.c_[p[ids],np.ones(len(ids))]
    w=np.frombuffer(base64.b64decode(raw['w']),'u1').reshape(-1,4)[ids].astype(float);w/=w.sum(1)[:,None]
    joints=np.frombuffer(base64.b64decode(raw['j']),'u1').reshape(-1,4)[ids]
    bind=np.array([matrix(m) for m in np.frombuffer(base64.b64decode(a['rig']['bind']),'<f4').reshape(-1,12)])
    for frame in poses:
        world=[]
        for i,v in enumerate(frame):
            m=motion.trs(v[:3],v[3:7],v[7:]);parent=a['rig']['parents'][i];world.append(world[parent]@m if parent>=0 else m)
        skin=np.asarray(world)@bind;foot=np.einsum('nwab,nb->nwa',skin[joints],p)
        low=(foot[:,:,1]*w).sum(1).min();frame[0,1]+=max(0,.003-low)
    return poses

def build(root):
    dest=ROOT/'client/assets/realms/models.js';out=json.loads(dest.read_text().removeprefix('const REALM_MODELS=').strip().removesuffix(';'))
    ual_path=next((root/'ual').rglob('UAL1_Standard.glb'));ual=motion.Gltf(ual_path)
    for sex,a in out['avatars'].items():
        target=target_from_avatar(a);retarget=motion.Retarget(ual,target);prefix='Human'+('M' if sex=='male' else 'F')
        sources={part:fbx_poses(root/'converted'/(prefix+'@'+name+'.json'),target) for part,name in [('idle','BowIdle01'),('load','BowShot01 - Load'),('hold','BowShot01 - Hold'),('release','BowShot01 - Release')]}
        sample_ual=lambda name,age:np.asarray(retarget.local_trs(retarget.pose(name,age)))
        idle=sample_ual('Idle_Loop',0);grip=sample_ual('Sword_Idle',0)
        a['clips'].setdefault('fishing',a['clips']['ranged'])
        def shot(t):
            if t<.75:return sample(sources['load'][0],t/.75)
            if t<.9:return sample(sources['hold'][0],(t-.75)/1.333)
            return sample(sources['release'][0],(t-.9)/.7)
        def staff_grip(v):
            v=v.copy()
            for j,name in enumerate(a['rig']['names']):
                if name.endswith('_r') and name.startswith(('index_','middle_','ring_','pinky_','thumb_')):v[j]=grip[j]
            world=[]
            for j,value in enumerate(v):
                m=motion.trs(value[:3],value[3:7],value[7:]);parent=a['rig']['parents'][j];world.append(world[parent]@m if parent>=0 else m)
            hand=target.names['hand_r'];parent=a['rig']['parents'][hand]
            # Curl the fingers around the existing palm socket, then hold the
            # staff upright while the free hand performs the authored spell.
            hand_rotation=np.linalg.inv(rotation(matrix(a['rig']['rightGrip'])))
            v[hand,3:7]=motion.quaternion(rotation(world[parent]).T@hand_rotation)
            return v
        def cast(t):
            if t<.45:v=sample_ual('Spell_Simple_Enter',ual.duration('Spell_Simple_Enter')*t/.45)
            elif t<.9:v=sample_ual('Spell_Simple_Shoot',ual.duration('Spell_Simple_Shoot')*(t-.45)/.45)
            else:v=sample_ual('Spell_Simple_Exit',ual.duration('Spell_Simple_Exit')*(t-.9)/.4)
            return staff_grip(v)
        def bury(t):
            kneel=sample_ual('Fixing_Kneeling',1.0+min(1.7,t)*.72)
            return blend(idle,kneel,smooth(t/.45)*smooth((1.8-t)/.4))
        for name,duration,fn,source in [('ranged',1.6,shot,prefix+'@BowShot01 - Load / Hold / Release'),('bowIdle',1.333,lambda t:sample(sources['idle'][0],t/1.333),prefix+'@BowIdle01'),('magic',1.3,cast,'Spell_Simple_Enter / Shoot / Exit'),('staffIdle',2.5,lambda t:staff_grip(sample_ual('Idle_Loop',t)),'Idle_Loop / fitted staff grip'),('bury',1.8,bury,'Fixing_Kneeling / Idle_Loop')]:
            count=math.ceil(duration*30)+1;poses=planted(a,np.array([fn(duration*i/(count-1)) for i in range(count)]),name=='bury')
            a['clips'][name]={'duration':duration,'frames':count,'trs':motion.packed(poses),'source':source}
            if name in ['ranged','magic']:a['clips'][name]['releaseAt']=.94 if name=='ranged' else .66
        # Place the imported bow at the actual left palm, with the authored
        # prop orientation. Palm offsets come from this character's own rig.
        data=sources['hold'][1];src=next(n for n in data['nodes'] if n['name']=='B-handProp.L');left=target.rest[target.names['hand_l']]
        hold=matrix(a['rig']['leftGrip']);hold[:3,:3]=rotation(left).T@rotation(matrix(src['rest']))
        a['rig']['bowBind']=(left@hold)[:3].reshape(-1).tolist()
        print('Imported',sex,'bow, cast and burial clips',flush=True)
    palette=np.asarray(Image.open(root/'archer/Textures/HumanAnimations_ColorPalette.png').convert('RGB'))
    for source,name in [('Bow','Archer_Bow'),('Quiver','Archer_Quiver'),('Arrow','Archer_Arrow'),('BycocketHat','Ranger_Cap')]:
        data=json.loads((root/'converted'/('HumanArcher_'+source+'.json')).read_text());verts=np.concatenate([m['vertices'] for m in data['meshes']]);uv=verts[:,6:8]
        colors=palette[np.clip(((1-uv[:,1])*palette.shape[0]).astype(int),0,palette.shape[0]-1),np.clip((uv[:,0]*palette.shape[1]).astype(int),0,palette.shape[1]-1)]
        # All props use the supplied palette, baked into the existing renderer.
        out['models'][name]={'p':motion.packed(verts[:,:3]),'n':motion.packed(np.clip(verts[:,3:6]*127,-127,127).round(),'<i1'),'c':motion.packed(colors,'u1'),'i':motion.packed(np.arange(len(verts)),'<u2'),'bounds':[verts[:,:3].min(0).tolist(),verts[:,:3].max(0).tolist()]}
    dest.write_text('const REALM_MODELS='+json.dumps(out,separators=(',',':'))+';\n')
    provenance={'archer':{'author':'Kevin Iglesias','pack':'Human Archer Animations 2.0 FREE','source':'https://kevdev.itch.io/human-archer-animations-free','license':'Standard Asset Store EULA; commercial game use allowed; standalone asset resale prohibited','sha256':hashlib.sha256((root/'archer.zip').read_bytes()).hexdigest()},'castingAndBurial':{'author':'Quaternius','pack':'Universal Animation Library Standard','license':'CC0 1.0','source':'https://quaternius.itch.io/universal-animation-library','sha256':hashlib.sha256(ual_path.read_bytes()).hexdigest()}}
    (ROOT/'client/assets/realms/action-motion-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')

if __name__=='__main__':build(pathlib.Path(sys.argv[1]))
