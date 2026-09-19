"""Acquire exactly the legitimate pinned originals named in Veldren's importer."""
import ast,hashlib,json,struct,urllib.request
from pathlib import Path,PurePosixPath
from urllib.parse import quote,unquote,urlsplit
ROOT=Path(__file__).resolve().parents[2]
tree=ast.parse((ROOT/'scripts/import-briarhaven-assets.py').read_text());defs={}
for node in tree.body:
 if isinstance(node,ast.Assign):
  for target in node.targets:
   if isinstance(target,ast.Name) and target.id in ['SOURCES','static','interior']:defs[target.id]=ast.literal_eval(node.value)
records=[];done=set()
def fetch(kind,relative):
 relative=PurePosixPath(relative).as_posix()
 if relative.startswith('/') or '..' in PurePosixPath(relative).parts:raise ValueError(relative)
 repo,commit,prefix=defs['SOURCES'][kind];key=kind+'/'+relative;p=ROOT/'assets/source/kaykit'/key
 if key in done:return p
 url='https://raw.githubusercontent.com/KayKit-Game-Assets/'+repo+'/'+commit+'/'+quote(prefix+'/'+relative)
 if not p.exists():
  data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Veldren-source-recovery'}),timeout=90).read();p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
 raw=p.read_bytes();done.add(key);records.append({'path':p.relative_to(ROOT).as_posix(),'url':url,'sourceCommit':commit,'sha256':hashlib.sha256(raw).hexdigest(),'license':'CC0-1.0; pinned LICENSE.txt retained'})
 if p.suffix in ['.gltf','.glb']:
  g=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]]) if p.suffix=='.glb' else json.loads(raw)
  for dep in g.get('buffers',[])+g.get('images',[]):
   uri=dep.get('uri')
   if not uri or uri.startswith('data:'):continue
   if urlsplit(uri).scheme:raise ValueError('Unexpected external dependency '+uri)
   fetch(kind,str(PurePosixPath(relative).parent/unquote(uri)))
 return p
for name in defs['static'].values():fetch('town','Assets/gltf/'+name+'.gltf')
for name in defs['interior'].values():fetch('dungeon','gltf/'+name)
for name in ['Rogue','Knight','Mage','Barbarian']:fetch('hero','Characters/gltf/'+name+'.glb')
for kind in defs['SOURCES']:fetch(kind,'LICENSE.txt')
(ROOT/'migration/reports/kaykit-acquisition.json').write_text(json.dumps({'assets':records},indent=2)+'\n');print('Acquired '+str(len(records))+' pinned KayKit files')
