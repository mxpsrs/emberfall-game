"""Pack selected canonical kit modules for the existing procedural mesh emitter.
Canonical model/material records remain authoritative for Filament rendering.
"""
import base64,json,pathlib
import numpy as np
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]
registry={r['id']:r for r in json.loads((root/'dist/assets/canonical/registry.json').read_text())['records']}
legacy=json.loads((root/'dist/assets/realms/models.js').read_text().split('=',1)[1].rstrip(';\n'))
atlas=np.asarray(Image.open(root/'dist/assets/realms/atlas.png').convert('RGB'))
names=['Wall_Plaster_Window_Thin_Round','Wall_Plaster_Window_Wide_Round','Wall_UnevenBrick_Window_Thin_Round','Wall_UnevenBrick_Window_Wide_Round','Window_Thin_Round1','Window_Wide_Round1','Roof_Front_Brick6','Roof_Front_Brick8','Roof_Tower_RoundTiles','Roof_FrontSupports','WindowShutters_Wide_Flat_Open','WindowShutters_Thin_Round_Open','Corner_Exterior_Wood','Corner_Exterior_Brick','Roof_Wooden_2x1_Center']
def decode(a):return np.frombuffer(base64.b64decode(a['data']),dtype={'float32-le':'<f4','uint32-le':'<u4','uint16-le':'<u2'}[a['encoding']]).reshape((-1,a.get('components',1)))
def pack(a,t):return base64.b64encode(np.asarray(a,dtype=t).tobytes()).decode()
result={}
for name in names:
 model=json.loads((root/'dist'/registry['rebuilt:'+name]['derivedPath']).read_text());materials={m['id']:m for m in model['materials']};images={i['id']:i for i in model['images']};meshes={m['id']:m for m in model['meshes']};out={k:[] for k in ['p','n','uv','i','t','c','f']};offset=0
 for node in model['nodes']:
  if not node.get('mesh'):continue
  transform=np.array(node['worldMatrix']).reshape((4,4)).T
  for primitive in meshes[node['mesh']]['primitives']:
   attrs=primitive['attributes'];p=decode(attrs['POSITION']);n=decode(attrs['NORMAL']);p=(transform@np.c_[p,np.ones(len(p))].T).T[:,:3];n=(np.linalg.inv(transform[:3,:3]).T@n.T).T;n/=np.maximum(1e-8,np.linalg.norm(n,axis=1)[:,None]);uv=decode(attrs['TEXCOORD_0']) if 'TEXCOORD_0' in attrs else np.zeros((len(p),2));mat=materials[primitive['material']];slot=0
   if mat.get('baseColorTexture'):
    image=images[mat['baseColorTexture']['image']];slot=legacy['tiles'][pathlib.Path(image['uri']).stem]
   color=np.tile(mat['baseColorFactor'][:3],(len(p),1));u=((slot%8)*512+2+(uv[:,0]%1)*508).astype(int);v=((slot//8)*512+2+(uv[:,1]%1)*508).astype(int)
   for k,a in dict(p=p,n=n,uv=uv,i=decode(primitive['indices']).ravel()+offset,t=np.full(len(p),20+slot),c=color,f=atlas[v,u]/255*color).items():out[k].append(a)
   offset+=len(p)
 out={k:np.concatenate(v) for k,v in out.items()};encoded={k:pack(out[k],t) for k,t in [('p','<f4'),('uv','<f4'),('i','<u2'),('t','u1')]};encoded['n']=pack(np.round(np.clip(out['n'],-1,1)*127),'i1')
 for k in ['c','f']:encoded[k]=pack(np.round(np.clip(out[k],0,1)*255),'u1')
 encoded['bounds']=[out['p'].min(axis=0).tolist(),out['p'].max(axis=0).tolist()];result[name]=encoded
(root/'dist/assets/realms/building-modules.js').write_text('Object.assign(REALM_MODELS.models,'+json.dumps(result,separators=(',',':'))+');\n')
print('Packed',len(result),'authored building modules')
