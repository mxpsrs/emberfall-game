"""Native importer contract tests, plus optional original source-pack corpus."""
import base64,copy,hashlib,json,pathlib,struct,subprocess,tempfile,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
EXE=ROOT/'native/build/asset-import'
def run(path,out,id='test:import',root=None,aliases=None):
 args=[str(EXE),str(path),str(out),id,str(root or path.parent)]
 if aliases:args.append(str(aliases))
 return subprocess.run(args,capture_output=True,text=True)
with tempfile.TemporaryDirectory(prefix='veldren-import-') as directory:
 tmp=pathlib.Path(directory);source=tmp/'source.gltf';output=tmp/'derived.json'
 geometry=struct.pack('<9f3H',0,0,0,2,0,0,0,3,0,0,1,2)
 doc={'asset':{'version':'2.0'},'buffers':[{'byteLength':len(geometry),'uri':'data:application/octet-stream;base64,'+base64.b64encode(geometry).decode()}], 'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':36},{'buffer':0,'byteOffset':36,'byteLength':6}], 'accessors':[{'bufferView':0,'componentType':5126,'type':'VEC3','count':3},{'bufferView':1,'componentType':5123,'type':'SCALAR','count':3}], 'meshes':[{'primitives':[{'attributes':{'POSITION':0},'indices':1}]}], 'nodes':[{'children':[1],'translation':[4,5,6]},{'mesh':0,'scale':[2,1,1]}], 'scenes':[{'nodes':[0]}]}
 def good(value=doc):
  source.write_text(json.dumps(value));r=run(source,output);assert r.returncode==0,r.stderr;return json.loads(output.read_text())
 def bad(value,reason):
  source.write_text(json.dumps(value));r=run(source,output);assert r.returncode!=0,reason;assert json.loads(r.stderr)['severity']=='fatal error'
 result=good();assert result['sourceHash']==hashlib.sha256(source.read_bytes()).hexdigest()
 assert result['bounds']==[[4,5,6],[8,8,6]] and result['nodes'][1]['parent']=='test:import/node/0'
 assert result['meshes'][0]['primitives'][0]['attributes']['NORMAL']['count']==3
 assert result['validation']['issues'][0]['code']=='generated-normals'
 broken=copy.deepcopy(doc);broken['bufferViews'][0]['byteLength']=35;bad(broken,'range')
 broken=copy.deepcopy(doc);broken['nodes'][1]['children']=[0];bad(broken,'cycle')
 broken=copy.deepcopy(doc);broken['meshes'][0]['primitives'][0]['material']=3;bad(broken,'material')
 broken=copy.deepcopy(doc);broken['buffers'][0]['uri']='missing.bin';bad(broken,'missing dependency')
 broken=copy.deepcopy(doc);broken['buffers'][0]['uri']='../escape.bin';bad(broken,'path traversal')
 broken=copy.deepcopy(doc);broken['materials']=[{'alphaMode':'INVALID'}];bad(broken,'alpha mode')
 broken=copy.deepcopy(doc);broken['accessors'][1]['componentType']=5126;bad(broken,'indices')
 broken=copy.deepcopy(doc);broken['accessors'][0]['count']=0;bad(broken,'empty geometry')
 broken=copy.deepcopy(doc);broken['extensionsRequired']=['KHR_draco_mesh_compression'];bad(broken,'unsupported required extension')
 # Sparse accessors with no base storage and interleaved original data.
 sparse=copy.deepcopy(doc);payload=bytes([0,1,2,0])+geometry
 sparse['buffers'][0]={'byteLength':len(payload),'uri':'data:application/octet-stream;base64,'+base64.b64encode(payload).decode()}
 sparse['bufferViews']=[{'buffer':0,'byteOffset':4,'byteLength':36},{'buffer':0,'byteOffset':40,'byteLength':6},{'buffer':0,'byteLength':3}]
 sparse['accessors'][0].pop('bufferView');sparse['accessors'][0]['sparse']={'count':3,'indices':{'bufferView':2,'componentType':5121},'values':{'bufferView':0}}
 assert good(sparse)['bounds']==result['bounds']
 # GLB chunks, valid header and explicit truncated payload rejection.
 raw=json.dumps(doc,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
 glb=tmp/'source.glb';glb.write_bytes(struct.pack('<5I',0x46546c67,2,20+len(raw),len(raw),0x4e4f534a)+raw)
 assert run(glb,output).returncode==0
 glb.write_bytes(glb.read_bytes()[:-1]);assert run(glb,output).returncode!=0
 # All checked-in original Veldren Kenney vegetation GLBs, not test cubes.
 report=[]
 sources=list((ROOT/'art/external/kenney-nature').glob('*.glb'))
 if len(sys.argv)>1:sources+=list(pathlib.Path(sys.argv[1]).rglob('*.gltf'))+list(pathlib.Path(sys.argv[1]).rglob('*.glb'))
 aliases=ROOT/'art/external/quaternius/uri-aliases.json'
 for source in sorted(sources):
  r=run(source,output,root=source.parent,aliases=aliases if aliases.exists() and 'universal-base-characters' in str(source) else None)
  assert r.returncode==0,f'{source}: {r.stderr}'
  model=json.loads(output.read_text());assert model['nodes'] and model['meshes'] and model['bounds']
  assert all(p['material'] for m in model['meshes'] for p in m['primitives'])
  report.append({'source':str(source.relative_to(ROOT)) if source.is_relative_to(ROOT) else str(source.relative_to(pathlib.Path(sys.argv[1]))),'hash':model['sourceHash'],'meshes':len(model['meshes']),'primitives':sum(len(m['primitives']) for m in model['meshes']),'nodes':len(model['nodes']),'skins':len(model['skeletons']),'clips':len(model['animations']),'issues':model['validation']['issues']})
 print(json.dumps({'contractTests':'passed','realAssets':len(report),'results':report},indent=2))
