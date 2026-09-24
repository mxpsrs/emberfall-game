const fs=require('fs');
const bootstrap=fs.readFileSync('tests/apprenticeship.cjs','utf8').split('\nvm.runInContext(`\nlet randomSeed')[0].replace("const root=__dirname+'/../dist/'","const root=process.cwd()+'/dist/'");
eval(bootstrap+`\nvm.runInContext(\`
assert(!realmAllowsGpuSkinning(1024,'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128 Mobile'));
assert(realmAllowsGpuSkinning(1024,'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'));
assert(!realmAllowsGpuSkinning(128,''));
setupExpandedWorld();setupSpirits();setupTutorialVillage();s.tutorialReward=false;s.tutorial=0;activateScene('tutorial',43,55);const ground=walkSurfaceHeight(43.5,55.5);assert(Math.abs(ground-.75)<.001);
for(const sex of ['male','female'])for(const bottomStyle of [3,4])for(const clip of ['idle','walk','run','magic']){
 const gear={_appearance:{topStyle:4,bottomStyle,bottomColor:7}},posed=avatarPose(sex,clip,.35,gear,0),material=avatarMaterial(sex,gear,0);assert(posed.p.every(Number.isFinite));
 const low=Array.from(posed.p).filter((_,i)=>i%3===1);assert(Math.min(...low)>-.08&&Math.min(...low)<.4,'feet remain at the animation floor');
 let matrix;groundedPainter({indexed(mesh,m){matrix=m;}},43.5,55.5).indexed(posed,briarTransform(43.5,0,55.5));assert(Math.abs(matrix[7]+landHeight(matrix[3],matrix[11])-ground)<.001,'render root matches the paving');
 assert(material.i.some(v=>material.p[v*3+1]<.15),'clothed mesh retains foot triangles');
}
assert.equal(typeof realmSkyVertices,'undefined');assert(!realmFragmentShader.includes('farDistance'));assert(!realmVertexShader.includes('aMaterial>90.0'));
console.log('PASS: Android CPU skinning selection, both bodies and both outfits retain feet through idle/walk/run/cast poses, terrain root agreement, sky and horizon clipping removed.');
\`,ctx);`);
