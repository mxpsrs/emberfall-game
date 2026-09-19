"""Veldren's known source packs only; extraction does not import Unity/Godot scenes."""
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
 'prowler-dragon':('prowler-dragon-variant-rig.zip','f4cf40c3b55cdffcd8d01a019d3f7c2bbc54ae1837ff806333b3114bdc63fa14')}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def safe(base,name):
 p=PurePosixPath(name.replace('\\','/'))
 if p.is_absolute() or '..' in p.parts:raise ValueError('Unsafe archive path '+name)
 out=base.joinpath(*p.parts);out.parent.mkdir(parents=True,exist_ok=True);return out
def main():
 ap=argparse.ArgumentParser();ap.add_argument('directories',nargs='+',type=Path);args=ap.parse_args();report={'packs':[],'missing':[],'repairs':[],'partialArchives':[],'licensePolicy':'Keep supplied license/credit evidence. Possession alone does not prove redistribution rights. See licenses and handoff.'}
 def locate(name):return next((d/name for d in args.directories if (d/name).is_file()),None)
 for pack,(name,digest) in PACKS.items():
  source=locate(name)
  if not source:report['missing'].append(name);continue
  if sha(source)!=digest:raise ValueError('Archive checksum mismatch '+name)
  base=ROOT/'assets/source'/pack;files=[];members=[]
  with zipfile.ZipFile(source) as z:
   for item in z.infolist():
    if item.is_dir():continue
    ext=Path(item.filename).suffix.lower();selected=ext in ['.gltf','.glb','.bin','.png','.jpg','.jpeg','.txt','.md','.blend'] or pack=='textured-trees' and ext in ['.obj','.mtl']
    members.append({'path':item.filename,'bytes':item.file_size,'crc32':format(item.CRC,'08x'),'selected':selected})
    if not selected:continue
    dest=safe(base,item.filename);dest.write_bytes(z.read(item));files.append({'path':dest.relative_to(ROOT).as_posix(),'sha256':sha(dest),'bytes':dest.stat().st_size})
  report['packs'].append({'id':pack,'archive':name,'archiveSha256':digest,'files':files,'archiveMembers':members,'usage':'Original editable source / available for authoring; production uses adapted assets/models.'})
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
