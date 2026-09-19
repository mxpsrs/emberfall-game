"""Recover static world visuals as standard glTF, not an engine scene schema."""
import copy,hashlib,importlib.util,json
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('export_glb',Path(__file__).with_name('export-glb.py'));e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
capture=ROOT/'.qa/migration/static';index=json.loads((capture/'index.json').read_text())
parts_dir=ROOT/'assets/models/world-parts';parts_dir.mkdir(parents=True,exist_ok=True)
scene_dir=ROOT/'assets/models/static-world';scene_dir.mkdir(parents=True,exist_ok=True)
images={i:{'alpha':Image.open(ROOT/f'assets/textures/atlas/tile-{i:02}.png').convert('RGBA').getextrema()[3][0]<255} for i in range(64)}
parts={};defects=[];used=set()
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def part(key):
 if key in parts:return parts[key]
 m=e.decode(json.loads((capture/'meshes'/f'{key}.json').read_text()))
 if 'packed' in m:
  a=np.asarray(m['packed']).reshape(-1,12);m={'p':a[:,:3].ravel(),'n':a[:,3:6].ravel(),'c':a[:,6:9].ravel(),'f':a[:,6:9].ravel(),'t':a[:,9].astype('u1'),'uv':a[:,10:12].ravel(),'i':np.arange(len(a),dtype='<u4')}
 p=np.asarray(m['p']).reshape(-1,3);tri=np.asarray(m['i']).reshape(-1,3);valid=np.isfinite(p).all(axis=1)
 if not valid.all():
  good=valid[tri].all(axis=1);defects.append({'part':key,'nonfiniteVertices':int((~valid).sum()),'removedTriangles':int((~good).sum()),'policy':'Reject invalid source triangles only; report affected source entity. Not recovered geometry.'})
  tri=tri[good];keep=np.unique(tri);remap=np.zeros(len(p),dtype='<u4');remap[keep]=np.arange(len(keep))
  for k,width in [('p',3),('n',3),('c',3),('f',3),('t',1),('uv',2)]:
   if k in m:m[k]=np.asarray(m[k]).reshape(-1,width)[keep].ravel()
  m['i']=remap[tri].ravel()
 if not len(m['i']):parts[key]=None;return None
 g=e.GLB({'id':'veldren:world-part:'+key},images);g.mesh(key,m);g.g['buffers']=[{'uri':key+'.bin','byteLength':len(g.binary)}]
 bp=parts_dir/(key+'.bin');jp=parts_dir/(key+'.gltf');bp.write_bytes(g.binary);jp.write_text(json.dumps(e.plain(g.g),separators=(',',':'),allow_nan=False)+'\n')
 result={'g':g.g,'record':{'id':'veldren:world-part:'+key,'path':jp.relative_to(ROOT).as_posix(),'sha256':sha(jp),'bufferSha256':sha(bp),'dependencies':[bp.relative_to(ROOT).as_posix(),*sorted(g.dependencies)]}}
 parts[key]=result;return result
records=[]
for region_info in index['regions']:
 region=json.loads((capture/(region_info['id']+'.json')).read_text());g={'asset':{'version':'2.0','generator':'Veldren static world recovery'},'scene':0,'scenes':[{'nodes':[]}],'extras':{'sourceScene':region['scene'],'notVervesisScene':True,'gameplayIdentityExternal':True,'limitations':['Terrain stored separately.','Dynamic actors, fires, gates, crops, fish, effects and ground cover are not baked.','Roofs are closed; browser procedural materials require native support.']}}
 for k in ['nodes','buffers','bufferViews','accessors','meshes','materials','images','textures','samplers']:g[k]=[]
 mapped={}
 for entity in region['entities']:
  parent=len(g['nodes']);g['scenes'][0]['nodes'].append(parent);g['nodes'].append({'name':entity['name'],'children':[],'extras':{'veldrenEntityKey':entity['id']}})
  for ref in entity['parts']:
   key=ref['mesh'];data=part(key)
   if data is None:continue
   used.add(key)
   if key not in mapped:
    a=copy.deepcopy(data['g']);offset={k:len(g[k]) for k in g if isinstance(g[k],list)}
    a['buffers'][0]['uri']='../world-parts/'+key+'.bin'
    for v in a['bufferViews']:v['buffer']+=offset['buffers']
    for v in a['accessors']:v['bufferView']+=offset['bufferViews']
    for v in a.get('textures',[]):v['source']+=offset['images'];v['sampler']+=offset['samplers']
    for v in a['materials']:
     tex=v['pbrMetallicRoughness'].get('baseColorTexture')
     if tex:tex['index']+=offset['textures']
    for mesh in a['meshes']:
     for prim in mesh['primitives']:
      prim['attributes']={k:v+offset['accessors'] for k,v in prim['attributes'].items()};prim['indices']+=offset['accessors'];prim['material']+=offset['materials']
    for k in ['buffers','bufferViews','accessors','meshes','materials','images','textures','samplers']:g[k].extend(a.get(k,[]))
    mapped[key]=list(range(offset['meshes'],len(g['meshes'])))
   for mesh in mapped[key]:
    node=len(g['nodes']);g['nodes'][parent]['children'].append(node);g['nodes'].append({'mesh':mesh,'matrix':e.affine(ref['transform'])[0].T.ravel().tolist()})
 path=scene_dir/(region['id']+'.gltf');path.write_text(json.dumps(g,separators=(',',':'),allow_nan=False)+'\n')
 records.append({'id':'veldren:static-world:'+region['id'],'sourceScene':region['scene'],'path':path.relative_to(ROOT).as_posix(),'sha256':sha(path),'entities':len(region['entities']),'instances':sum('mesh' in n for n in g['nodes'])})
for p in parts_dir.iterdir():
 if p.suffix in ['.bin','.gltf'] and p.stem not in used:p.unlink()
report={'format':'Standard glTF static visual evidence; not a playable Vervesis project','assets':records,'parts':[parts[k]['record'] for k in sorted(used)],'captureFailures':index['failures'],'sourceGeometryDefects':defects,'nativeRuntimeVerified':False}
(ROOT/'migration/reports/static-world.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'regions':len(records),'entities':sum(r['entities'] for r in records),'parts':len(used),'sourceGeometryDefects':defects,'failures':index['failures']}))
