from pathlib import Path
import json,html,hashlib,subprocess
root=Path('.')
chunks=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Veldren · Credits</title><style>body{max-width:850px;margin:3rem auto;padding:0 1rem;background:#142328;color:#eee5d4;font:17px/1.6 system-ui}a{color:#91dfdf}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}h1,h2{color:#edc67d}</style><h1>Veldren · Art, music and sound</h1><p>Thank you to the artists whose work helps bring Veldren to life. Models, textures, animations and sounds have been adapted for the game. Credit does not imply endorsement.</p><p><a href="play">Return to Veldren</a></p>']
for title,file in [('Models, creatures and equipment','client/assets/realms/CREDITS.txt'),('KayKit environment and characters','client/assets/briarhaven/CREDITS.txt'),('Interface icons','client/assets/ui/CREDITS.txt')]:
 text=html.escape(Path(file).read_text())
 import re
 text=re.sub(r'https?://[^\s<>]+',lambda m:'<a href="'+m[0]+'">'+m[0]+'</a>',text)
 chunks+=['<h2>'+title+'</h2><pre>'+text+'</pre>']
chunks+=['<h2>Music</h2>']
for t in json.loads(Path('docs/music-sources.json').read_text())['tracks']:
 chunks+=['<p><b>'+html.escape(t['title'])+'</b> — '+html.escape(t['author'])+' · <a href="'+t['source']+'">Source</a> · <a href="'+t['license_url']+'">'+t['license']+'</a>. Adapted: normalized and encoded for in-game playback.</p>']
chunks+=['<h2>Sound</h2><p>Recorded foley by Kenney: <a href="https://kenney.nl/assets/rpg-audio">RPG Audio</a> and <a href="https://kenney.nl/assets/impact-sounds">Impact Sounds</a>, <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>. Clips normalized, shortened and encoded for the game. Additional procedural effects are implemented in Veldren’s audio code.</p></html>']
Path('client/credits.html').write_text('\n'.join(chunks))
files=[f for f in subprocess.check_output(['git','ls-files'],text=True).splitlines() if f.startswith('client/assets/') or Path(f).suffix.lower() in ('.png','.jpg','.jpeg','.webp','.svg','.mp3','.wav','.ogg','.glb','.gltf','.fbx','.blend','.ttf','.woff','.woff2')]
records=[]
for f in files:
 b=Path(f).read_bytes(); group='Legacy sprites / provenance review'
 if not f.startswith('client/'):group='Development/reference image; trace in adjacent docs; not runtime clearance'
 if f.startswith('art/ui-icons/'):group='game-icons.net CC BY 3.0 source icons / client/assets/ui/CREDITS.txt'
 if '/audio/sfx/' in f:group='Kenney CC0 / docs/sound-sources.json'
 elif '/audio/' in f:group='Music / docs/music-sources.json'
 elif '/briarhaven/' in f:group='KayKit CC0 / bundled license files'
 elif '/ui/' in f:group='game-icons.net CC BY 3.0 / attribution required'
 elif '/realms/' in f:group='Mixed model packs / assets/realms/CREDITS.txt and audit pack table'
 records.append(dict(path=f,bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),evidence=group))
Path('docs/asset-inventory-phase3.json').write_text(json.dumps({'date':'2026-09-17','note':'Inventory hashes verify bytes, not ownership. Mixed bundles must be read with ASSET-AUDIT-PHASE-3.md. Unknown sources are not clearance.','files':records},indent=2)+'\n')
