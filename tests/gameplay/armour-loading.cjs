// Preserve every original contour vertex and animation weight while removing
// repeated full-body triangle scans during first-time equipment fitting.
const {ctx}=require('../../scripts/qa/benchmark-desktop.cjs'),vm=require('node:vm'),crypto=require('node:crypto');
ctx.meshHash=m=>{const hash=crypto.createHash('sha256');for(const key of ['p','n','c','f','j','w','i','uv','t'])hash.update(new Uint8Array(m[key].buffer,m[key].byteOffset,m[key].byteLength));return hash.digest('hex');};
ctx.expectedContours={
  "male:upperArms": "48879b00deb27a2eede95f14c9393c5f0080cec3715e29ec28f6920af93f4b4e",
  "male:forearms": "ca03b63f140023b1e35ca520cac8c7bc52bb7fbd0738f38d81885cf20d703f4a",
  "male:thighs": "bb14efa2dcab96741c15c9a27d1ef07d0f8932668e5c3d59c2e0527be249b69c",
  "female:upperArms": "4b4325ff2ec273ded3135b30010dd126c751be09a62bdd7777771e0c905c5b3d",
  "female:forearms": "be8dc09baae1097af594c348ecc79a018bce33867da031a7d6f980771caf4a99",
  "female:thighs": "8f0db3955a65b84d8d40caaf457c5b740f8100415dc399e989b0fbd8d9feaaec"
};
vm.runInContext(`
for(const sex of ['male','female'])for(const part of ['upperArms','forearms','thighs']){
 const mesh=contouredLimbPlates(sex,part);
 assert.equal(meshHash(mesh),expectedContours[sex+':'+part],'fitting must preserve the approved geometry and skin weights');
 assert.strictEqual(contouredLimbPlates(sex,part),mesh,'later equipment requests reuse the completed contour');
}
console.log('PASS: all six optimized armour contours exactly match pre-optimization geometry, normals, materials, indices and animation weights; cache reuse is stable.');
`,ctx);
