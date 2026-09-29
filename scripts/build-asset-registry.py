"""Extract existing derived assets into the native registry's input manifest.

This is a build-time compatibility exporter, not an engine registry or GLTF
importer. C++ validates/owns definitions, dependencies, revisions and leases.
"""
import hashlib,json,pathlib,struct
ROOT=pathlib.Path(__file__).resolve().parents[1]
records=[]
def digest(value):return hashlib.sha256(value if isinstance(value,bytes) else json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def record(id,type,name,source,payload,deps=(),**extra):
 result=dict(id=id,type=type,name=name,sourcePath=source,derivedPath=source.removeprefix('dist/'),sourceHash=digest(payload),importSettings={'importer':'legacy-packed-v1'},dependencies=list(deps),validation={'state':'legacy-metadata','issues':[{'severity':'warning','message':'Packed compatibility asset; canonical source import pending'}]},variants={},**extra);records.append(result);return result

def load(path):
 text=(ROOT/path).read_text();return json.loads(text.split('=',1)[1].rstrip(';\n'))
def mesh(id,m,source,rig=None):
 deps=['material:legacy-atlas' if m.get('uv') else 'material:legacy-vertex-color']
 if rig:deps.append(rig)
 record(id+'/mesh','mesh',id.rsplit(':',1)[-1],source,m,deps,bounds=m['bounds'],legacy={'encoding':'packed-v1'},geometryHash=digest({k:v for k,v in m.items() if k in ['p','n','uv','i','j','w','t','c','f','pScale']}))
 record(id+'/collision','collision',id+' collision bounds',source,m['bounds'],[id+'/mesh'],bounds=m['bounds'],shape='aabb')
 return [id+'/mesh',id+'/collision']
def model(id,m,source,**extra):
 deps=mesh(id,m,source);record(id,'model',id.split(':',1)[1].replace('_',' '),source,m,deps,bounds=m['bounds'],**extra)
def rigged(id,a,source,meshkey='mesh'):
 rig=id+'/skeleton';definition=a.get('rig',{'joints':a.get('joints')});record(rig,'skeleton',id+' skeleton',source,definition)
 deps=[]
 if meshkey in a:deps+=mesh(id,a[meshkey],source,rig)
 for name,m in a.get('meshes',{}).items():deps+=mesh(id+'/'+name,m,source,rig)
 deps.append(rig)
 for name,clip in a.get('clips',{}).items():
  key=id+'/animation/'+name;record(key,'animation',name,source,clip,[rig],duration=clip.get('duration',clip.get('frames',0)/max(1,clip.get('fps',30))),clip=name);deps.append(key)
 extra={'bounds':a[meshkey]['bounds']} if meshkey in a else {}
 record(id,'model',id.split(':',1)[1],source,a,deps,legacy={'source':id.split(':')[0],'key':id.split(':',1)[1]},**extra)
for path in sorted((ROOT/'dist/assets/realms').glob('*.png')):
 raw=path.read_bytes();width,height=struct.unpack('>II',raw[16:24]);record('texture:'+path.stem,'texture',path.stem,str(path.relative_to(ROOT)),raw,width=width,height=height)
record('material:legacy-atlas','material','Legacy world atlas','dist/assets/realms/atlas-filament.png',{'encoding':'legacy-tile-v1'},['texture:atlas-filament'],baseColorTexture='texture:atlas-filament')
record('material:legacy-vertex-color','material','Legacy vertex color','dist/assets/briarhaven/models.js',{'vertexColor':True})
for prefix,path in [('briar','dist/assets/briarhaven/models.js'),('rebuilt','dist/assets/realms/models.js')]:
 data=load(path)
 for key,m in data['models'].items():model(prefix+':'+key,m,path,legacy={'source':prefix,'key':key})
 for key,a in data.get('rigs',{}).items():rigged('rig:'+key,a,path)
 for key,a in data.get('avatars',{}).items():rigged('avatar:'+key,a,path)
creatures={}
for path in ['dist/assets/realms/monsters.js','dist/assets/realms/approved-creatures.js']:
 for key,a in load(path).items():creatures[key]=(a,path)
for key,(a,path) in creatures.items():rigged('creature:'+key,a,path)
for path in sorted((ROOT/'dist/assets/audio').rglob('*.mp3')):
 record('audio:'+path.relative_to(ROOT/'dist/assets/audio').as_posix().removesuffix('.mp3'),'audio',path.stem,str(path.relative_to(ROOT)),path.read_bytes(),codec='mpeg',bytes=path.stat().st_size)
record('prefab:table','prefab','Dining table','dist/assets/briarhaven/models.js',{'model':'briar:table'},['briar:table'],components={'MeshRenderer':{'asset':'briar:table'}})
canonical=ROOT/'dist/assets/canonical/registry.json'
by_id={r['id']:r for r in records}
if canonical.exists():
 for definition in json.loads(canonical.read_text())['records']:by_id[definition['id']]=definition
records=list(by_id.values())
variant_path=ROOT/'art/derived/texture-variants.json'
if variant_path.exists():
 for id,variants in json.loads(variant_path.read_text())['bindings'].items():
  if id not in by_id:raise ValueError('Texture variants reference an unknown asset: '+id)
  by_id[id]['variants']=variants
manifest={'format':'veldren.assets','version':1,'records':sorted(records,key=lambda r:r['id'])}
import argparse,os
parser=argparse.ArgumentParser();parser.add_argument('--output',type=pathlib.Path)
output=parser.parse_args().output or ROOT/'dist/assets/asset-registry.json'
temporary=output.with_name(output.name+'.tmp');temporary.write_text(json.dumps(manifest,separators=(',',':'))+'\n');os.replace(temporary,output)
print('Exported',len(records),'native asset records from existing Veldren assets.')
