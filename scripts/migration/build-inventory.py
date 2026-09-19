"""Machine-readable migration catalog and baseline dependency/history evidence."""
import hashlib,json,platform,re,struct,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];REPORTS=ROOT/'migration/reports'
def read(name):return json.loads((REPORTS/name).read_text()) if (REPORTS/name).exists() else {}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
source={}
for row in read('asset-inventory.json').get('assets',[]):source[row['path']]=row
for row in read('authoring-library.json').get('assets',[]):source[row['path']]=row
for row in read('kaykit-acquisition.json').get('assets',[]):source[row['path']]=row
for pack in read('source-recovery.json').get('packs',[]):
 for row in pack['files']:source[row['path']]={**row,'sourcePack':pack['id'],'archive':pack['archive'],'archiveSha256':pack['archiveSha256']}
validation={}
for report in ['gltf-validation.json','authoring-validation.json','original-validation.json','kaykit-validation.json']:
 for row in read(report).get('records',[]):validation[row['path']]=row
records=[]
for p in sorted((ROOT/'assets').rglob('*')):
 if not p.is_file():continue
 path=p.relative_to(ROOT).as_posix();origin=source.get(path,{})
 group=p.relative_to(ROOT/'assets').parts[0]
 row={'id':origin.get('id','veldren:file:'+path),'path':path,'bytes':p.stat().st_size,'sha256':sha(p),'role':group,'originEvidence':origin,'recoveryStatus':'local-file'}
 row['usage']='available-for-authoring' if group=='authoring' else 'editable-original-not-production' if group=='source' else 'provenance-not-production' if group=='licenses' else 'recovered-runtime-content'
 if 'kaykit-legacy-rigs' in path:row['usage']='legacy-reference-overridden-at-runtime'
 if 'equipment-authored-' in path:row['usage']='source-adaptation-before-current-fit'
 if 'appearance-presets' in path:row['usage']='representative-authoring-presets-not-all-customization-combinations'
 if 'kaykit' in path or origin.get('group')=='kaykit-adapted':row['licenseEvidence']=['assets/licenses/briarhaven-CREDITS.txt','dist/assets/briarhaven/dungeon-LICENSE.txt','dist/assets/briarhaven/town-LICENSE.txt','dist/assets/briarhaven/hero-LICENSE.txt']
 elif group in ['models','authoring','source']:row['licenseEvidence']=['assets/licenses/realms-CREDITS.txt','assets/licenses/realms-BESTIARY-LICENSE.txt','assets/licenses/realms-FANTASY-PROPS-LICENSE.txt','assets/licenses/realms-CH0SAN-provenance.json','migration/reports/source-recovery.json']
 elif group=='ui':row['licenseEvidence']=['assets/licenses/ui-CREDITS.txt','assets/licenses/ui-icons-manifest.json']
 elif group=='audio':row['licenseEvidence']=['assets/licenses/music-sources.json','assets/licenses/sound-sources.json']
 else:row['licenseEvidence']=[]
 if path in validation:
  v=validation[path];row.update(dependencies=v['dependencies'],validation={'errors':v['errors'],'warnings':v['warnings'],'report':'migration/reports/*validation.json'})
 if p.suffix in ['.gltf','.glb']:
  raw=p.read_bytes();g=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]]) if p.suffix=='.glb' else json.loads(raw)
  row.update(meshes=[m.get('name',str(i)) for i,m in enumerate(g.get('meshes',[]))],skins=[{'joints':len(s['joints']),'inverseBindMatrices':s.get('inverseBindMatrices')} for s in g.get('skins',[])],animations=[{'name':a.get('name'),'metadata':a.get('extras',{})} for a in g.get('animations',[])],morphTargetPrimitives=sum('targets' in pr for m in g.get('meshes',[]) for pr in m['primitives']))
 records.append(row)
(REPORTS/'library-inventory.json').write_text(json.dumps({'format':'Migration evidence, not a Vervesis asset registry','licensePolicy':'Referenced evidence is retained verbatim; do not infer all packs are CC0 or permission to distribute a standalone asset pack.','assets':records},indent=2)+'\n')
baseline='439dfaaea6e144ab9f2e8ab30304f9c34c1915b2';history=[]
for commit in subprocess.check_output(['git','rev-list',baseline],cwd=ROOT,text=True).splitlines():
 files=subprocess.check_output(['git','ls-tree','-r','--name-only',commit],cwd=ROOT,text=True).splitlines()
 history.append({'commit':commit,'originalModels':[p for p in files if re.search(r'\.(glb|gltf|fbx|obj|blend|unitypackage|tscn)$',p,re.I)],'archives':[p for p in files if re.search(r'\.(zip|rar|7z)$',p,re.I)]})
(REPORTS/'history-search.json').write_text(json.dumps({'baselineCommit':baseline,'commits':history},indent=2)+'\n')
files=subprocess.check_output(['git','ls-tree','-r','--name-only',baseline],cwd=ROOT,text=True).splitlines()
texts={p:(ROOT/p).read_text(errors='replace') for p in files if (ROOT/p).is_file() and Path(p).suffix in ['.js','.mjs','.cjs','.html','.css','.json','.py']}
audit=[]
for p in files:
 if not re.search(r'\.(png|webp|jpe?g|svg|mp3|ogg|wav|glb|gltf|fbx|obj|blend)$',p,re.I) and '/assets/' not in p:continue
 token=p.removeprefix('dist/')
 references=[name for name,text in texts.items() if name!=p and (token in text or Path(p).name in text)]
 audit.append({'path':p,'role':'documentation' if p.startswith('docs/') else 'editable-art' if p.startswith('art/') else 'baseline-resource','directTextReferences':references,'indirectReferences':'Inspect runtime capture/catalog, atlas mapping, SVG manifest and dynamic filename construction; a missing text match is not proof of obsolescence.','action':'preserved'})
(REPORTS/'baseline-assets.json').write_text(json.dumps({'baselineCommit':baseline,'assets':audit,'deletions':[]},indent=2)+'\n')
r=read('baseline-regression.json');selected=[x for x in r.get('results',[]) if x['test'].endswith(('.cjs','.mjs'))];excluded=[x for x in r.get('results',[]) if x not in selected]
if selected:(REPORTS/'regression-summary.json').write_text(json.dumps({'executedRunnableTests':len(selected),'passedInitially':sum(x['passed'] for x in selected),'failedInitially':[x for x in selected if not x['passed']],'nonRunnableFilesAccidentallySelected':excluded,'rechecks':['baseline-build-recheck.json','main-story-recheck.json'],'nativeRuntimeTestsExecuted':0},indent=2)+'\n')
(REPORTS/'environment.json').write_text(json.dumps({'os':platform.platform(),'architecture':platform.machine(),'python':platform.python_version(),'node':subprocess.check_output(['node','--version'],text=True).strip(),'hardware':'Container; no controlled GPU/Windows test machine available','nativeStartupMs':None,'nativeAssetLoadingMs':None,'nativeFrameTimeDistribution':None,'nativeMemoryOrCleanup':None,'renderWorkload39Actors':None,'hosted39AuthenticatedPlayers':None},indent=2)+'\n')
print(json.dumps({'assetFiles':len(records),'historyCommits':len(history),'baselineAssets':len(audit)}))
