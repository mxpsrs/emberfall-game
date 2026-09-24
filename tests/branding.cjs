const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
for (const p of ['dist/index.html', 'dist/account-auth.js', 'dist/manifest.webmanifest', 'worker/api.js']) {
 assert(!/emberfall/i.test(read(p)), p + ' retains old display branding');
 assert(/Veldren/.test(read(p)), p + ' must display Veldren');
}
assert.equal(JSON.parse(read('package.json')).name, 'veldren');
const lock = JSON.parse(read('package-lock.json'));
assert.equal(lock.name, 'veldren');
assert.equal(lock.packages[''].name, 'veldren');
assert(read('dist/game.js').includes("'emberfall-save-v1'"));
assert(read('dist/cloud.js').includes("'emberfall-cloud-backup-v1'"));
assert(read('dist/view3d.js').includes("'veldren-camera-v6'"));
assert(read('emberfall-android/app/src/main/AndroidManifest.xml').includes('android:label="Veldren"'));
assert(read('emberfall-android/app/src/main/AndroidManifest.xml').includes('package="games.emberfall.beta"'));
console.log('PASS: Veldren display branding, package consistency, and legacy save/Android identity compatibility.');
