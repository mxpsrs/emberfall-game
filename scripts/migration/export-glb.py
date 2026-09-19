"""Veldren-specific recovery of adapted meshes and skeletons into standard glTF 2.
No engine, native loader or runtime scripting interface is introduced.
"""
import argparse,base64,hashlib,json,struct
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.spatial.transform import Rotation

ROOT=Path(__file__).resolve().parents[2]
CAPTURE=ROOT/'.qa/migration/capture'
DT={'Float32Array':'<f4','Float64Array':'<f8','Uint8Array':'u1','Int8Array':'i1','Uint16Array':'<u2','Int16Array':'<i2','Uint32Array':'<u4','Int32Array':'<i4'}
def decode(v):
    if isinstance(v,dict):
        if 'typed' in v and 'base64' in v:return np.frombuffer(base64.b64decode(v['base64']),dtype=DT[v['typed']]).copy()
        return {k:decode(x) for k,x in v.items()}
    if isinstance(v,list):return [decode(x) for x in v]
    return v
def plain(v):
    if isinstance(v,np.ndarray):return v.tolist()
    if isinstance(v,dict):return {k:plain(x) for k,x in v.items()}
    if isinstance(v,list):return [plain(x) for x in v]
    if isinstance(v,np.generic):return v.item()
    return v
def affine(values):
    a=np.asarray(values,dtype=np.float64).reshape(-1,3,4)
    out=np.tile(np.eye(4),(len(a),1,1));out[:,:3,:]=a
    return out
def matrices(trs):
    values=np.asarray(trs).reshape(-1,10);out=np.tile(np.eye(4),(len(values),1,1))
    out[:,:3,:3]=Rotation.from_quat(values[:,3:7]).as_matrix()*values[:,None,7:10]
    out[:,:3,3]=values[:,:3];return out
def decompose(matrix):
    matrix=np.asarray(matrix).reshape(-1,4,4);t=matrix[:,:3,3].copy()
    r=matrix[:,:3,:3].copy();s=np.linalg.norm(r,axis=1)
    if np.any(s<1e-12):raise ValueError('Degenerate animation scale')
    r/=s[:,None,:]
    negative=np.linalg.det(r)<0;r[negative,:,0]*=-1;s[negative,0]*=-1
    u,_,v=np.linalg.svd(r);r=u@v
    q=Rotation.from_matrix(r).as_quat()
    restored=np.tile(np.eye(4),(len(t),1,1));restored[:,:3,:3]=r*s[:,None,:];restored[:,:3,3]=t
    error=float(np.max(np.abs(restored-matrix)))
    if error>0.0002:raise ValueError('Animation has non-TRS shear '+str(error))
    return np.concatenate([t,q,s],axis=1).astype('<f4'),error
def linear(colors):
    c=np.clip(colors,0,1);return np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4).astype('<f4')

class GLB:
    def __init__(self,asset,images):
        self.g={'asset':{'version':'2.0','generator':'Veldren adapted asset recovery'},'scene':0,'scenes':[{'nodes':[]}],
            'nodes':[],'meshes':[],'bufferViews':[],'accessors':[],'materials':[],'extras':{'veldrenAssetId':asset['id']}}
        self.binary=bytearray();self.images=images;self.materials={};self.dependencies=set();self.skin=None;self.bones=[]
    def acc(self,data,width,ctype=None,target=None,bounds=False):
        a=np.asarray(data).reshape(-1,width)
        if ctype is None:ctype=5126
        dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[ctype];a=a.astype(dtype)
        if not len(a) or not np.isfinite(a).all():raise ValueError('Empty or non-finite accessor')
        self.binary.extend(b'\0'*(-len(self.binary)%4));start=len(self.binary);self.binary.extend(a.tobytes())
        view={'buffer':0,'byteOffset':start,'byteLength':a.nbytes}
        if target:view['target']=target
        self.g['bufferViews'].append(view)
        out={'bufferView':len(self.g['bufferViews'])-1,'componentType':ctype,'count':len(a),'type':{1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4',16:'MAT4'}[width]}
        if bounds:out.update(min=a.min(0).tolist(),max=a.max(0).tolist())
        self.g['accessors'].append(out);return len(self.g['accessors'])-1
    def node(self,node,parent=None):
        index=len(self.g['nodes']);self.g['nodes'].append(node)
        if parent is None:self.g['scenes'][0]['nodes'].append(index)
        else:self.g['nodes'][parent].setdefault('children',[]).append(index)
        return index
    def material(self,slot):
        slot=int(slot)
        if slot in self.materials:return self.materials[slot]
        mat={'name':'legacy-material-'+str(slot),'pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':1},'doubleSided':True,
            'extras':{'legacyMaterial':slot,'legacyShader':'dist/renderer-gl.js'}}
        if slot>=20:
            tile=slot-20
            if tile not in self.images:raise ValueError('Atlas tile unavailable '+str(tile))
            if 'images' not in self.g:self.g.update(images=[],textures=[],samplers=[{'magFilter':9729,'minFilter':9729,'wrapS':10497,'wrapT':10497}])
            index=len(self.g['images']);self.g['images'].append({'name':f'atlas-{tile:02}','uri':f'../../textures/atlas/tile-{tile:02}.png'})
            self.g['textures'].append({'source':index,'sampler':0});mat['pbrMetallicRoughness']['baseColorTexture']={'index':index}
            self.dependencies.add(f'assets/textures/atlas/tile-{tile:02}.png')
            if self.images[tile]['alpha']:mat.update(alphaMode='MASK',alphaCutoff=.45)
        else:mat['extras']['limitation']='Browser procedural material not implemented by this glTF export; source/base attributes retained.'
        self.materials[slot]=len(self.g['materials']);self.g['materials'].append(mat)
        return self.materials[slot]
    def mesh(self,name,m):
        p=np.asarray(m['p']).reshape(-1,3);count=len(p);n=np.asarray(m['n']).reshape(-1,3)
        length=np.linalg.norm(n,axis=1);normal=n.copy();normal[length>1e-8]/=length[length>1e-8,None];normal[length<=1e-8]=[0,1,0]
        c=np.asarray(m.get('c',np.ones(count*3))).reshape(-1,3);f=np.asarray(m.get('f',c)).reshape(-1,3)
        uv=np.asarray(m.get('uv',np.zeros(count*2))).reshape(-1,2)
        slots=np.asarray(m.get('t',np.full(count,20 if 'uv' in m else 12)),dtype='u1').copy()
        slots[slots==0]=20 if 'uv' in m else 12
        attrs={'POSITION':self.acc(p,3,target=34962,bounds=True),'NORMAL':self.acc(normal,3,target=34962),
            'TEXCOORD_0':self.acc(uv,2,target=34962),'COLOR_0':self.acc(linear(c),3,target=34962),
            '_VELDREN_NORMAL':self.acc(n,3,target=34962),'_VELDREN_COLOR':self.acc(c,3,target=34962),
            '_VELDREN_FALLBACK':self.acc(f,3,target=34962),'_VELDREN_MATERIAL':self.acc(slots,1,target=34962)}
        for key in ['skin','dye']:
            if m.get(key) is not None:attrs['_VELDREN_'+key.upper()]=self.acc(m[key],1,target=34962)
        if m.get('j') is not None:
            if self.skin is None:raise ValueError('Skinned geometry without skeleton')
            weights=np.asarray(m['w']).reshape(-1,4).astype('<f4')
            if np.asarray(m['w']).dtype==np.dtype('u1'):weights/=255
            sums=weights.sum(1);standard=weights/np.where(sums>0,sums,1)[:,None]
            if np.any(sums==0):raise ValueError('Zero-weight skin vertex')
            joints=np.asarray(m['j']).reshape(-1,4).copy();joints[standard==0]=0
            attrs.update(_VELDREN_JOINTS=self.acc(m['j'],4,5123,target=34962),JOINTS_0=self.acc(joints,4,5123,target=34962),WEIGHTS_0=self.acc(standard,4,target=34962),_VELDREN_WEIGHTS=self.acc(weights,4,target=34962))
        triangles=np.asarray(m['i']).reshape(-1,3);groups={}
        for triangle in triangles:
            values=slots[triangle];mixed=not np.all(values==values[0]);slot=20 if mixed else int(values[0])
            groups.setdefault((slot,mixed),[]).append(triangle)
        fallback=self.acc(linear(f),3,target=34962) if any(k[1] for k in groups) else None
        primitives=[]
        for (slot,mixed),indices in groups.items():
            a=dict(attrs)
            if mixed:a['COLOR_0']=fallback
            primitives.append({'attributes':a,'indices':self.acc(np.array(indices).ravel(),1,5125,target=34963),'material':self.material(slot),
                'extras':{'mixedAtlasFallback':mixed}})
        mesh=len(self.g['meshes']);self.g['meshes'].append({'name':name,'primitives':primitives})
        node={'name':name,'mesh':mesh}
        if m.get('j') is not None:node['skin']=self.skin
        self.node(node)
    def rig(self,asset,animate=True):
        legacy='rig' not in asset
        count=int(asset.get('jointCount') if legacy else asset['joints'])
        rig=asset.get('rig',{});names=rig.get('names',[f'palette-{i}' for i in range(count)]);parents=rig.get('parents',[-1]*count)
        inverse=np.tile(np.eye(4),(count,1,1)) if legacy else affine(rig['bind'])
        deforms=list(range(count)) if legacy else rig.get('deforms',list(range(count)))
        clips=asset['clips'];initial=next(iter(clips));max_error=0
        def local_trs(clip):
            nonlocal max_error
            frames=clip['frames']
            if clip.get('trs') is not None:return np.asarray(clip['trs']).reshape(frames,count,10).copy()
            width=asset.get('count',asset.get('jointCount',count))
            palette=affine(clip['m']).reshape(frames,width,4,4)[:,:count]
            if legacy:local=palette
            else:
                if len(inverse)!=count:raise ValueError('Matrix clip has an unsupported sparse inverse-bind palette')
                world=palette@np.linalg.inv(inverse)[None]
                local=world.copy()
                for b,parent in enumerate(parents):
                    if parent>=0:local[:,b]=np.linalg.inv(world[:,parent])@world[:,b]
            values,error=decompose(local);max_error=max(max_error,error)
            return values.reshape(frames,count,10)
        rest=local_trs(clips[initial])[0];self.bones=[]
        skeleton_root=self.node({'name':'source-skeleton-root'})
        # Preserve node order without requiring parents to precede children.
        for b in range(count):
            v=rest[b];q=v[3:7]/np.linalg.norm(v[3:7])
            self.bones.append(len(self.g['nodes']));self.g['nodes'].append({'name':names[b],'translation':v[:3].tolist(),'rotation':q.tolist(),'scale':v[7:10].tolist()})
        for b,parent in enumerate(parents):
            if parent<0:self.g['nodes'][skeleton_root].setdefault('children',[]).append(self.bones[b])
            else:self.g['nodes'][self.bones[parent]].setdefault('children',[]).append(self.bones[b])
        joints=[];seen=set()
        for b in deforms:
            node=self.bones[b]
            if node in seen:node=self.node({'name':names[b]+'-skin-bind-'+str(len(joints))},self.bones[b])
            seen.add(node);joints.append(node)
        self.skin=len(self.g.setdefault('skins',[]));self.g['skins'].append({'name':'Veldren source skin','skeleton':skeleton_root,'joints':joints,'inverseBindMatrices':self.acc(inverse.transpose(0,2,1).reshape(-1,16),16)})
        if legacy:self.g['extras']['hierarchyRecovery']='Flat palette rig; original hierarchy is absent from this legacy bundle. Acquire the pinned original KayKit GLB separately.'
        elif all(key in rig for key in ['head','right','left','rightGrip','leftGrip']):
            sockets={}
            for key in ['head','right','left']:
                matrix=np.eye(4) if key=='head' else affine(rig[key+'Grip'])[0]
                sockets[key]=self.node({'name':key+'-attachment','matrix':matrix.T.ravel().tolist()},self.bones[rig[key]])
            self.g['extras']['attachments']=sockets
        if animate:
            for name,clip in clips.items():
                values=local_trs(clip);frames=len(values);times=np.linspace(0,clip['duration'],frames,dtype='<f4') if frames>1 else np.array([0],dtype='<f4')
                mode='LINEAR'
                if legacy or clip.get('trs') is None:
                    mode='STEP'
                    if frames>1:
                        times[1:]-=clip['duration']/(frames-1)*.5
                        times=np.append(times,np.float32(clip['duration']));values=np.concatenate([values,values[-1:]])
                time_accessor=self.acc(times,1,bounds=True)
                animation={'name':name,'samplers':[],'channels':[],'extras':plain({k:v for k,v in clip.items() if k not in ['m','trs']})}
                for b,node in enumerate(self.bones):
                    for channel,start,end in [('translation',0,3),('rotation',3,7),('scale',7,10)]:
                        data=values[:,b,start:end].copy()
                        if channel=='rotation':data/=np.linalg.norm(data,axis=1)[:,None]
                        animation['samplers'].append({'input':time_accessor,'output':self.acc(data,end-start),'interpolation':mode})
                        animation['channels'].append({'sampler':len(animation['samplers'])-1,'target':{'node':node,'path':channel}})
                self.g.setdefault('animations',[]).append(animation)
        self.g['extras']['matrixDecompositionMaxError']=max_error
    def write(self,path):
        self.g['buffers']=[{'byteLength':len(self.binary)}]
        doc=json.dumps(plain(self.g),separators=(',',':'),allow_nan=False).encode();doc+=b' '*(-len(doc)%4)
        binary=bytes(self.binary)+b'\0'*(-len(self.binary)%4)
        raw=struct.pack('<IIIII',0x46546c67,2,28+len(doc)+len(binary),len(doc),0x4e4f534a)+doc+struct.pack('<II',len(binary),0x004e4942)+binary
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw);return hashlib.sha256(raw).hexdigest()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--only',default='');args=parser.parse_args()
    atlas=Image.open(ROOT/'dist/assets/realms/atlas.png').convert('RGBA');images={}
    for i in range(64):
        x,y=i%8*512,i//8*512;image=atlas.crop((x+2,y+2,x+510,y+510));path=ROOT/f'assets/textures/atlas/tile-{i:02}.png'
        path.parent.mkdir(parents=True,exist_ok=True);image.save(path);images[i]={'alpha':image.getextrema()[3][0]<255}
    inventory=json.loads((CAPTURE/'index.json').read_text());records=[];failures=[]
    for entry in inventory['entries']:
        if args.only and args.only not in entry['id']:continue
        try:
            asset=decode(json.loads((CAPTURE/entry['file']).read_text()));g=GLB(asset,images)
            rig_asset=asset
            if asset.get('rigAsset'):
                sex=asset['rigAsset'].split(':')[-1];rig_asset=decode(json.loads((CAPTURE/'characters'/f'{sex}.json').read_text()))
                g.rig(rig_asset,False)
            elif asset.get('clips'):g.rig(asset)
            if 'mesh' in asset:g.mesh(asset['name'],asset['mesh'])
            else:
                for name,mesh in asset['meshes'].items():g.mesh(name,mesh)
            g.g['extras']['source']=entry['source']
            g.g['extras']['gameMetadata']=plain({k:v for k,v in asset.items() if k not in ['mesh','meshes','rig','clips','source']})
            path=ROOT/'assets/models'/entry['group']/(Path(entry['file']).stem+'.glb');sha=g.write(path)
            records.append({**entry,'path':path.relative_to(ROOT).as_posix(),'sha256':sha,'bytes':path.stat().st_size,
                'meshCount':len(g.g['meshes']),'skinJoints':sum(len(s['joints']) for s in g.g.get('skins',[])),
                'animations':[a['name'] for a in g.g.get('animations',[])],'dependencies':sorted(g.dependencies),'nativeRuntimeVerified':False})
        except Exception as error:failures.append({'id':entry['id'],'error':str(error)})
    report={'format':'Veldren migration evidence; NOT a Vervesis registry','baselineCommit':'439dfaaea6e144ab9f2e8ab30304f9c34c1915b2','assets':records,'failures':failures}
    folder=ROOT/'migration/reports';folder.mkdir(parents=True,exist_ok=True);(folder/('asset-inventory-partial.json' if args.only else 'asset-inventory.json')).write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'models':len(records),'bytes':sum(a['bytes'] for a in records),'failures':failures}))
    raise SystemExit(bool(failures))
if __name__=='__main__':main()
