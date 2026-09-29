"""IO orchestration around the C++ texture processor; no image policy/decoding.

Each unique content/usage/profile is derived once. Original sources stay intact.
The explicit browser delivery list includes both browser profiles and excludes
only source/desktop variants that neither browser profile references.
"""
import hashlib,json,pathlib,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
DIST=ROOT/'dist';OUT=ROOT/'art/derived';OUT.mkdir(parents=True,exist_ok=True)
def digest(data):return hashlib.sha256(data).hexdigest()
def save(path,value):
    text=json.dumps(value,separators=(',',':'))+'\n'
    if not path.exists() or path.read_text()!=text:path.write_text(text)
registry=json.loads((DIST/'assets/canonical/registry.json').read_text())
images={r['id']:r for r in registry['records'] if r['type']=='texture'}
uses={};jobs={};source_bytes={}
processor=digest(b''.join((ROOT/name).read_bytes() for name in [
    'native/src/asset_texture.cpp','native/tools/texture_variants.cpp',
    'native/include/veldren/asset_profile.h','native/third_party/stb_image.h']))
for path in sorted({DIST/r['derivedPath'] for r in registry['records'] if r['type']=='model'}):
    model=json.loads(path.read_text())
    for material in model['materials']:
        for binding in material.values():
            if not isinstance(binding,dict) or 'image' not in binding:continue
            image=images[binding['image']]
            settings={'sourceHash':image['sourceHash'],'colorSpace':binding['colorSpace'],'role':binding['role'],
                'alphaCutoff':material.get('alphaCutoff',.5) if material.get('alphaMode')=='MASK' and binding['role']=='baseColor' else 0}
            for profile in ['browser-mobile','browser','desktop']:
                key=digest(json.dumps([processor,profile,settings],sort_keys=True,separators=(',',':')).encode())
                jobs[key]={'key':key,'sourcePath':image['derivedPath'],'profile':profile,'settings':settings}
                uses.setdefault(image['id'],{}).setdefault(profile,set()).add(key)
assert set(images)==set(uses),'Every canonical image needs an explicit material usage'
previous_path=OUT/'texture-variants.json'
previous=json.loads(previous_path.read_text()) if previous_path.exists() else {}
cached={entry['key']:entry for entry in previous.get('variants',[])}
pending=[];results={}
for key,job in sorted(jobs.items()):
    source=job['sourcePath']
    if source not in source_bytes:source_bytes[source]=(DIST/source).read_bytes()
    assert digest(source_bytes[source])==job['settings']['sourceHash'],'Source texture hash mismatch: '+source
    prior=cached.get(key);target=DIST/prior['derivedPath'] if prior else None
    if prior and target.is_file() and digest(target.read_bytes())==prior['derivedHash']:results[key]=prior
    else:pending.append(job)
if pending:
    subprocess.run(['make','-C',str(ROOT/'native'),'build/texture-variants'],check=True)
    scratch=ROOT/'.qa/texture-variants';scratch.mkdir(parents=True,exist_ok=True)
    request=scratch/'request.json';result=scratch/'result.json';save(request,pending)
    subprocess.run([str(ROOT/'native/build/texture-variants'),str(request),str(result),str(DIST)],check=True)
    results.update({entry['key']:entry for entry in json.loads(result.read_text())})
assert set(jobs)==set(results)
bindings={image:{profile:[results[key] for key in sorted(keys)] for profile,keys in profiles.items()} for image,profiles in sorted(uses.items())}
save(previous_path,{'format':'veldren.texture-variants','version':1,'processorHash':processor,'variants':[results[key] for key in sorted(results)],'bindings':bindings})
browser_paths=sorted({r['derivedPath'] for r in results.values() if r['profile']!='desktop'})
save(OUT/'browser-assets.json',{'format':'veldren.asset-delivery','version':1,'profiles':['browser-mobile','browser'],'canonicalImages':browser_paths})
print('Texture variants:',len(results),'unique outputs for',len(images),'stable image IDs;',len(pending),'rebuilt;',sum((DIST/p).stat().st_size for p in browser_paths),'browser image bytes')
