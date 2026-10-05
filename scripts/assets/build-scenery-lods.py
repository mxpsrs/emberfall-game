"""Cook indexed scenery LODs with material/UV-aware vertex clustering.

Original near meshes and collision bounds remain authoritative. Generated LODs
are render assets selected by the existing native hysteresis policy.
"""
import base64,json,pathlib
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2]
path=ROOT/'client/assets/realms/models.js'
world=json.loads(path.read_text().split('=',1)[1].rstrip(';\n'))
canonical_ids={r['id'] for r in json.loads((ROOT/'client/assets/canonical/registry.json').read_text())['records'] if r['type']=='model' and r.get('importSettings',{}).get('importer')=='veldren-gltf-1'}
def decode(s,dtype):return np.frombuffer(base64.b64decode(s),dtype=dtype).copy()
def encode(a,dtype):return base64.b64encode(np.asarray(a,dtype=dtype).tobytes()).decode()
report=[]
for name,source in list(world['models'].items()):
 if 'rebuilt:'+name in canonical_ids:
  source.pop('lods',None)
  for key in [name+'_LOD1',name+'_LOD2']:world['models'].pop(key,None)
  continue
 if '_LOD' in name or not name.startswith(('CommonTree_','TwistedTree_','Pine_','Bush_','Rock_','Roof_','World_','ResourceTree_','Mushroom_')):continue
 # Animated meshes and primitives with independently bound material ranges need
 # a skin/range-preserving authoring pass; never run a static clustering pass.
 if source.get('j') or source.get('w') or source.get('materialParts') or not all(source.get(k) for k in ['p','n','uv','t','i']):continue
 p=decode(source['p'],'<i2' if source.get('pScale') else '<f4').reshape(-1,3).astype(float)*source.get('pScale',1);n=decode(source['n'],'i1').reshape(-1,3)/127;uv=decode(source['uv'],'<f4').reshape(-1,2);t=decode(source['t'],'u1');tri=decode(source['i'],'<u2').reshape(-1,3)
 if len(tri)<300:continue
 lods=[{'level':0,'threshold':0,'asset':'rebuilt:'+name}];counts=[len(tri)]
 for level,divisor in [(1,24),(2,10)]:
  step=max(np.ptp(p,axis=0))/divisor
  # Preserve atlas slots, texture seams and sharp normal directions.
  keys=np.c_[np.rint(p/step),t,np.floor(uv*(8 if level==1 else 4)),np.argmax(np.abs(n),axis=1),np.sign(n[np.arange(len(n)),np.argmax(np.abs(n),axis=1)])]
  _,first,inverse=np.unique(keys,axis=0,return_index=True,return_inverse=True)
  positions=np.zeros((len(first),3));normals=np.zeros_like(positions);sizes=np.bincount(inverse)
  np.add.at(positions,inverse,p);positions/=sizes[:,None];np.add.at(normals,inverse,n);normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-9)
  indices=inverse[tri];keep=(indices[:,0]!=indices[:,1])&(indices[:,1]!=indices[:,2])&(indices[:,0]!=indices[:,2]);indices=indices[keep]
  area=np.cross(positions[indices[:,1]]-positions[indices[:,0]],positions[indices[:,2]]-positions[indices[:,0]])
  indices=indices[np.linalg.norm(area,axis=1)>1e-9];_,unique=np.unique(np.sort(indices,axis=1),axis=0,return_index=True);indices=indices[np.sort(unique)]
  if not len(indices) or len(indices)>=counts[-1]*.92:continue
  position_scale=max(float(np.max(np.abs(positions)))/32760,1e-6)
  mesh={**source,'p':encode(np.rint(positions/position_scale),'<i2'),'pScale':position_scale,'n':encode(np.rint(normals*127),'i1'),'uv':encode(uv[first],'<f4'),'t':encode(t[first],'u1'),'i':encode(indices,'<u2')}
  for key in ['c','f']:
   if key in source:mesh[key]=encode(decode(source[key],'u1').reshape(-1,3)[first],'u1')
  mesh.pop('lods',None);key=name+'_LOD'+str(level);world['models'][key]=mesh
  # Tile roofs retain LOD0 until their texture details are smaller on screen;
  # their structural silhouette and original collision bounds stay unchanged.
  start=55 if name.startswith('Roof_') else 35
  lods.append({'level':len(lods),'threshold':start if len(lods)==1 else start*2.3,'asset':'rebuilt:'+key});counts.append(len(indices))
 source['lods']=lods;report.append({'model':name,'triangles':counts,'lods':lods})
path.write_text('const REALM_MODELS='+json.dumps(world,separators=(',',':'))+';\n')
(ROOT/'client/assets/realms/scenery-lods.json').write_text(json.dumps({'method':'material/UV-aware vertex clustering','models':report},indent=2)+'\n')
print('Cooked scenery LODs:',len(report),'models;',sum(r['triangles'][0] for r in report),'near triangles ->',sum(r['triangles'][-1] for r in report),'far triangles')
