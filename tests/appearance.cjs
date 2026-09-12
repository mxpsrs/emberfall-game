const fs=require('fs');let harness=fs.readFileSync(__dirname+'/apprenticeship.cjs','utf8').split('vm.runInContext(`')[0];new Function('require','__dirname',harness+`vm.runInContext(\`
renderUI=()=>{};s.character={name:'Appearance',frame:'male',skin:1,topColor:0,bottomColor:5,topStyle:0};s.equipment={};
const first=avatarMaterial('male',s.equipment,0);s.character.topColor=3;const second=avatarMaterial('male',s.equipment,0);assert.notDeepEqual(first.c,second.c,'shirt color changes actual rendered vertices');
const a=avatarPose('male','idle',0,s.equipment,0);s.character.skin=5;const b=avatarPose('male','idle',0,s.equipment,0);assert.notDeepEqual(a.c,b.c,'appearance invalidates CPU preview cache');
s.character.topStyle=3;s.character.bottomStyle=2;s.character.hair=4;s.character.beard=2;const styled=avatarMaterial('male',s.equipment,0);assert(styled.p.length>second.p.length,'additional clothing/hair meshes fitted to skeleton');assert.equal(styled.w.length,styled.p.length/3*4);assert([...styled.p].every(Number.isFinite));
const identity={...s.character,frame:'female'};s.character=identity;const player=avatarMaterial('female',s.equipment,0),peer=avatarMaterial('female',{_appearance:identity},0);assert.deepEqual(player.c,peer.c);assert.deepEqual(player.p,peer.p,'other players see identical appearance');
console.log('PASS: visible clothing changes, preview cache, rigged clothing/hair, and identical player/peer appearance.');
\`,ctx);`)(require,__dirname);
