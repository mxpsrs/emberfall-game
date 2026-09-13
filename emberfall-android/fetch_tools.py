#!/usr/bin/env python3
from pathlib import Path
import base64, hashlib, json, urllib.request
root=Path(__file__).resolve().parent
out=root/'.android-tools';out.mkdir(exist_ok=True)
for name,spec in json.loads((root/'tools.json').read_text()).items():
    path=out/name
    if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest()==spec['sha256']:
        print(name+': verified cached copy');continue
    with urllib.request.urlopen(spec['url'],timeout=120) as response:data=response.read()
    if spec['base64']:data=base64.b64decode(data,validate=True)
    if hashlib.sha256(data).hexdigest()!=spec['sha256']:
        raise RuntimeError(name+': unexpected bytes; download incomplete or upstream version changed')
    path.write_bytes(data)
    if name=='aapt2':path.chmod(0o755)
    print(name+': downloaded and verified')
