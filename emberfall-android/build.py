#!/usr/bin/env python3
"""Build an APK using official Android tools, without Gradle or third-party SDKs.
ANDROID_TOOLS_DIR must contain android.jar (API 35), aapt2, r8.jar and apksig.jar.
EMBERFALL_SIGNING_DIR must contain emberfall-beta.p12 and password.txt.
"""
from pathlib import Path
import os, shutil, struct, subprocess, zipfile, hashlib, json
root = Path(__file__).resolve().parent
tools = Path(os.environ['ANDROID_TOOLS_DIR']).resolve()
keys = Path(os.environ['EMBERFALL_SIGNING_DIR']).resolve()
out = root / 'build'
out.mkdir(exist_ok=True)
for name in ['classes', 'generated', 'dex', 'signclasses']:
    shutil.rmtree(out / name, ignore_errors=True)
    (out / name).mkdir()
def run(*args):
    subprocess.run([str(a) for a in args], check=True, cwd=root)
run(tools/'aapt2', 'compile', '--dir', root/'app/src/main/res', '-o', out/'resources.zip')
run(tools/'aapt2', 'link', '-I', tools/'android.jar', '--manifest', root/'app/src/main/AndroidManifest.xml', '--min-sdk-version', '26', '--target-sdk-version', '35', '-0', 'arsc', '--java', out/'generated', '-o', out/'resources.apk', out/'resources.zip')
sources = list((root/'app/src/main/java').rglob('*.java')) + list((out/'generated').rglob('*.java'))
run('java', 'com.sun.tools.javac.Main', '--release', '8', '-classpath', tools/'android.jar', '-d', out/'classes', *sources)
with zipfile.ZipFile(out/'classes.jar','w',zipfile.ZIP_DEFLATED) as z:
    for p in (out/'classes').rglob('*.class'): z.write(p, p.relative_to(out/'classes').as_posix())
run('java', '-cp', tools/'r8.jar', 'com.android.tools.r8.D8', '--release', '--min-api', '26', '--lib', tools/'android.jar', '--output', out/'dex', out/'classes.jar')
with zipfile.ZipFile(out/'resources.apk') as resources, zipfile.ZipFile(out/'unsigned.apk','w') as apk:
    for info in resources.infolist():
        if info.compress_type == zipfile.ZIP_STORED:
            padding = (-(apk.fp.tell() + 30 + len(info.filename.encode('utf8')) + 4)) % 4
            info.extra = struct.pack('<HH', 0xffff, padding) + bytes(padding)
        apk.writestr(info, resources.read(info.filename))
    for p in (out/'dex').glob('*.dex'): apk.write(p, p.name, compress_type=zipfile.ZIP_DEFLATED)
run('java', 'com.sun.tools.javac.Main', '-cp', tools/'apksig.jar', '-d', out/'signclasses', root/'SignApk.java')
artifact = root / 'Veldren-Beta-0.1.0.apk'
cp = str(tools/'apksig.jar') + os.pathsep + str(out/'signclasses')
run('java', '-cp', cp, 'SignApk', out/'unsigned.apk', artifact, keys/'emberfall-beta.p12', keys/'password.txt')
run('java', '-cp', cp, 'SignApk', 'verify', artifact)
with zipfile.ZipFile(artifact) as z:
    assert z.testzip() is None
    for name in ['AndroidManifest.xml','resources.arsc','classes.dex']: assert name in z.namelist()
    for info in z.infolist():
        if info.compress_type == zipfile.ZIP_STORED:
            with artifact.open('rb') as stream:
                stream.seek(info.header_offset + 26)
                namesize, extrasize = struct.unpack('<HH', stream.read(4))
            assert (info.header_offset + 30 + namesize + extrasize) % 4 == 0, info.filename
hashvalue = hashlib.sha256(artifact.read_bytes()).hexdigest()
(root/'Veldren-Beta-0.1.0.sha256').write_text(hashvalue+'  '+artifact.name+'\n')
print('APK alignment, archive integrity and signatures verified.')
print(artifact)
