"""Check a clean copy of recovered assets, without source archives or browser caches."""
import hashlib,json,shutil,struct,tempfile,xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import unquote,urlsplit
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];report={'scope':'Recovered asset dependency closure and content IDs, not a packaged native build','files':0,'models':0,'bytes':0,'images':0,'svg':0,'dependencies':[],'failures':[]}
with tempfile.TemporaryDirectory(prefix='veldren-clean-assets-') as temp:
 base=Path(temp)
 for name in ['models','authoring','textures','audio','ui','licenses']:shutil.copytree(ROOT/'assets'/name,base/'assets'/name)
 for p in sorted(base.rglob('*')):
  if not p.is_file():continue
  report['files']+=1;report['bytes']+=p.stat().st_size
  if p.suffix.lower() in ['.png','.jpg','.jpeg','.webp']:
   with Image.open(p) as image:image.load()
   report['images']+=1
  if p.suffix=='.svg':ET.parse(p);report['svg']+=1
  if p.suffix not in ['.glb','.gltf']:continue
  report['models']+=1;raw=p.read_bytes();g=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]]) if p.suffix=='.glb' else json.loads(raw)
  for resource in g.get('buffers',[])+g.get('images',[]):
   uri=resource.get('uri')
   if not uri or uri.startswith('data:'):continue
   target=(p.parent/unquote(uri)).resolve()
   if urlsplit(uri).scheme or not target.is_relative_to(base.resolve()) or not target.is_file():report['failures'].append({'model':p.relative_to(base).as_posix(),'dependency':uri});continue
   report['dependencies'].append({'model':p.relative_to(base).as_posix(),'path':target.relative_to(base).as_posix(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
ids=set()
for p in (ROOT/'migration/content/scenes').glob('*.json'):
 scene=json.loads(p.read_text())
 for entity in scene['entities']+scene['buildings']:
  if entity['id'] in ids:report['failures'].append({'duplicateEntity':entity['id']})
  ids.add(entity['id'])
linked=0
for p in (ROOT/'assets/models/static-world').glob('*.gltf'):
 for node in json.loads(p.read_text())['nodes']:
  key=node.get('extras',{}).get('veldrenEntityKey')
  if key:
   linked+=1
   if key not in ids:report['failures'].append({'unresolvedVisualIdentity':key})
report['gameplayEntities']=len(ids);report['linkedStaticEntities']=linked
(ROOT/'migration/reports/portable-assets.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='dependencies'}));raise SystemExit(bool(report['failures']))
