"""Recover free official Quaternius source packs for a reproducible native import.

Usage: python3 scripts/assets/fetch-asset-sources.py OUTPUT_DIRECTORY
Only anonymous free Standard downloads are requested. No account or purchase.
"""
import http.cookiejar,io,json,pathlib,re,sys,urllib.parse,urllib.request,zipfile
root=pathlib.Path(sys.argv[1]).resolve()
for slug in ['medieval-village-megakit','universal-base-characters','universal-animation-library']:
 client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 base='https://quaternius.itch.io/'+slug
 def token(page):
  for pattern in [r'name="csrf_token" content="([^"]+)"',r'name="csrf_token" value="([^"]+)"',r'"csrf_token":"([^"]+)"']:
   match=re.search(pattern,page)
   if match:return match.group(1)
  raise RuntimeError('Official public download form changed')
 def post(url,csrf,referer):
  request=urllib.request.Request(url,data=urllib.parse.urlencode({'csrf_token':csrf}).encode(),headers={'Referer':referer,'X-Requested-With':'XMLHttpRequest'})
  return json.loads(client.open(request,timeout=120).read())
 page=client.open(base,timeout=120).read().decode();csrf=token(page)
 url=post(base+'/download_url',csrf,base)['url'];page=client.open(url,timeout=120).read().decode()
 upload=re.search(r'data-upload_id="(\d+)"',page)
 if not upload:raise RuntimeError('Free Standard download is unavailable')
 link=post(base+'/file/'+upload.group(1),token(page),url)['url']
 with client.open(link,timeout=120) as response:archive=zipfile.ZipFile(io.BytesIO(response.read()))
 count=0
 for entry in archive.infolist():
  path=pathlib.PurePosixPath(entry.filename)
  if path.is_absolute() or '..' in path.parts:raise RuntimeError('Unsafe archive path')
  if path.suffix.lower() not in ['.gltf','.glb','.bin','.png','.txt']:continue
  target=root/slug/pathlib.Path(*path.parts[1:]);target.parent.mkdir(parents=True,exist_ok=True)
  target.write_bytes(archive.read(entry));count+=1
 print(slug+': recovered '+str(count)+' source files',flush=True)
