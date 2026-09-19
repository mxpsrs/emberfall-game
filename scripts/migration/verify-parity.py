"""Independent GLB decoding, topology/attribute and source-renderer pose checks.
The contact sheet is an offline CPU comparison, not a Vervesis/Filament render.
"""
import base64,hashlib,json,struct
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];DT={'Float32Array':'<f4','Float64Array':'<f8','Uint8Array':'u1','Uint16Array':'<u2','Uint32Array':'<u4'}
def decode(x):
 if isinstance(x,dict):
  if 'typed'in x:return np.frombuffer(base64.b64decode(x['base64']),dtype=DT[x['typed']])
  return {k:decode(v) for k,v in x.items()}
 return x
class Model:
 def __init__(self,path):
  raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];self.g=json.loads(raw[20:20+n]);self.b=raw[28+n:];self.parent={c:i for i,n in enumerate(self.g['nodes']) for c in n.get('children',[])}
 def acc(self,index):
  a=self.g['accessors'][index];v=self.g['bufferViews'][a['bufferView']];dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];size=np.dtype(dtype).itemsize
  return np.ndarray((a['count'],width),dtype=dtype,buffer=self.b,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',width*size),size)).copy()
 def palette(self,clip,age):
  changes={};animation=next(a for a in self.g['animations'] if a['name']==clip)
  for channel in animation['channels']:
   s=animation['samplers'][channel['sampler']];ts=self.acc(s['input']).ravel();v=self.acc(s['output']);i=int(np.argmin(np.abs(ts-age)))
   if abs(float(ts[i])-age)>1e-5:
    i=max(0,int(np.searchsorted(ts,age+1e-7,side='right'))-1)
    if s.get('interpolation')!='STEP':raise ValueError('Expected sampled source keyframe')
   changes.setdefault(channel['target']['node'],{})[channel['target']['path']]=v[i]
  cache={}
  def world(i):
   if i in cache:return cache[i]
   n=self.g['nodes'][i];c=changes.get(i,{})
   if 'matrix'in n:m=np.array(n['matrix']).reshape(4,4).T
   else:
    m=np.eye(4);m[:3,:3]=Rotation.from_quat(c.get('rotation',n.get('rotation',[0,0,0,1]))).as_matrix()*np.array(c.get('scale',n.get('scale',[1,1,1])))[None,:];m[:3,3]=c.get('translation',n.get('translation',[0,0,0]))
   cache[i]=world(self.parent[i])@m if i in self.parent else m;return cache[i]
  skin=self.g['skins'][0];inverse=self.acc(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
  return np.stack([world(i) for i in skin['joints']])@inverse
def deform(p,j,w,palette):
 p=np.column_stack([p,np.ones(len(p))]);return np.sum(np.einsum('nwij,nj->nwi',palette[j],p)*w[:,:,None],axis=1)[:,:3]
report={'geometry':[],'poses':[],'failures':[],'scope':'Independent glTF CPU decoding vs current JavaScript asset and pose functions; not native runtime verification'};models={};assets={}
inventory=json.loads((ROOT/'migration/reports/asset-inventory.json').read_text())['assets']
for record in inventory:
 a=decode(json.loads((ROOT/'.qa/migration/capture'/record['file']).read_text()));m=Model(ROOT/record['path']);models[(record['group'],record['name'])]=m;assets[(record['group'],record['name'])]=a
 source={a['name']:a['mesh']} if 'mesh'in a else a['meshes']
 for mesh in m.g['meshes']:
  raw=source[mesh['name']];prim=mesh['primitives'][0];attrs=prim['attributes']
  for key,attribute,width in [('p','POSITION',3),('n','_VELDREN_NORMAL',3),('c','_VELDREN_COLOR',3),('f','_VELDREN_FALLBACK',3),('uv','TEXCOORD_0',2),('j','_VELDREN_JOINTS',4),('skin','_VELDREN_SKIN',1),('dye','_VELDREN_DYE',1)]:
   if key not in raw or raw[key] is None:continue
   if not np.array_equal(np.asarray(raw[key]).reshape(-1,width),m.acc(attrs[attribute])):report['failures'].append({'asset':record['id'],'mesh':mesh['name'],'attribute':key})
  actual=np.concatenate([m.acc(p['indices']).ravel() for p in mesh['primitives']]).reshape(-1,3);original=np.asarray(raw['i']).reshape(-1,3)
  sort=lambda a:a[np.lexsort((a[:,2],a[:,1],a[:,0]))]
  if not np.array_equal(sort(actual),sort(original)):report['failures'].append({'asset':record['id'],'mesh':mesh['name'],'topology':False})
 report['geometry'].append({'id':record['id'],'meshes':len(m.g['meshes']),'vertices':sum(m.g['accessors'][mesh['primitives'][0]['attributes']['POSITION']]['count'] for mesh in m.g['meshes'])})
visuals={}
for sample in json.loads((ROOT/'.qa/migration/poses.json').read_text()):
 key=(sample['group'],sample['name']);m=models[key];a=assets[key];target=m.palette(sample['clip'],sample['time'])
 actual=np.tile(np.eye(4),(len(sample['palette'])//12,1,1));actual[:,:3,:]=np.asarray(sample['palette']).reshape(-1,3,4)
 maximum=0;source={a['name']:a['mesh']} if 'mesh'in a else a['meshes']
 for mesh in m.g['meshes']:
  raw=source[mesh['name']]
  if raw.get('j') is None:continue
  attrs=mesh['primitives'][0]['attributes'];p=m.acc(attrs['POSITION']);j=np.asarray(raw['j']).reshape(-1,4).astype('i4');w=np.asarray(raw['w']).reshape(-1,4).astype('f8')
  if np.asarray(raw['w']).dtype==np.dtype('u1'):w/=w.sum(axis=1)[:,None] # briarPose normalizes quantized weights by their actual sum
  old=deform(p,j,w,actual);new=deform(p,m.acc(attrs['JOINTS_0']).astype('i4'),m.acc(attrs['WEIGHTS_0']),target)
  error=float(np.max(np.linalg.norm(old-new,axis=1)));maximum=max(maximum,error)
  if sample['group'] in ['characters','creatures'] and key not in visuals and sample['time']>0:
   tri=np.concatenate([m.acc(x['indices']).ravel() for x in mesh['primitives']]).reshape(-1,3);colors=np.asarray(raw.get('c',np.ones(len(p)*3))).reshape(-1,3);visuals[key]=(old,new,tri,colors,sample['clip'])
 result={k:v for k,v in sample.items() if k!='palette'};result['maxVertexDisplacement']=maximum;report['poses'].append(result)
 if maximum>0.00002:report['failures'].append(result)
report['summary']={'models':len(report['geometry']),'poseSamples':len(report['poses']),'maxVertexDisplacement':max(x['maxVertexDisplacement'] for x in report['poses']),'failures':len(report['failures'])}
# Shared view/camera/triangle rasterization for each side; no artistic redrawing.
tile=230;sheet=Image.new('RGB',(tile*4,280*((len(visuals)+1)//2)),(26,31,39));draw=ImageDraw.Draw(sheet)
for idx,(key,(old,new,tri,col,clip)) in enumerate(visuals.items()):
 angle=.6;rotation=np.array([[np.cos(angle),0,np.sin(angle)],[0,1,0],[-np.sin(angle),0,np.cos(angle)]])
 both=np.concatenate([old,new])@rotation.T;lo=both.min(0);hi=both.max(0);scale=(tile-30)/max(hi[0]-lo[0],hi[1]-lo[1],1e-6)
 for side,positions in enumerate([old,new]):
  ox=(idx%2*2+side)*tile;oy=(idx//2)*280;v=positions@rotation.T;xy=np.column_stack([(v[:,0]-(lo[0]+hi[0])/2)*scale+ox+tile/2,oy+tile-10-(v[:,1]-lo[1])*scale])
  for t in tri[np.argsort(v[tri,2].mean(1))]:
   normal=np.cross(v[t[1]]-v[t[0]],v[t[2]]-v[t[0]]);normal/=max(np.linalg.norm(normal),1e-8);light=.4+.6*abs(np.dot(normal,np.array([.2,.7,.685])))
   rgb=tuple(np.clip(col[t].mean(0)*light*255,0,255).astype('u1'));draw.polygon([tuple(x) for x in xy[t]],fill=rgb)
  draw.text((ox+8,oy+tile+3),key[1]+' / '+clip,fill='white');draw.text((ox+8,oy+tile+20),'Source pose' if side==0 else 'glTF pose',fill='white')
out=ROOT/'migration/reports';sheet.save(out/'pose-comparison.png');(out/'asset-parity.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report['summary']));raise SystemExit(bool(report['failures']))
