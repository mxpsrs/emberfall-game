"""Prepare only the two known Veldren nature packs; retain original files unchanged."""
import copy,hashlib,importlib.util,json,shutil,struct
from pathlib import Path
from urllib.parse import unquote
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];spec=importlib.util.spec_from_file_location('glb',Path(__file__).with_name('export-glb.py'));e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
records=[]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def texture(p,pack):
 target=ROOT/'assets/textures'/pack/p.name;target.parent.mkdir(parents=True,exist_ok=True)
 if target.exists() and digest(target)!=digest(p):raise ValueError('Texture basename collision '+str(p))
 shutil.copyfile(p,target);return '../../textures/'+pack+'/'+p.name
for source in sorted((ROOT/'assets/source/stylized-nature').rglob('*.gltf')):
 g=json.loads(source.read_text());raw=bytearray((source.parent/unquote(g['buffers'][0]['uri'])).read_bytes());changes=[]
 def access(index):
  a=g['accessors'][index];v=g['bufferViews'][a['bufferView']];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
  return np.ndarray((a['count'],width),dtype='<f4',buffer=raw,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',width*4),4))
 # Clamp illegal COLOR_0 data for standard glTF but preserve every original sample.
 seen={}
 for mesh in g['meshes']:
  for primitive in mesh['primitives']:
   idx=primitive['attributes'].get('COLOR_0')
   if idx is None:continue
   if idx in seen:primitive['attributes']['_SOURCE_COLOR_0']=seen[idx];continue
   a=g['accessors'][idx]
   if a['componentType']!=5126:continue
   old=access(idx).copy();clamped=np.clip(old,0,1)
   if not np.array_equal(old,clamped):
    access(idx)[:]=clamped;raw.extend(b'\0'*(-len(raw)%4));offset=len(raw);raw.extend(old.astype('<f4').tobytes())
    g['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':old.nbytes,'target':34962});extra=copy.deepcopy(a);extra.update(bufferView=len(g['bufferViews'])-1,byteOffset=0);extra.pop('min',None);extra.pop('max',None);g['accessors'].append(extra);seen[idx]=len(g['accessors'])-1;primitive['attributes']['_SOURCE_COLOR_0']=seen[idx];changes.append({'accessor':idx,'policy':'Clamp standard COLOR_0; original values in _SOURCE_COLOR_0'})
   # Recompute authored bounds where the source exporter rounded them incorrectly.
   if 'min'in a:a['min']=clamped.min(axis=0).tolist()
   if 'max'in a:a['max']=clamped.max(axis=0).tolist()
 for mesh in g['meshes']:
  for p in mesh['primitives']:
   a=g['accessors'][p['attributes']['POSITION']];data=access(p['attributes']['POSITION']);a['min']=data.min(0).tolist();a['max']=data.max(0).tolist()
 for im in g.get('images',[]):im['uri']=texture(source.parent/unquote(im['uri']),'stylized-nature')
 g['buffers']=[{'byteLength':len(raw)}];g.setdefault('extras',{}).update(sourcePath=source.relative_to(ROOT).as_posix(),sourceSha256=digest(source),repairLog=changes)
 writer=e.GLB({'id':'veldren:authoring:nature:'+source.stem},{});writer.g=g;writer.binary=raw;target=ROOT/'assets/authoring/stylized-nature'/(source.stem+'.glb');writer.write(target)
 records.append({'path':target.relative_to(ROOT).as_posix(),'source':source.relative_to(ROOT).as_posix(),'sha256':digest(target),'repairs':changes,'usage':'Available for authoring; not all placed at runtime'})
tree_base=ROOT/'assets/source/textured-trees/Textured Stylized Trees - May 2020'
for source in sorted(tree_base.rglob('*.obj')):
 positions=[];normals=[];uvs=[];groups={};material=''
 for line in source.read_text().splitlines():
  words=line.split()
  if not words:continue
  if words[0]=='v':positions.append([float(x) for x in words[1:4]])
  elif words[0]=='vn':normals.append([float(x) for x in words[1:4]])
  elif words[0]=='vt':uvs.append([float(x) for x in words[1:3]])
  elif words[0]=='usemtl':material=words[1]
  elif words[0]=='f':
   face=[tuple(int(x) for x in v.split('/')) for v in words[1:]]
   for i in range(1,len(face)-1):groups.setdefault(material,[]).append([face[0],face[i],face[i+1]])
 g=e.GLB({'id':'veldren:authoring:tree:'+source.stem},{})
 for name,faces in groups.items():
  # The original MTL omits map_Kd. Follow Veldren's existing pack-specific importer.
  filename=('Pine_Leaves.png' if 'Pine' in name else 'Birch_Leaves_Green.png' if 'Birch' in name else 'Tree_Leaves.png') if 'Leaves' in name else 'Birch_Bark.png' if 'Birch' in name else 'Tree_Bark.jpg'
  tex=tree_base/'Textures'/filename;uri=texture(tex,'trees');image=Image.open(tex).convert('RGBA');index=len(g.g.setdefault('images',[]));g.g['images'].append({'uri':uri});g.g.setdefault('textures',[]).append({'source':index,'sampler':0});g.g['samplers']=[{'wrapS':10497,'wrapT':10497}]
  mat={'name':name,'pbrMetallicRoughness':{'baseColorTexture':{'index':index},'metallicFactor':0,'roughnessFactor':1},'doubleSided':True}
  if image.getextrema()[3][0]<255:mat.update(alphaMode='MASK',alphaCutoff=.45)
  mat_id=len(g.g['materials']);g.g['materials'].append(mat);g.material=lambda _,i=mat_id:i
  lookup={};p=[];n=[];uv=[];indices=[]
  for face in faces:
   for key in face:
    if key not in lookup:
     vi,ti,ni=key;lookup[key]=len(p);p.append(positions[vi-1]);n.append(normals[ni-1]);u,v=uvs[ti-1];uv.append([u,1-v])
    indices.append(lookup[key])
  g.mesh(name,{'p':np.array(p),'n':np.array(n),'uv':np.array(uv),'c':np.ones((len(p),3)),'t':np.ones(len(p)),'i':np.array(indices)})
 g.g['extras'].update(sourcePath=source.relative_to(ROOT).as_posix(),sourceSha256=digest(source),materialBindingEvidence='scripts/import-tree-species.py; source MTL has no texture paths',axisConversion='Preserve OBJ positions; flip V for glTF texture coordinates')
 target=ROOT/'assets/authoring/textured-trees'/(source.stem+'.glb');g.write(target);records.append({'path':target.relative_to(ROOT).as_posix(),'source':source.relative_to(ROOT).as_posix(),'sha256':digest(target),'usage':'Available for authoring; production adaptations remain separate'})
(ROOT/'migration/reports/authoring-library.json').write_text(json.dumps({'assets':records},indent=2)+'\n');print('Prepared '+str(len(records))+' individual authoring models')
