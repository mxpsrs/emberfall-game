"""Rebuild the Briarhaven art pilot from pinned, CC0 KayKit sources.

Usage: python scripts/assets/import-briarhaven-assets.py [download-cache]
Only the selected meshes and six animation clips ship. Atlas colors are baked
to vertices; skeleton poses are sampled at 24 Hz, retaining four skin weights.
"""
import base64, io, json, math, pathlib, struct, sys, urllib.request
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
CACHE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / '.asset-cache'
SOURCES = {
    'dungeon': ('KayKit-Dungeon-Remastered-1.0','b0ca9bd96a8072ab36a3a5464f00ed1e06a16d07','addons/kaykit_dungeon_remastered/Assets'),
    'town': ('KayKit-Medieval-Hexagon-Pack-1.0', '84fa4e91af6a88989be7c99e0891cede11f2ca38', 'addons/kaykit_medieval_hexagon_pack'),
    'hero': ('KayKit-Character-Pack-Adventures-1.0', '672074b73ba276876a19e8816ecdc5241817ab47', 'addons/kaykit_character_pack_adventures'),
}
def fetch(kind, path):
    repo, sha, prefix = SOURCES[kind]
    path = prefix + '/' + path
    dest = CACHE / kind / path
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(urllib.request.urlopen(f'https://raw.githubusercontent.com/KayKit-Game-Assets/{repo}/{sha}/{path}', timeout=90).read())
    return dest

def packed(a, dtype):
    return base64.b64encode(np.asarray(a, dtype=dtype).tobytes()).decode()

def trs(t, q, s):
    x,y,z,w = q
    m = np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),t[0]],
                  [2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),t[1]],
                  [2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y),t[2]], [0,0,0,1]], dtype=float)
    m[:3,:3] *= s
    return m

class Model:
    def __init__(self, kind, path):
        p = fetch(kind,path); raw = p.read_bytes(); self.kind = kind
        if p.suffix == '.glb':
            n = struct.unpack_from('<I',raw,12)[0]
            self.g = json.loads(raw[20:20+n]); self.buffers = [raw[28+n:]]
        else:
            self.g = json.loads(raw); self.buffers = []
            for b in self.g['buffers']:
                self.buffers.append(fetch(kind,str(pathlib.PurePosixPath(path).parent/b['uri'])).read_bytes())
        self.parent = {c:i for i,n in enumerate(self.g['nodes']) for c in n.get('children',[])}
        self.images = []
        for im in self.g.get('images',[]):
            if 'bufferView' in im:
                v = self.g['bufferViews'][im['bufferView']]; start = v.get('byteOffset',0)
                b = self.buffers[v['buffer']][start:start+v['byteLength']]
            else:
                # Every town model uses the same artist-authored gradient atlas.
                b = fetch(kind, 'Assets/gltf/buildings/blue/hexagons_medieval.png').read_bytes()
            self.images.append(np.asarray(Image.open(io.BytesIO(b)).convert('RGB')))

    def acc(self, index):
        a=self.g['accessors'][index];v=self.g['bufferViews'][a['bufferView']]
        dtype={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']]
        width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        item=np.dtype(dtype).itemsize; start=v.get('byteOffset',0)+a.get('byteOffset',0)
        return np.ndarray((a['count'],width),dtype=dtype,buffer=self.buffers[v['buffer']],offset=start,strides=(v.get('byteStride',item*width),item)).copy()

    def pose(self, animation=None, age=0):
        nodes=self.g['nodes']; changes={}
        if animation:
            for ch in animation['channels']:
                sp=animation['samplers'][ch['sampler']]; ts=self.acc(sp['input']).ravel();values=self.acc(sp['output'])
                i=max(0,min(len(ts)-2,int(np.searchsorted(ts,age,side='right'))-1)); fraction=np.clip((age-ts[i])/(ts[i+1]-ts[i]) if len(ts)>1 else 0,0,1)
                a=values[i]; b=values[min(i+1,len(ts)-1)]
                if ch['target']['path']=='rotation' and np.dot(a,b)<0: b=-b
                value=a if sp.get('interpolation')=='STEP' else a+(b-a)*fraction
                if ch['target']['path']=='rotation': value=value/np.linalg.norm(value)
                changes.setdefault(ch['target']['node'],{})[ch['target']['path']]=value
        out={}
        def visit(i):
            if i in out:return out[i]
            n=nodes[i]; c=changes.get(i,{})
            m=np.asarray(n['matrix']).reshape(4,4).T if 'matrix' in n else trs(c.get('translation',n.get('translation',[0,0,0])),c.get('rotation',n.get('rotation',[0,0,0,1])),c.get('scale',n.get('scale',[1,1,1])))
            out[i]=visit(self.parent[i])@m if i in self.parent else m
            return out[i]
        for i in range(len(nodes)):visit(i)
        return out

    def mesh(self, node, rigid_joint=None, primitive=0):
        n=self.g['nodes'][node]; p=self.g['meshes'][n['mesh']]['primitives'][primitive];a=p['attributes']
        pos=self.acc(a['POSITION']); normals=self.acc(a['NORMAL']);uv=self.acc(a['TEXCOORD_0']) if 'TEXCOORD_0' in a else np.zeros((len(pos),2))
        mat=self.g['materials'][p.get('material',0)].get('pbrMetallicRoughness',{}); factor=mat.get('baseColorFactor',[1,1,1,1])[:3]
        if 'baseColorTexture' in mat:
            tex=self.g['textures'][mat['baseColorTexture']['index']]['source'];im=self.images[tex];h,w,_=im.shape
            colors=im[np.clip((uv[:,1]*h).astype(int),0,h-1),np.clip((uv[:,0]*w).astype(int),0,w-1)]*factor
        else: colors=np.tile(np.asarray(factor)*255,(len(pos),1))
        out={'p':packed(pos,'<f4'),'n':packed(np.round(normals*127),'i1'),'c':packed(np.round(colors),'u1'),'i':packed(self.acc(p['indices']),'<u2'),'count':len(pos)}
        if rigid_joint is not None:
            j=np.zeros((len(pos),4));j[:,0]=rigid_joint;wt=np.zeros_like(j);wt[:,0]=255
            out.update(j=packed(j,'u1'),w=packed(wt,'u1'))
        elif 'JOINTS_0' in a:
            out.update(j=packed(self.acc(a['JOINTS_0']),'u1'),w=packed(np.round(self.acc(a['WEIGHTS_0'])*255),'u1'))
        else:
            m=self.pose()[node];pos=(m@np.c_[pos,np.ones(len(pos))].T).T[:,:3]
            normals=(np.linalg.inv(m[:3,:3]).T@normals.T).T
            out.update(p=packed(pos,'<f4'),n=packed(np.round(normals*127),'i1'))
        out['bounds']=[pos.min(axis=0).tolist(),pos.max(axis=0).tolist()]
        return out

out={'models':{},'rigs':{}}
static={
    'inn':'buildings/blue/building_tavern_blue', 'shop':'buildings/blue/building_market_blue',
    'forge':'buildings/blue/building_blacksmith_blue','homeA':'buildings/blue/building_home_A_blue',
    'homeB':'buildings/blue/building_home_B_blue','treeA':'decoration/nature/tree_single_A',
    'treeB':'decoration/nature/tree_single_B','rock':'decoration/nature/rock_single_A',
    'barrel':'decoration/props/barrel','crate':'decoration/props/crate_A_small',
    'castle':'buildings/blue/building_castle_blue','hall':'buildings/blue/building_barracks_blue',
    'temple':'buildings/blue/building_church_blue','mine':'buildings/blue/building_mine_blue',
    'tower':'buildings/blue/building_tower_B_blue','well':'buildings/blue/building_well_blue',
    'bridge':'buildings/neutral/building_bridge_A','gate':'buildings/neutral/wall_straight_gate',
    'mountain':'decoration/nature/mountain_A','rockB':'decoration/nature/rock_single_C',
    'lumber':'decoration/props/resource_lumber','stone':'decoration/props/resource_stone',
    'rack':'decoration/props/weaponrack','sack':'decoration/props/sack',
    'tent':'decoration/props/tent','cart':'decoration/props/wheelbarrow',

}
# Retrieve independent source files concurrently; the conversion is deterministic.
from concurrent.futures import ThreadPoolExecutor
paths=[('town','Assets/gltf/'+p+ext) for p in static.values() for ext in ['.gltf','.bin']]
paths += [('hero','Characters/gltf/'+n+'.glb') for n in ['Barbarian']]
with ThreadPoolExecutor(max_workers=6) as pool:
    list(pool.map(lambda arg: fetch(*arg),paths))
interior={'bed':'bed_decorated.gltf.glb','table':'table_medium_decorated_A.gltf.glb','banquet':'table_long_tablecloth_decorated_A.gltf.glb','pillar':'pillar_decorated.gltf.glb','chest':'chest.glb','shelf':'shelf_large.gltf.glb','chair':'chair.gltf.glb','wall':'wall.gltf.glb'}
with ThreadPoolExecutor(max_workers=6) as pool:
    list(pool.map(lambda path: fetch('dungeon','gltf/'+path),interior.values()))
for key,kind,path in [(k,'town','Assets/gltf/'+p+'.gltf') for k,p in static.items()]+[(k,'dungeon','gltf/'+p) for k,p in interior.items()]:
    model=Model(kind,path);parts=[];offset=0
    arrays={k:[] for k in ['p','n','c','i']}
    for node,n in enumerate(model.g['nodes']):
        if 'mesh' not in n:continue
        for primitive in range(len(model.g['meshes'][n['mesh']]['primitives'])):
            m=model.mesh(node,primitive=primitive);parts.append(m)
            for field,dtype in [('p','<f4'),('n','i1'),('c','u1'),('i','<u2')]:
                values=np.frombuffer(base64.b64decode(m[field]),dtype=dtype)
                arrays[field].append(values.astype(np.int64)+offset if field=='i' else values)
            offset+=m['count']
    assert offset<65536
    joined={k:packed(np.concatenate(arrays[k]),dtype) for k,dtype in [('p','<f4'),('n','i1'),('c','u1'),('i','<u2')]}
    joined.update(count=offset,bounds=[np.min([m['bounds'][0] for m in parts],axis=0).tolist(),np.max([m['bounds'][1] for m in parts],axis=0).tolist()])
    out['models'][key]=joined

clips={'idle':'Idle','walk':'Walking_A','melee':'1H_Melee_Attack_Chop','ranged':'2H_Ranged_Shoot','magic':'Spellcast_Shoot','unarmed':'Unarmed_Melee_Attack_Punch_A'}
for name,extras in [('Rogue',[]),('Knight',['Knight_Helmet','1H_Sword','Badge_Shield']),('Mage',['2H_Staff']),('Barbarian',[])]:
    model=Model('hero','Characters/gltf/'+name+'.glb');g=model.g;skin=g['skins'][0];joints=skin['joints'];bind=model.acc(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
    extra_nodes=[next(i for i,n in enumerate(g['nodes']) if n['name']==e) for e in extras]
    # Include the authored hand attachment even when a shortbow is drawn locally.
    hand=next(i for i,n in enumerate(g['nodes']) if n['name']=='handslot.r');extra_nodes.append(hand)
    head=next(i for i,n in enumerate(g['nodes']) if n['name']=='head');extra_nodes.append(head)
    rig={'meshes':{},'clips':{},'jointCount':len(joints)+len(extra_nodes),'hand':len(joints)+len(extra_nodes)-2,'head':len(joints)+len(extra_nodes)-1}
    for i,n in enumerate(g['nodes']):
        if 'mesh' in n and ('skin'in n or i in extra_nodes):
            rig['meshes'][n['name'].removeprefix(name+'_')]=model.mesh(i,len(joints)+extra_nodes.index(i) if 'skin' not in n else None)
    for key,clip in clips.items():
        anim=next(a for a in g['animations'] if a['name']==clip)
        duration=max(float(model.acc(s['input'])[-1,0]) for s in anim['samplers']);frames=max(2,math.ceil(duration*24)+1);poses=[]
        for f in range(frames):
            world=model.pose(anim,f/(frames-1)*duration)
            poses.append(np.asarray([world[j]@bind[k] for k,j in enumerate(joints)]+[world[j] for j in extra_nodes])[:,:3,:].ravel())
        rig['clips'][key]={'duration':round(duration,5),'frames':frames,'m':packed(poses,'<f4')}
    out['rigs'][name]=rig
    print(name,{k:v['count'] for k,v in rig['meshes'].items()})

dest=ROOT/'client/assets/briarhaven';dest.mkdir(parents=True,exist_ok=True)
(dest/'models.js').write_text('// Generated by scripts/assets/import-briarhaven-assets.py. KayKit assets: CC0.\nconst BRIARHAVEN_ASSETS='+json.dumps(out,separators=(',',':'))+';\n')
for kind in SOURCES:(dest/(kind+'-LICENSE.txt')).write_bytes(fetch(kind,'LICENSE.txt').read_bytes())
(dest/'CREDITS.txt').write_text('Veldren world art: models and animation by Kay Lousberg (KayKit).\nCC0 1.0 Universal. https://kaylousberg.com/\n\n'+ '\n'.join(f'https://github.com/KayKit-Game-Assets/{r}/tree/{sha}' for r,sha,_ in SOURCES.values())+'\n\nSelected meshes and animations converted for Veldren; original atlas colors baked to vertices.\n')
print('Wrote',dest/'models.js', (dest/'models.js').stat().st_size)
