const fs=require('fs');let harness=fs.readFileSync(__dirname+'/apprenticeship.cjs','utf8').split('vm.runInContext(`')[0];new Function('require','__dirname',harness+`vm.runInContext(\`
renderUI=()=>{};s.character={name:'Appearance',frame:'male',skin:1,topColor:0,bottomColor:5,topStyle:0};s.equipment={};
const first=avatarMaterial('male',s.equipment,0);s.character.topColor=3;const second=avatarMaterial('male',s.equipment,0);assert.notDeepEqual(first.c,second.c,'shirt color changes actual rendered vertices');
const a=avatarPose('male','idle',0,s.equipment,0);s.character.skin=5;const b=avatarPose('male','idle',0,s.equipment,0);assert.notDeepEqual(a.c,b.c,'appearance invalidates CPU preview cache');
s.character.topStyle=6;s.character.bottomStyle=5;s.character.hair=3;s.character.beard=0;const bare=avatarMaterial('male',s.equipment,0);
s.character.topStyle=5;s.character.bottomStyle=4;s.character.hair=5;s.character.beard=1;const styled=avatarMaterial('male',s.equipment,0);assert(styled.p.length>bare.p.length,'supplied clothing and hair add geometry to the authored bare body');assert.equal(styled.w.length,styled.p.length/3*4);assert([...styled.p].every(Number.isFinite));
const legacy=avatarMaterial('male',{_appearance:{...s.character,topStyle:3,bottomStyle:2,hair:4,beard:2}},0),compatible=avatarMaterial('male',{_appearance:{...s.character,topStyle:3,bottomStyle:2,hair:0,beard:1}},0);assert.deepEqual(legacy.p,compatible.p,'retired hair and beard IDs resolve to their supplied replacements');
const identity={...s.character,frame:'female'};s.character=identity;const player=avatarMaterial('female',s.equipment,0),peer=avatarMaterial('female',{_appearance:identity},0);assert.deepEqual(player.c,peer.c);assert.deepEqual(player.p,peer.p,'other players see identical appearance');
console.log('PASS: visible clothing changes, preview cache, rigged clothing/hair, and identical player/peer appearance.');
\`,ctx);`)(require,__dirname);
