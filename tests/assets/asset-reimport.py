"""Exercise a real import transaction in a disposable checkout, never live data."""
import base64,hashlib,json,pathlib,shutil,struct,subprocess,tempfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory(prefix='veldren-reimport-') as directory:
 root=pathlib.Path(directory)/'project'
 shutil.copytree(ROOT,root,ignore=shutil.ignore_patterns('.git','node_modules','.qa','.asset-cache','server','.qa-*.mjs'))
 canonical=root/'client/assets/canonical/registry.json';manifest=root/'client/assets/asset-registry.json'
 stable='rebuilt:Wall_Plaster_Straight'
 original={p:p.read_bytes() for p in [canonical,manifest,root/'art/derived/texture-variants.json',root/'art/derived/browser-assets.json']}
 source=pathlib.Path(directory)/'replacement.gltf';source.write_text('{broken')
 def run():return subprocess.run(['python3',str(root/'scripts/assets/reimport-asset.py'),stable,str(source)],capture_output=True,text=True)
 failed=run();assert failed.returncode!=0
 assert all(p.read_bytes()==data for p,data in original.items()),'A failed import must not publish any manifest'
 geometry=struct.pack('<9f3H',0,0,0,2,0,0,0,3,0,0,1,2)
 doc={'asset':{'version':'2.0'},'buffers':[{'byteLength':len(geometry),'uri':'geometry.bin'}],'bufferViews':[{'buffer':0,'byteLength':36},{'buffer':0,'byteOffset':36,'byteLength':6}],'accessors':[{'bufferView':0,'componentType':5126,'type':'VEC3','count':3},{'bufferView':1,'componentType':5123,'type':'SCALAR','count':3}],'meshes':[{'primitives':[{'attributes':{'POSITION':0},'indices':1}]}],'nodes':[{'mesh':0}],'scenes':[{'nodes':[0]}]}
 source.write_text(json.dumps(doc));(source.parent/'geometry.bin').write_bytes(geometry)
 success=run();assert success.returncode==0,success.stdout+success.stderr
 records={r['id']:r for r in json.loads(manifest.read_text())['records']};record=records[stable]
 assert record['sourceHash']==hashlib.sha256(source.read_bytes()).hexdigest()
 assert record['bounds']==[[0,0,0],[2,3,0]]
 model=json.loads((root/'client'/record['derivedPath']).read_text());assert model['id']==stable
 assert (root/record['sourcePath']).read_bytes()==source.read_bytes()
 assert (root/record['sourcePath']).with_name('geometry.bin').read_bytes()==geometry
 assert all(not r['id'].startswith(stable+'/') or r['importSettings']['importer']=='legacy-packed-v1' or r['id'] in {r['id'] for r in json.loads(canonical.read_text())['records']} for r in records.values())
 before={p:p.read_bytes() for p in original};again=run();assert again.returncode==0,again.stderr
 assert all(p.read_bytes()==data for p,data in before.items()),'Repeated import is deterministic'
 # Same glTF, changed external buffer: the dependency and immutable payload
 # address must change even though the top-level glTF source hash is unchanged.
 (source.parent/'geometry.bin').write_bytes(struct.pack('<9f3H',0,0,0,4,0,0,0,3,0,0,1,2))
 changed=run();assert changed.returncode==0,changed.stderr
 new=next(r for r in json.loads(manifest.read_text())['records'] if r['id']==stable)
 assert new['bounds']==[[0,0,0],[4,3,0]] and new['derivedPath']!=record['derivedPath'] and new['sourcePath']!=record['sourcePath']
 assert new['sourceHash']==record['sourceHash']
 assert not (root/'.qa/reimport.lock').exists()
 print('PASS: native reimport, failed transaction rollback, stable identity, source provenance, deterministic rebuild, external dependency change and immutable payloads.')
