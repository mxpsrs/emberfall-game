// Preserve every original contour vertex and animation weight while removing
// repeated full-body triangle scans during first-time equipment fitting.
const {ctx}=require('../../scripts/qa/benchmark-desktop.cjs'),vm=require('node:vm'),crypto=require('node:crypto');
ctx.meshHash=m=>{const hash=crypto.createHash('sha256');for(const key of ['p','n','c','f','j','w','i','uv','t'])hash.update(new Uint8Array(m[key].buffer,m[key].byteOffset,m[key].byteLength));return hash.digest('hex');};
const source=require('node:fs').readFileSync('client/realms-rebuilt.js','utf8');
const start=source.indexOf('function contouredLimbPlates('),end=source.indexOf('\nfunction modularMesh',start);
const reference=source.slice(start,end).replaceAll('contouredLimbPlates','referenceContouredLimbPlates').replaceAll('contouredLimbCache','referenceContourCache').replace('if(slices.has(position))return slices.get(position);','');
vm.runInContext('const referenceContourCache=new Map();\n'+reference,ctx);
vm.runInContext(`
for(const sex of ['male','female'])for(const part of ['upperArms','forearms','thighs']){
 const mesh=contouredLimbPlates(sex,part);
 assert.equal(meshHash(mesh),meshHash(referenceContouredLimbPlates(sex,part)),'fitting must preserve the approved geometry and skin weights');
 assert.strictEqual(contouredLimbPlates(sex,part),mesh,'later equipment requests reuse the completed contour');
}
console.log('PASS: all six optimized armour contours exactly match uncached reference geometry, normals, materials, indices and animation weights; cache reuse is stable.');
`,ctx);
