"""Recover Veldren's verified source models without importing engine scenes."""
import argparse,hashlib,json,shutil,zipfile
from pathlib import Path,PurePosixPath
from urllib.parse import unquote,urlsplit
ROOT=Path(__file__).resolve().parents[2]
PACKS={
 'universal-base':('Universal Base Characters[Standard].zip','fdbf1804c90dfc1ea03e992bff7da2dfd1a79318e13270a660180f9308455f40'),
 'universal-animation':('Universal Animation Library[Standard].zip','cc73fc4e495b82958207316596317a3f40b9fa38065bde1027937452da537724'),
 'stylized-nature':('Stylized Nature MegaKit[Standard].zip','298f6732b872e4cf7b30e6e7abf9641c7f6dc6b326df37ac089533ed7e3d58c9'),
 'textured-trees':('Textured Stylized Trees - May 2020.zip','91d0bc6d2177929124d65a81a6f4506f2c27d12f499ee9547c354e4c31d11bbe'),
 'insectoid':('insectoid-monster-rig.zip','993e85f686fe3013a3e52870d30d7d90bd064fb4c7d196c323200e902c38a8f3'),
 'prowler-dragon':('prowler-dragon-variant-rig.zip','f4cf40c3b55cdffcd8d01a019d3f7c2bbc54ae1837ff806333b3114bdc63fa14'),
 'medieval-village':('Medieval Village MegaKit[Standard].zip','e60dea67c10f30dccccfbff92a7933f5ea5cfe99be0e2a0fa5118cceabeec5c4'),
 'fantasy-props':('Fantasy Props MegaKit[Standard].zip','8b6f7e806d222e585478f0e1bdc6b271bbc7bc6f84dd6af8ca703a7c64f0cb1e'),
 'fantasy-outfits':('Modular Character Outfits - Fantasy[Standard].zip','c3468b18871cc8c8f05ab14df7712baf22cb9f389cbd870babf130e595187f70'),
 'universal-animation-2':('Universal Animation Library 2[Standard].zip','4008ea208a604773a2b2177d965f0f5d3195498b5bf838c3f5785d68e95f2a68'),
 'bestiary':('Bestiary - Dungeon Monsters Kit[Standard].zip','94dbeed196b6ead9776c2ed0cfa02de818730886a25a507fb9d6c379bbbc4645'),
 'human-archer':('Human Archer Animations FREE Godot-Unreal.zip','87565026f3a3b0aa8aeaadbcc155533ee58d927f5c443a6b2a11f396a461c904')}
DIRECT_FILES={
 'modular-warrior':(
  ('ModularWarior1.glb','4de1a15b2637e614ea70ebe6fcb2d3d738360bd6beb338fbae2c289920735ff1'),
  ('Modular_Warrior.fbx','77baf2685b258ad3caee589e62b0d31792202e886624dafa145c04978761b846'))}
TREANT=('Treant Package.7z','1fcddcbd1fbbc8ec84f6001b2192d22794a927c9be2a929457a537e908862cd8')
PORTABLE_EXTENSIONS={'.gltf','.glb','.bin','.png','.jpg','.jpeg','.txt','.md','.blend'}
def sha(p):
 digest=hashlib.sha256()
 with p.open('rb') as source:
  for block in iter(lambda:source.read(1024*1024),b''):digest.update(block)
 return digest.hexdigest()
def safe(base,name):
 p=PurePosixPath(name.replace('\\','/'))
 if p.is_absolute() or '..' in p.parts:raise ValueError('Unsafe archive path '+name)
 out=base.joinpath(*p.parts);out.parent.mkdir(parents=True,exist_ok=True);return out
def main():
 ap=argparse.ArgumentParser();ap.add_argument('directories',nargs='+',type=Path);args=ap.parse_args();report={'packs':[],'missing':[],'repairs':[],'partialArchives':[],'licensePolicy':'Keep supplied license/credit evidence. Possession alone does not prove redistribution rights. See licenses and handoff.'}
 def locate(name):
  candidates=[]
  for directory in args.directories:
   direct=directory/name
   if direct.is_file():candidates.append(direct)
   if directory.is_dir():candidates.extend(path for path in directory.rglob('*') if path.is_file() and path.name==name)
  unique=sorted({path.resolve() for path in candidates})
  if not unique:return None
  if len({sha(path) for path in unique})!=1:raise ValueError('Ambiguous archives with different bytes '+name)
  return unique[0]
 for pack,(name,digest) in PACKS.items():
  source=locate(name)
  base=ROOT/'assets/source'/pack
  if not source:
   existing=sorted(path for path in base.rglob('*') if path.is_file()) if base.is_dir() else []
   if existing:
    report['packs'].append({'id':pack,'archive':name,'archiveSha256':digest,'recovery':'Retained previously verified local extraction; archive was not supplied to this run.','files':[{'path':path.relative_to(ROOT).as_posix(),'sha256':sha(path),'bytes':path.stat().st_size} for path in existing],'usage':'Original editable source / available for authoring; production uses adapted assets/models.'})
   else:report['missing'].append(name)
   continue
  if sha(source)!=digest:raise ValueError('Archive checksum mismatch '+name)
  files=[];members=[]
  with zipfile.ZipFile(source) as z:
   for item in z.infolist():
    if item.is_dir():continue
    ext=Path(item.filename).suffix.lower();selected=ext in PORTABLE_EXTENSIONS or (pack=='textured-trees' and ext in ['.obj','.mtl']) or (pack=='human-archer' and ext in ['.fbx','.pdf','.zip'])
    members.append({'path':item.filename,'bytes':item.file_size,'crc32':format(item.CRC,'08x'),'selected':selected})
    if not selected:continue
    dest=safe(base,item.filename);dest.write_bytes(z.read(item));files.append({'path':dest.relative_to(ROOT).as_posix(),'sha256':sha(dest),'bytes':dest.stat().st_size})
  report['packs'].append({'id':pack,'archive':name,'archiveSha256':digest,'files':files,'archiveMembers':members,'usage':'Original editable source / available for authoring; production uses adapted assets/models.'})
 for pack,entries in DIRECT_FILES.items():
  base=ROOT/'assets/source'/pack;files=[]
  for name,digest in entries:
   source=locate(name)
   if not source:report['missing'].append(name);continue
   if sha(source)!=digest:raise ValueError('Source checksum mismatch '+name)
   target=base/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
   files.append({'path':target.relative_to(ROOT).as_posix(),'sha256':sha(target),'bytes':target.stat().st_size})
  if files:report['packs'].append({'id':pack,'archive':None,'archiveSha256':None,'sourceFiles':[name for name,_ in entries],'files':files,'usage':'Verified publisher-direct original source / available for authoring; production uses adapted assets/models.'})
 treant_name,treant_digest=TREANT;treant=locate(treant_name)
 if not treant:report['missing'].append(treant_name)
 else:
  if sha(treant)!=treant_digest:raise ValueError('Archive checksum mismatch '+treant_name)
  import libarchive
  base=ROOT/'assets/source/treant';files=[];members=[]
  with libarchive.file_reader(str(treant)) as entries:
   for entry in entries:
    if not entry.isfile:continue
    ext=Path(entry.pathname).suffix.lower();selected=ext in ['.fbx','.png','.jpg','.jpeg','.txt','.md','.pdf']
    members.append({'path':entry.pathname,'bytes':entry.size,'selected':selected})
    if not selected:continue
    data=b''.join(entry.get_blocks())
    if len(data)!=entry.size:raise ValueError('Truncated member '+entry.pathname)
    dest=safe(base,entry.pathname);dest.write_bytes(data);files.append({'path':dest.relative_to(ROOT).as_posix(),'sha256':sha(dest),'bytes':dest.stat().st_size})
  report['packs'].append({'id':'treant','archive':treant_name,'archiveSha256':treant_digest,'files':files,'archiveMembers':members,'usage':'Original editable source / available for authoring; production uses adapted assets/models.'})
 # Known exporter filename typo: preserve original JSON and supply verified adjacent normal-map aliases.
 base=ROOT/'assets/source/universal-base'
 for p in base.rglob('*.gltf'):
  g=json.loads(p.read_text())
  for im in g.get('images',[]):
   uri=im.get('uri','')
   if not uri or urlsplit(uri).scheme:continue
   target=(p.parent/unquote(uri)).resolve()
   if target.exists():continue
   if not target.is_relative_to(base.resolve()):raise ValueError('Dependency escapes source pack')
   expected=target.name.replace('_png.png','.png')
   adjacent=target.with_name(expected)
   candidates=[adjacent] if adjacent.is_file() else [x for x in base.rglob(expected) if x.is_file()]
   hashes={sha(x) for x in candidates}
   if len(hashes)!=1:raise ValueError('Missing or ambiguous original texture '+uri)
   target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(candidates[0],target)
   report['repairs'].append({'model':p.relative_to(ROOT).as_posix(),'dependency':uri,'copiedFrom':candidates[0].relative_to(ROOT).as_posix(),'sha256':sha(target),'reason':'Known _png.png filename alias; original glTF unchanged.'})
 demon=locate('Demon.fbx')
 if demon:
  if sha(demon)!='e976fcb93e60235e997f75a94241fbfdacec6ef9de138678608a4e9b1e5d6eba':raise ValueError('Demon FBX checksum mismatch')
  target=ROOT/'assets/source/demon/Demon.fbx';target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(demon,target)
 for name in ['Demon_tex.rar','Ball_tex.rar']:
  archive=locate(name)
  if not archive:continue
  import libarchive
  row={'archive':name,'sha256':sha(archive),'completeMembers':[],'errors':[]}
  try:
   with libarchive.file_reader(str(archive)) as entries:
    for entry in entries:
     if not entry.isfile:continue
     try:
      data=b''.join(entry.get_blocks())
      if len(data)!=entry.size:raise ValueError('Truncated member')
      dest=safe(ROOT/'assets/source/demon'/archive.stem,entry.pathname);dest.write_bytes(data);row['completeMembers'].append({'path':dest.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':sha(dest)})
     except Exception as error:row['errors'].append(str(error));break
  except Exception as error:row['errors'].append(str(error))
  report['partialArchives'].append(row)
 out=ROOT/'migration/reports';out.mkdir(parents=True,exist_ok=True);(out/'source-recovery.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps({'packs':len(report['packs']),'files':sum(len(x['files']) for x in report['packs']),'repairs':len(report['repairs']),'missing':report['missing'],'partialArchives':report['partialArchives']}))
if __name__=='__main__':main()
