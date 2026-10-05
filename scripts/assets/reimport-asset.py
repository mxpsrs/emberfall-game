"""Reimport a stable model ID through the native importer and derived profiles.

The runtime manifest is the transaction's final atomic commit. Existing Scene
documents, player data and original source files are never modified. Immutable
new files can remain unreferenced after a failed import; the build allowlist
excludes them. Run from the project checkout, before the normal build.
"""
import argparse,base64,hashlib,json,os,pathlib,subprocess,tempfile
from urllib.parse import unquote
ROOT=pathlib.Path(__file__).resolve().parents[2]
DIST=ROOT/'client'
parser=argparse.ArgumentParser()
parser.add_argument('id');parser.add_argument('source',type=pathlib.Path)
parser.add_argument('--aliases',type=pathlib.Path)
args=parser.parse_args()
source=args.source.resolve();canonical=DIST/'assets/canonical/registry.json'
manifest=DIST/'assets/asset-registry.json'
if not source.is_file():raise SystemExit('Source file unavailable')
aliases=json.loads(args.aliases.read_text()) if args.aliases else {}
old=json.loads(canonical.read_text());by_id={r['id']:r for r in old['records']}
if args.id not in by_id or by_id[args.id]['type']!='model':raise SystemExit('Choose an existing canonical model ID')
subprocess.run(['make','-C',str(ROOT/'native'),'build/asset-import','build/asset-validate','build/texture-variants'],check=True)
lock=ROOT/'.qa/reimport.lock';lock.parent.mkdir(parents=True,exist_ok=True)
try:lock.mkdir()
except FileExistsError:raise SystemExit('Another reimport owns the asset transaction')
tracked=[canonical,manifest,ROOT/'art/derived/texture-variants.json',ROOT/'art/derived/browser-assets.json']
backups={p:p.read_bytes() if p.exists() else None for p in tracked}
def save(path,data):
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_name(path.name+'.tmp');tmp.write_bytes(data);os.replace(tmp,path)
def serialized(value):return (json.dumps(value,separators=(',',':'))+'\n').encode()
try:
 with tempfile.TemporaryDirectory(prefix='reimport-',dir=ROOT/'.qa') as temporary:
  tmp=pathlib.Path(temporary);output=tmp/'model.json'
  command=[str(ROOT/'native/build/asset-import'),str(source),str(output),args.id,str(source.parent)]
  if args.aliases:command.append(str(args.aliases.resolve()))
  subprocess.run(command,check=True)
  model=json.loads(output.read_text());definitions=model.pop('records')
  # Source provenance uses a content-addressed directory, not an operator's
  # absolute machine path. Dependencies have already passed native containment.
  provenance_key=hashlib.sha256(serialized({'source':model['sourceHash'],'dependencies':model['sourceDependencies']})).hexdigest()
  provenance=ROOT/'art/external/imports'/provenance_key
  save(provenance/source.name,source.read_bytes())
  for uri,expected in model['sourceDependencies'].items():
   relative=unquote(aliases.get(uri,uri))
   dependency=(source.parent/relative).resolve()
   if not dependency.is_relative_to(source.parent):raise ValueError('Source dependency escapes its root')
   data=dependency.read_bytes()
   if hashlib.sha256(data).hexdigest()!=expected:raise ValueError('Source changed during import')
   save(provenance/relative,data)
  if aliases:save(provenance/'uri-aliases.json',serialized(aliases))
  records={r['id']:r for r in definitions}
  for image in model['images']:
   data=base64.b64decode(image.pop('data'));assert hashlib.sha256(data).hexdigest()==image['sourceHash']
   path=records[image['id']]['derivedPath'];save(DIST/path,data);image['derivedPath']=path
  content=serialized(model);derived='assets/canonical/models/'+hashlib.sha256(content).hexdigest()+'.json'
  save(DIST/derived,content)
  for record in definitions:
   record['sourcePath']=(provenance/source.name).relative_to(ROOT).as_posix()
   if record['type']!='texture':record['derivedPath']=derived
  updated={r['id']:r for r in old['records'] if r['id']!=args.id and not r['id'].startswith(args.id+'/')}
  updated.update({r['id']:r for r in definitions})
  candidate={**old,'records':sorted(updated.values(),key=lambda r:r['id'])}
  save(output,serialized(candidate));subprocess.run([str(ROOT/'native/build/asset-validate'),str(output)],check=True)
  save(canonical,serialized(candidate))
  subprocess.run(['python3',str(ROOT/'scripts/assets/build-texture-variants.py')],check=True)
  merged=tmp/'registry.json'
  subprocess.run(['python3',str(ROOT/'scripts/assets/build-asset-registry.py'),'--output',str(merged)],check=True)
  subprocess.run([str(ROOT/'native/build/asset-validate'),str(merged)],check=True)
  save(manifest,merged.read_bytes())
  print(json.dumps({'id':args.id,'sourceHash':model['sourceHash'],'derivedPath':derived,'records':len(definitions),'status':'committed'}))
except BaseException:
 for path,data in backups.items():
  if data is None:path.unlink(missing_ok=True)
  else:save(path,data)
 raise
finally:
 lock.rmdir()
