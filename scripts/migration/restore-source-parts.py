"""Reassemble authenticated Git transfer chunks; not a runtime asset format."""
import hashlib,json,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];folder=ROOT/'.migration-source-transfer'
if folder.exists():
 manifest=json.loads((folder/'manifest.json').read_text())
 for item in manifest:
  target=(ROOT/item['path']).resolve()
  if not target.is_relative_to((ROOT/'assets/source').resolve()):raise ValueError('Unexpected transfer destination')
  data=b''.join((ROOT/p['path']).read_bytes() for p in item['chunks'])
  actual=hashlib.sha1(('blob '+str(len(data))+'\0').encode()+data).hexdigest()
  if len(data)!=item['bytes'] or actual!=item['sha']:raise ValueError('Transfer checksum mismatch')
  target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 shutil.rmtree(folder)
 print('Reassembled and verified '+str(len(manifest))+' source files')
