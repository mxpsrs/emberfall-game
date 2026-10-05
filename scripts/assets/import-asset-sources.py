"""Platform IO around Veldren's canonical C++ importer; no geometry/material parsing.

Usage: python3 scripts/assets/import-asset-sources.py EXTRACTED_PACK_DIRECTORY
Input directories are the unmodified free Quaternius source distributions.
"""
import base64,hashlib,json,pathlib,subprocess,sys,tempfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
source_root=pathlib.Path(sys.argv[1]).resolve()
exe=ROOT/'native/build/asset-import';dist=ROOT/'client'
inputs=[]
for p in sorted((source_root/'medieval-village-megakit/glTF').glob('*.gltf')):inputs.append((p,'rebuilt:'+p.stem,None))
for sex in ['Male','Female']:
 p=source_root/'universal-base-characters/Base Characters/Godot - UE'/('Superhero_'+sex+'_FullBody.gltf')
 inputs.append((p,'avatar:'+sex.lower(),ROOT/'art/external/quaternius/uri-aliases.json'))
inputs.append((source_root/'universal-animation-library/Unreal-Godot/UAL1_Standard.glb','animation-library:ual1',None))
for p in sorted((ROOT/'art/external/kenney-nature').glob('*.glb')):inputs.append((p,'kenney:'+p.stem,None))
assert len([p for p,_,_ in inputs if p.suffix=='.gltf' and 'medieval' in str(p)])==176,'Complete Standard modular kit required'
records=[];provenance=[]
with tempfile.TemporaryDirectory(prefix='veldren-derived-') as directory:
 out=pathlib.Path(directory)/'model.json'
 for n,(source,id,aliases) in enumerate(inputs):
  args=[str(exe),str(source),str(out),id,str(source.parent)]
  if aliases:args.append(str(aliases))
  result=subprocess.run(args,capture_output=True,text=True)
  if result.returncode:raise RuntimeError(result.stderr)
  model=json.loads(out.read_text());definitions=model.pop('records')
  source_path=str(source.relative_to(ROOT)) if source.is_relative_to(ROOT) else 'sources/quaternius/'+str(source.relative_to(source_root))
  for record in definitions:record['sourcePath']=source_path
  byid={r['id']:r for r in definitions}
  for image in model['images']:
   path=byid[image['id']]['derivedPath'];data=base64.b64decode(image.pop('data'));assert hashlib.sha256(data).hexdigest()==image['sourceHash']
   target=client/path;target.parent.mkdir(parents=True,exist_ok=True)
   if not target.exists():target.write_bytes(data)
   image['derivedPath']=path
  target=client/byid[id]['derivedPath'];target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(model,separators=(',',':'))+'\n')
  records+=definitions
  provenance.append({'id':id,'sourcePath':source_path,'sourceHash':model['sourceHash'],'sourceDependencies':model['sourceDependencies'],'derivedPath':byid[id]['derivedPath'],'derivedHash':hashlib.sha256(target.read_bytes()).hexdigest()})
  print(f'{n+1}/{len(inputs)} {id}',flush=True)
manifest={'format':'veldren.assets','version':1,'records':sorted(records,key=lambda r:r['id'])}
(client/'assets/canonical/registry.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
(ROOT/'art/external/quaternius/import-manifest.json').write_text(json.dumps(provenance,indent=2)+'\n')
print('Imported',len(inputs),'source assets into',len(records),'canonical definitions')
