// Render the actual conversation portrait painter for every Firstlight tutor.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createCanvas}=require('@napi-rs/canvas');
const {ctx}=require('./benchmark-desktop.cjs'),out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});
Object.assign(ctx,{reviewFS:fs,reviewOut:out,createReviewCanvas:createCanvas});
const create=ctx.document.createElement;ctx.document.createElement=type=>type==='canvas'?createCanvas(64,64):create(type);
vm.runInContext('startRebuiltRealm=()=>{};',ctx);
for(const file of ['game-icons','item-models','equipment-interface','character-creation','npc-dialogue'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file+'.js'),'utf8'),ctx);
const portrait=createCanvas(220,240);Object.assign(ctx.document.getElementById('npcPortrait'),{width:220,height:240,getContext:()=>portrait.getContext('2d'),reviewCanvas:portrait});
vm.runInContext(`{
renderUI=()=>{};renderTutorial=()=>{};renderAction=()=>{};setupExpandedWorld();setupSpirits();setupTutorialVillage();assetsReady=true;
const sheet=createReviewCanvas(880,540),g=sheet.getContext('2d');g.fillStyle='#cfbf98';g.fillRect(0,0,sheet.width,sheet.height);g.font='16px Georgia';g.textAlign='center';
for(const [i,role]of ['guide','woods','fishing','cooking','mining','combat','bank','magic'].entries()){
 npcDialogueState={speaker:tutorialTutor(role)};drawNpcPortrait();g.drawImage($('npcPortrait').reviewCanvas,(i%4)*220,Math.floor(i/4)*270);g.fillStyle='#45331b';g.fillText(npcDialogueState.speaker.name,(i%4)*220+110,Math.floor(i/4)*270+257);
}
reviewFS.writeFileSync(reviewOut+'/tutor-portraits.png',sheet.toBuffer('image/png'));
console.log('Rendered eight tutors using the shared world equipment and conversation painter.');
}`,ctx);
