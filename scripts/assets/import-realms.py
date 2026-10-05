"""Convert the CC0 Quaternius standard packs into textured runtime meshes.
Input: extracted Medieval Village MegaKit, Universal Base Characters,
Universal Animation Library Standard, Stylized Nature MegaKit, and Fantasy Props MegaKit folders.
Original downloads: quaternius.itch.io.
"""
import pathlib,sys,json,base64,hashlib,math,subprocess
import numpy as np
from PIL import Image

ROOT=pathlib.Path(__file__).resolve().parents[2]
SOURCE=pathlib.Path(sys.argv[1])
if not any(SOURCE.rglob('UAL1_Standard.glb')):
    raise SystemExit('Include Universal Animation Library Standard in the source folder; the shipped humanoid motion requires it.')
if not any(SOURCE.rglob('Anvil_Log.gltf')):
    raise SystemExit('Include Fantasy Props MegaKit Standard; the world furnishings require it.')
for required in ['UAL2_Standard.glb','Puglin.glb','Imp.glb','Wolf.glb','Rat.glb','Skeleton2.glb','Slime.glb']:
    if not any(SOURCE.rglob(required)):
        raise SystemExit('Include the replacement creature source: '+required)
# Reuse the checked glTF accessor/TRS implementation, without running its build.
code=(ROOT/'scripts/assets/import-briarhaven-assets.py').read_text()
exec(code[:code.index("out={'models':")])

class LocalModel(Model):
    def __init__(self,path):
        self.path=path;self.g=json.loads(path.read_text());self.parent={c:i for i,n in enumerate(self.g['nodes']) for c in n.get('children',[])}
        self.buffers=[base64.b64decode(b['uri'].split(',')[1]) if b['uri'].startswith('data:') else (path.parent/b['uri']).read_bytes() for b in self.g['buffers']]

atlas=Image.new('RGBA',(4096,4096),(255,255,255,255));textures={};out={'models':{},'avatars':{},'tiles':{}}
def texture(model,primitive):
    material=model.g['materials'][primitive.get('material',0)].get('pbrMetallicRoughness',{});factor=material.get('baseColorFactor',[1,1,1,1])
    if 'baseColorTexture' not in material:return 0,factor
    im=model.g['images'][model.g['textures'][material['baseColorTexture']['index']]['source']]
    path=model.path.parent/im['uri'];digest=hashlib.sha256(path.read_bytes()).hexdigest()
    if digest not in textures:
        index=len(textures)+1;assert index<64;image=Image.open(path).convert('RGBA').resize((508,508),Image.Resampling.LANCZOS)
        # Two-pixel gutters protect packed textures at their UV seams.
        tile=Image.new('RGBA',(512,512));tile.paste(image,(2,2));tile.paste(image.resize((512,512)),(0,0));tile.paste(image,(2,2));atlas.paste(tile,((index%8)*512,(index//8)*512));textures[digest]=index
    out['tiles'][path.stem]=textures[digest]
    return textures[digest],factor

def convert(model,node,primitive):
    a=primitive['attributes'];p=model.acc(a['POSITION']);n=model.acc(a['NORMAL']);uv=model.acc(a['TEXCOORD_0']) if 'TEXCOORD_0'in a else np.zeros((len(p),2));index,factor=texture(model,primitive)
    if 'skin' not in model.g['nodes'][node]:
        matrix=model.pose()[node];p=(matrix@np.c_[p,np.ones(len(p))].T).T[:,:3];n=(np.linalg.inv(matrix[:3,:3]).T@n.T).T
    image=np.asarray(atlas);slot=index;u=((slot%8)*512+2+(uv[:,0]%1)*508).astype(int);v=((slot//8)*512+2+(uv[:,1]%1)*508).astype(int);fallback=image[v,u,:3]/255*np.asarray(factor[:3])
    return {'f':fallback,'p':p,'n':n,'uv':uv,'c':np.tile(factor[:3],(len(p),1)),'i':model.acc(primitive['indices']).ravel(),'t':np.full(len(p),20+index),'j':model.acc(a['JOINTS_0']) if 'JOINTS_0'in a else np.zeros((len(p),4)),'w':model.acc(a['WEIGHTS_0']) if 'WEIGHTS_0'in a else np.tile([1,0,0,0],(len(p),1))}

def encode(parts,avatar=False):
    merged={k:[] for k in parts[0]};offset=0
    for p in parts:
        for k,v in p.items():merged[k].append(v+offset if k=='i' else v)
        offset+=len(p['p'])
    assert offset<65536
    merged={k:np.concatenate(v) for k,v in merged.items()}
    if avatar:
        pos=merged['p'];grid=np.where(pos[:,1:2]>1.5,.012,.027)
        keys=np.c_[np.round(pos/grid).astype(int),merged['t'],merged['j'][np.arange(len(pos)),np.argmax(merged['w'],axis=1)],np.floor(merged['uv']*32).astype(int)]
        _,first,mapping=np.unique(keys,axis=0,return_index=True,return_inverse=True)
        indices=mapping[merged['i'].astype(int)].reshape(-1,3);indices=indices[(indices[:,0]!=indices[:,1])&(indices[:,1]!=indices[:,2])&(indices[:,0]!=indices[:,2])]
        merged={k:v[first] if k!='i' else indices.ravel() for k,v in merged.items()}
    result={k:packed(merged[k],dt) for k,dt in [('p','<f4'),('uv','<f4'),('i','<u2'),('t','u1')]}
    for k in ['c','f']:result[k]=packed(np.round(np.clip(merged[k],0,1)*255),'u1')
    result['n']=packed(np.round(np.clip(merged['n'],-1,1)*127),'i1')
    if avatar:result.update(j=packed(merged['j'],'u1'),w=packed(np.round(merged['w']*255),'u1'))
    result['bounds']=[merged['p'].min(axis=0).tolist(),merged['p'].max(axis=0).tolist()]
    return result

village=['Wall_Plaster_Straight','Wall_Plaster_WoodGrid','Wall_Plaster_Window_Wide_Flat','Wall_Plaster_Door_Round','Wall_UnevenBrick_Straight','Wall_UnevenBrick_Window_Wide_Flat','Wall_UnevenBrick_Door_Round','Wall_Arch','Window_Wide_Flat1','Door_1_Round','DoorFrame_Round_WoodDark','Roof_RoundTiles_4x4','Roof_RoundTiles_4x6','Roof_Front_Brick4','Floor_UnevenBrick','Prop_Chimney','Prop_Chimney2','Prop_Crate','Prop_Wagon','Prop_Vine1','Prop_WoodenFence_Single']
nature=['CommonTree_1','CommonTree_4','TwistedTree_1','Pine_1','Pine_3','Rock_Medium_1','Rock_Medium_3','Bush_Common','Fern_1','Grass_Wispy_Short','Flower_3_Group']
for name in village+nature+['Hair_SimpleParted','Hair_Long','Hair_Beard','Hair_Buzzed']:
    path=next(p for p in SOURCE.rglob(name+'.gltf') if not name.startswith('Hair_') or 'Origin at 0' in str(p));model=LocalModel(path);parts=[]
    for i,node in enumerate(model.g['nodes']):
        if 'mesh' in node:
            for p in model.g['meshes'][node['mesh']]['primitives']:parts.append(convert(model,i,p))
    out['models'][name]=encode(parts)

def rotation(axis,angle):
    c,s=math.cos(angle),math.sin(angle)
    if axis=='x':return np.array([[1,0,0,0],[0,c,-s,0],[0,s,c,0],[0,0,0,1]])
    if axis=='y':return np.array([[c,0,s,0],[0,1,0,0],[-s,0,c,0],[0,0,0,1]])
    return np.array([[c,-s,0,0],[s,c,0,0],[0,0,1,0],[0,0,0,1]])

def align_segment(rest_matrix,source,target,position):
    a=source/np.linalg.norm(source);b=target/np.linalg.norm(target);v=np.cross(a,b);c=np.clip(np.dot(a,b),-1,1)
    skew=np.array([[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]])
    r=np.eye(3)+skew+skew@skew/max(1e-7,1+c)
    m=rest_matrix.copy();m[:3,:3]=r@rest_matrix[:3,:3];m[:3,3]=position;return m

for sex in ['Male','Female']:
    model=LocalModel(next(SOURCE.rglob('Superhero_'+sex+'_FullBody.gltf')));g=model.g;rest=model.pose();skin=g['skins'][0];joints=skin['joints'];bind=model.acc(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
    names={n['name']:i for i,n in enumerate(g['nodes'])};parts=[]
    for node,n in enumerate(g['nodes']):
        if 'mesh'in n:
            for p in g['meshes'][n['mesh']]['primitives']:
                part=convert(model,node,p);part['c']*=1
                # Dress the base mesh in a tunic and trousers; exposed face/hands
                # retain the artist's skin texture. Equipment replaces these areas.
                for i,pos in enumerate(part['p']):
                    x,y,z=pos
                    if n['name'].startswith('Super'):
                        if y<.91:part['c'][i]=[.23,.28,.31];part['f'][i]=part['c'][i];part['t'][i]=20
                        elif y<1.48 and abs(x)<.62:part['c'][i]=[.34,.42,.43];part['f'][i]=part['c'][i];part['t'][i]=20
                parts.append(part)
    avatar={'headBind':np.linalg.inv(rest[names['Head']])[:3,:].ravel().tolist(),'mesh':encode(parts,avatar=True),'clips':{},'joints':len(joints),'head':len(joints),'right':len(joints)+1,'left':len(joints)+2,'count':len(joints)+3}
    for clip,duration in [('idle',2),('walk',.75),('run',.6),('melee',.65),('ranged',.8),('magic',1)]:
        frames=49;poses=[]
        for f in range(frames):
            phase=f/(frames-1);locomotion=clip in ['walk','run'];running=clip=='run';stride=math.sin(phase*math.pi*2) if locomotion else 0;strike=math.sin(phase*math.pi)
            posed={}
            def leg(side,parent):
                thigh=names['thigh_'+side];calf=names['calf_'+side];foot=names['foot_'+side]
                hip=(visit(parent)@np.linalg.inv(rest[parent])@rest[thigh])[:3,3]
                cycle=(phase+(0 if side=='l' else .5))%1;stance=.34 if running else .52;length=2.4 if running else 1.5
                if cycle<stance:
                    forward=length*(stance*.5-cycle);lift=0
                else:
                    t=(cycle-stance)/(1-stance);ease=t*t*(3-2*t)
                    forward=length*stance*(ease-.5);lift=(.27 if running else .13)*math.sin(t*math.pi)**1.4
                ankle=rest[foot][:3,3].copy();ankle[2]=rest[thigh][2,3]+forward;ankle[1]+=.008+lift
                upper=rest[calf][:3,3]-rest[thigh][:3,3];lower=rest[foot][:3,3]-rest[calf][:3,3];l1=np.linalg.norm(upper);l2=np.linalg.norm(lower)
                delta=ankle-hip;d=min(np.linalg.norm(delta),l1+l2-.002);axis=delta/np.linalg.norm(delta);ankle=hip+axis*d
                along=(l1*l1-l2*l2+d*d)/(2*d);height=math.sqrt(max(0,l1*l1-along*along));pole=np.array([0.,0.,1.]);pole-=axis*np.dot(pole,axis);pole/=np.linalg.norm(pole)
                knee=hip+axis*along+pole*height
                posed[thigh]=align_segment(rest[thigh],upper,knee-hip,hip)
                posed[calf]=align_segment(rest[calf],lower,ankle-knee,knee)
                posed[foot]=rest[foot].copy();posed[foot][:3,3]=ankle
            def visit(i):
                if i in posed:return posed[i]
                parent=model.parent.get(i);name=g['nodes'][i]['name']
                if locomotion and name.startswith('thigh_'):
                    leg(name[-1],parent);return posed[i]
                parent_pose=visit(parent) if parent is not None else None
                if i in posed:return posed[i]
                m=parent_pose@np.linalg.inv(rest[parent])@rest[i] if parent is not None else rest[i].copy();mods=[]
                if name=='pelvis':
                    m[1,3]+=(-.10+(.07 if running else .012)*(1-math.cos(phase*math.pi*4))) if locomotion else .008*math.sin(phase*math.pi*2)
                    if locomotion:mods=[('x',.12 if running else .025),('y',stride*.035)]
                if name.startswith('spine_') and locomotion:mods=[('y',-stride*.025)]
                if name.startswith('upperarm_'):
                    side=1 if name.endswith('_l') else -1;mods=[('z',-side*1.46),('x',stride*side*(.50 if running else .26))]
                    if clip in ['melee','magic','ranged']:mods.append(('x',(-1.6 if name.endswith('_r') else -.65)*strike))
                if name.startswith('lowerarm_'):mods=[('x',-(.95 if running else .38 if locomotion else .22)-(strike*.75 if clip in ['melee','magic','ranged'] else 0))]
                for axis,angle in mods:
                    pivot=m[:3,3].copy();m=rotation(axis,angle)@m;m[:3,3]=pivot
                posed[i]=m;return m
            for i in range(len(g['nodes'])):visit(i)
            grips=[]
            for side in ['r','l']:
                hand=names['hand_'+side];finger=names['middle_01_'+side]
                grip=np.eye(4);grip[:3,:3]=np.array([[1,0,0],[0,0,-1],[0,1,0]])
                grip[:3,3]=rest[hand][:3,3]*.35+rest[finger][:3,3]*.65
                grips.append(posed[hand]@np.linalg.inv(rest[hand])@grip)
            poses.append(np.asarray([posed[j]@bind[k] for k,j in enumerate(joints)]+[posed[names['Head']]]+grips)[:,:3,:].ravel())
        avatar['clips'][clip]={'duration':duration,'frames':frames,'m':packed(poses,'<f4')}
    out['avatars'][sex.lower()]=avatar

dest=ROOT/'client/assets/realms';dest.mkdir(exist_ok=True,parents=True)
(dest/'models.js').write_text('const REALM_MODELS='+json.dumps(out,separators=(',',':'))+';\n')
atlas.save(dest/'atlas.png',optimize=True)
(dest/'CREDITS.txt').write_text('Quaternius: Medieval Village MegaKit, Universal Base Characters, Stylized Nature MegaKit. Standard editions, CC0 1.0.\nhttps://quaternius.itch.io/medieval-village-megakit\nhttps://quaternius.itch.io/universal-base-characters\nhttps://quaternius.itch.io/stylized-nature-megakit\nConverted and adapted for Veldren.\n')
print('Converted',len(out['models']),'models,',len(textures),'textures and two human avatars.')
subprocess.run([sys.executable,str(ROOT/'scripts/assets/import-authored-motion.py'),str(SOURCE)],check=True)
subprocess.run([sys.executable,str(ROOT/'scripts/assets/import-world-props.py'),str(SOURCE)],check=True)

# Creature textures share the atlas; rebuild them after the world packs.
subprocess.run([sys.executable,str(ROOT/'scripts/assets/import-creatures.py'),str(SOURCE)],check=True)
