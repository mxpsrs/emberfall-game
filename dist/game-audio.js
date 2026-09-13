'use strict';
const AREA_MUSIC={title:{title:'The Tournament',file:'the-tournament'},hero:{title:'Medieval Opener',file:'medieval-opener'},refuge:{title:'The Field of Dreams',file:'field-of-dreams'},town:{title:'The Old Tower Inn',file:'old-tower-inn'},danger:{title:'Cave Theme',file:'cave-theme'}};
const SOUND_SAMPLES={wood:['wood-1','wood-2','wood-3'],mine:['mine-1','mine-2','mine-3'],smith:['smith-1','smith-2','smith-3'],sword:['sword-1','sword-2'],hit:['hit-1','hit-2'],hurt:['hit-1','hit-2'],cook:['cook-1','cook-2'],fire:['fire-1'],door:['door-1'],coins:['coins-1'],bank:['coins-1'],equip:['equip-1'],step:['step-1','step-2','step-3'],floor:['floor-1','floor-2']};
const soundBuffers=new Map(),soundLoads=new Map();
const gameAudio={context:null,master:null,effects:null,music:null,ambience:null,noise:null,tracks:new Map(),current:null,blocked:false,voices:0,last:new Map(),steps:0,check:0,environment:null};
function audioPreferences(){
 const defaults={effects:.65,music:.26,ambience:.23};s.audio=s.audio&&typeof s.audio==='object'?s.audio:{};
 for(const [key,value]of Object.entries(defaults))s.audio[key]=Number.isFinite(s.audio[key])?Math.max(0,Math.min(1,s.audio[key])):value;
 return s.audio;
}
function areaMusicKey(){
 if($('loginScreen').open||$('creator').open||!s.character)return 'title';
 if(currentScene==='tutorial'||typeof activeEncounter!=='undefined'&&activeEncounter?.o.encounter)return 'hero';
 const region=regionInfo(),name=(currentScene+' '+(region?.[0]||'')+' '+(s.insideBuilding||'')).toLowerCase();
 if(/mine|crypt|dungeon|warrens|lair_|ruins|ashwatch/.test(name))return 'danger';
 const town=typeof settlementAt==='function'&&settlementAt(px,py);return town||/briarhaven|stoneford|willowcross|inn|shop|forge/.test(name)?'town':'refuge';
}
function setAudioVolumes(){
 if(!gameAudio.context)return;const t=gameAudio.context.currentTime,p=audioPreferences();
 gameAudio.master.gain.setTargetAtTime(s.sound===false?0:1,t,.04);gameAudio.effects.gain.setTargetAtTime(p.effects,t,.04);gameAudio.music.gain.setTargetAtTime(p.music,t,.3);gameAudio.ambience.gain.setTargetAtTime(p.ambience,t,.3);
 ambientEnabled=s.sound!==false;syncAmbientIcon();
}
function unlockGameAudio(){
 if(document.hidden)return;
 try{
  if(!gameAudio.context){
   const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
   const c=gameAudio.context=new AC(),master=gameAudio.master=c.createGain(),compressor=c.createDynamicsCompressor();compressor.threshold.value=-14;compressor.ratio.value=5;master.connect(compressor);compressor.connect(c.destination);
   for(const key of ['effects','music','ambience']){gameAudio[key]=c.createGain();gameAudio[key].connect(master);}
   const noise=gameAudio.noise=c.createBuffer(1,c.sampleRate,c.sampleRate),data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
   const air=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();air.buffer=noise;air.loop=true;filter.type='lowpass';filter.frequency.value=260;gain.gain.value=.018;air.connect(filter);filter.connect(gain);gain.connect(gameAudio.ambience);air.start();gameAudio.environment={filter,gain};
   ambient={context:c};
  }
  setAudioVolumes();if(s.sound===false)return;
  const resumed=gameAudio.context.resume();resumed?.catch(()=>{});gameAudio.blocked=false;updateAreaMusic(true);
 }catch{gameAudio.blocked=true;}
}
function stopAreaMusic(fade=true){
 const c=gameAudio.context;if(!c)return;
 for(const track of gameAudio.tracks.values()){clearTimeout(track.stopTimer);track.gain.gain.cancelScheduledValues(c.currentTime);track.gain.gain.setTargetAtTime(0,c.currentTime,fade?.45:.01);track.stopTimer=setTimeout(()=>track.element.pause(),fade?1800:0);}
 gameAudio.current=null;
}
function updateAreaMusic(force=false){
 const c=gameAudio.context;if(!c||document.hidden||s.sound===false||audioPreferences().music===0||gameAudio.blocked&&!force){if(s.sound===false||audioPreferences().music===0)stopAreaMusic(false);return;}
 const key=areaMusicKey();let track=gameAudio.tracks.get(key);
 if(gameAudio.current===key&&track&&!track.element.paused)return;
 if(gameAudio.current!==key)stopAreaMusic();
 if(!track){const element=new Audio();element.preload='none';element.loop=true;element.src=realmAssetURL('assets/audio/'+AREA_MUSIC[key].file+'.mp3');element.playsInline=true;const gain=c.createGain();gain.gain.value=0;c.createMediaElementSource(element).connect(gain);gain.connect(gameAudio.music);track={element,gain};gameAudio.tracks.set(key,track);}
 clearTimeout(track.stopTimer);gameAudio.current=key;track.gain.gain.cancelScheduledValues(c.currentTime);track.gain.gain.setTargetAtTime(1,c.currentTime,.7);
 track.element.play()?.catch(()=>{gameAudio.blocked=true;});
 const label=$('nowPlaying');if(label)label.textContent=AREA_MUSIC[key].title;
}
function audioTone(group,at,frequency,duration,volume=.1,type='sine',endFrequency=frequency){
 const c=gameAudio.context,osc=c.createOscillator(),gain=c.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,at);osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),at+duration);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain);gain.connect(group);osc.start(at);osc.stop(at+duration+.025);osc.onended=()=>{osc.disconnect();gain.disconnect();};
}
function audioNoise(group,at,duration,volume=.09,frequency=1000,type='bandpass'){
 const c=gameAudio.context,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=gameAudio.noise;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.65;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);source.connect(filter);filter.connect(gain);gain.connect(group);source.start(at,Math.random()*.25);source.stop(at+duration+.02);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
}
function loadSoundSample(name){
 if(soundLoads.has(name))return soundLoads.get(name);
 const c=gameAudio.context;if(!c||typeof fetch!=='function')return Promise.resolve(null);
 const pending=fetch(realmAssetURL('assets/audio/sfx/'+name+'.mp3')).then(r=>{if(!r.ok)throw Error('Sound unavailable');return r.arrayBuffer();}).then(bytes=>c.decodeAudioData(bytes)).then(buffer=>{soundBuffers.set(name,buffer);return buffer;}).catch(()=>null);
 soundLoads.set(name,pending);return pending;
}
function playRecordedSound(kind,group,at){
 const names=SOUND_SAMPLES[kind==='step'&&s.insideBuilding?'floor':kind];if(!names)return false;
 for(const name of names)loadSoundSample(name);
 const available=names.filter(name=>soundBuffers.has(name));if(!available.length)return false;
 const c=gameAudio.context,source=c.createBufferSource(),gain=c.createGain();source.buffer=soundBuffers.get(available[Math.floor(Math.random()*available.length)]);source.playbackRate.value=.96+Math.random()*.08;gain.gain.value=kind==='step'?.30:kind==='cook'||kind==='fire'?.55:.75;source.connect(gain);gain.connect(group);source.start(at);source.onended=()=>{source.disconnect();gain.disconnect();};return true;
}
function playGameSound(kind,x=px,y=py,delay=0){
 const c=gameAudio.context;if(!c||c.state!=='running'||document.hidden||s.sound===false||audioPreferences().effects===0||gameAudio.voices>=18)return;
 const now=c.currentTime;if(now-(gameAudio.last.get(kind)??-100)<(kind==='step'?.16:kind==='click'?.065:.08))return;gameAudio.last.set(kind,now);
 const group=c.createGain(),distance=Math.hypot(x-px,y-py);group.gain.value=1/(1+distance*.16);const pan=c.createStereoPanner?.();if(pan){pan.pan.value=Math.max(-.8,Math.min(.8,((x-px)*Math.cos(view3d.yaw)-(y-py)*Math.sin(view3d.yaw))/12));group.connect(pan);pan.connect(gameAudio.effects);}else group.connect(gameAudio.effects);
 gameAudio.voices++;const at=now+delay,tone=(f,d,v,type,end,offset=0)=>audioTone(group,at+offset,f,d,v,type,end),noise=(d,v,f,type,offset=0)=>audioNoise(group,at+offset,d,v,f,type);
 const sampled=playRecordedSound(kind,group,at);
 if(sampled&&!['cook','fire'].includes(kind)){}
 else if(kind==='step'){noise(.075,.1,s.insideBuilding?2000:650);tone(s.insideBuilding?180:110,.07,.055,'sine',75);}
 else if(kind==='wood'){noise(.15,.25,650,'lowpass');tone(180,.09,.16,'triangle',80);}
 else if(kind==='mine'||kind==='smith'){noise(.08,.12,3000);tone(1200,.35,.13,'sine',1100);tone(1930,.23,.065,'sine',1850,.025);}
 else if(kind==='fishCast'){noise(.2,.08,2600);noise(.32,.14,900,'lowpass',.2);tone(350,.09,.055,'sine',110,.24);}
 else if(kind==='fish'){noise(.5,.23,1350);[480,620,420,580].forEach((f,i)=>tone(f,.1,.045,'sine',f*.3,.08+i*.085));}
 else if(kind==='cook'){noise(1.05,.13,4200,'highpass');[.12,.32,.54,.8].forEach(t=>noise(.055,.06,2600,'bandpass',t));}
 else if(kind==='fire'){noise(.7,.16,700,'lowpass',.05);[.06,.2,.36,.61,.82].forEach(t=>noise(.055,.1,1500+Math.random()*2200,'highpass',t));tone(95,.3,.055,'sine',45,.1);}
 else if(kind==='sword'){noise(.18,.15,2000);tone(280,.14,.045,'triangle',70);}
 else if(kind==='bow'){tone(280,.1,.12,'triangle',90);noise(.25,.13,3200,'bandpass',.02);}
 else if(kind==='magic'||kind==='spirit'||kind==='teleport'){noise(.7,.06,1300);[330,440,660,880].forEach((f,i)=>tone(f,kind==='teleport'?1.3:.6,.065,'sine',f*1.1,i*.08));}
 else if(kind==='hit'||kind==='hurt'){noise(.12,.18,550,'lowpass');tone(kind==='hurt'?100:150,.15,.12,'triangle',45);}
 else if(kind==='miss'){noise(.12,.07,2300);}
 else if(kind==='door'){tone(140,.19,.055,'sawtooth',180);noise(.11,.13,650,'lowpass',.2);}
 else if(kind==='coins'||kind==='bank'){[1500,1900,2400].forEach((f,i)=>tone(f,.15,.055,'sine',f,i*.035));}
 else if(kind==='equip'){noise(.1,.1,2600);tone(620,.15,.07,'triangle',380);}
 else if(kind==='eat'){noise(.13,.09,1400);noise(.15,.075,1000,'bandpass',.18);}
 else if(kind==='bury'){noise(.2,.13,450,'lowpass');noise(.25,.08,600,'lowpass',.2);}
 else if(kind==='craft'){noise(.12,.1,850);tone(520,.15,.045,'triangle',340,.1);}
 else if(kind==='quest'||kind==='level'||kind==='lesson'){(kind==='quest'?[392,494,587,784]:kind==='level'?[440,554,659,880]:[523,659]).forEach((f,i)=>tone(f,.5,.075,'triangle',f,i*.12));}
 else if(kind==='lowHealth'){tone(75,.14,.09,'sine',55);tone(75,.13,.08,'sine',55,.22);}
 else if(kind==='phase'){[165,220,330].forEach((f,i)=>tone(f,.9,.1,'triangle',f*.97,i*.12));}
 else tone(690,.045,.035,'triangle',440);
 setTimeout(()=>{group.disconnect();pan?.disconnect();gameAudio.voices=Math.max(0,gameAudio.voices-1);},2200+delay*1000);
}
// Called by the action clock before the harvest roll or target reset. Every
// visible tool swing crosses this contact point, including unsuccessful rolls.
function soundGatheringSwing(object,previous,current,duration){
 if(!object||!['tree','ore','fish'].includes(object.type)||!(duration>0))return;
 const impact=duration*.42;
 if(previous<impact&&current>=impact)playGameSound(object.type==='tree'?'wood':object.type==='ore'?'mine':'fishCast',object.x,object.y);
}
function tickGameAudio(dt){
 const c=gameAudio.context;if(!c||c.state!=='running'||s.sound===false||document.hidden)return;
 gameAudio.check+=dt;if(gameAudio.check<1)return;gameAudio.check=0;updateAreaMusic();
 if(gameAudio.environment){const underground=/mine|crypt|dungeon/.test(currentScene),nearFire=objects.some(o=>o.type==='camp'&&o.dead<=time&&Math.hypot(px-o.x,py-o.y)<6),nearWater=typeof worldWaterDistance==='function'&&inWorld()&&worldWaterDistance(px,py)<6;gameAudio.environment.filter.frequency.setTargetAtTime(underground?110:nearWater?850:nearFire?1300:260,c.currentTime,1);gameAudio.environment.gain.gain.setTargetAtTime(underground?.011:nearWater?.035:nearFire?.025:.018,c.currentTime,1);}
 if(s.hp<=maxhp()*.25&&c.currentTime-(gameAudio.last.get('lowHealth')??-100)>6)playGameSound('lowHealth');
}
startAmbient=function(){unlockGameAudio();};
toggleAmbient=function(){s.sound=s.sound===false;unlockGameAudio();setAudioVolumes();if(s.sound===false)stopAreaMusic(false);save();};
ambientChirp=function(){};
document.addEventListener('pointerdown',e=>{if(e.isTrusted!==false&&s.sound!==false)unlockGameAudio();},{capture:true});
document.addEventListener('keydown',e=>{if(!e.repeat&&s.sound!==false)unlockGameAudio();},{capture:true});
document.addEventListener('visibilitychange',()=>{if(!gameAudio.context)return;if(document.hidden){for(const t of gameAudio.tracks.values())t.element.pause();gameAudio.context.suspend()?.catch(()=>{});}else if(s.sound!==false)unlockGameAudio();});
window.addEventListener('pagehide',()=>{for(const t of gameAudio.tracks.values())t.element.pause();gameAudio.context?.suspend()?.catch(()=>{});});
const movementBeforeAudio=advanceMovement;
advanceMovement=function(dt){const x=px,y=py,result=movementBeforeAudio(dt);gameAudio.steps+=Math.hypot(px-x,py-y);if(gameAudio.steps>=(s.runEnabled?.95:.8)){gameAudio.steps=0;playGameSound('step');}tickGameAudio(dt);return result;};
const harvestBeforeAudio=harvestResource;
harvestResource=function(o){const ok=harvestBeforeAudio(o);if(ok&&o.type==='fish')playGameSound('fish',o.x,o.y);return ok;};
const attackBeforeAudio=performAttack;
performAttack=function(o){const ok=attackBeforeAudio(o);if(ok)playGameSound(combatStyle()==='ranged'?'bow':combatStyle()==='magic'?'magic':'sword',px,py,playerAttackMotion?.releaseAt||0);return ok;};
const hitBeforeAudio=resolveHit;
resolveHit=function(o,damage,...rest){if(o.dead<=time&&o.hp>0)playGameSound(damage>0?'hit':'miss',o.x,o.y);return hitBeforeAudio(o,damage,...rest);};
const enemyHitBeforeAudio=applyEnemyHit;
applyEnemyHit=function(o,damage){playGameSound(damage>0?'hurt':'miss');return enemyHitBeforeAudio(o,damage);};
const gainBeforeAudio=gain;
gain=function(skill,n,quiet){const before=lv(skill),result=gainBeforeAudio(skill,n,quiet);if(lv(skill)>before)playGameSound('level');return result;};
const doorBeforeAudio=setWalkInDoor;
setWalkInDoor=function(o,open,restoring=false){if(!restoring)playGameSound('door',o.x,o.y);return doorBeforeAudio(o,open,restoring);};
const gateBeforeAudio=setTrainingGate;
setTrainingGate=function(open){if(trainingPenGate&&(trainingPenGate.openedAt!==undefined)!==open)playGameSound('door',trainingPenGate.x,trainingPenGate.y);return gateBeforeAudio(open);};
for(const [name,sound]of [['cookFish','cook'],['bakeBread','cook'],['lightLog','fire'],['smeltMetal','smith'],['smithMetal','smith'],['mixBreadDough','craft'],['fletch','craft'],['eatFood','eat'],['equipItem','equip'],['unequipItem','equip'],['transferBank','bank'],['takeGroundItem','coins'],['unleashSpirit','spirit'],['summonSpirits','spirit']]){const original=globalThis[name];globalThis[name]=function(...args){const result=original(...args);if(result&&!((name==='lightLog'&&playerAction?.kind==='firemaking')||(name==='cookFish'&&playerAction?.kind==='cook'&&!args[1])))playGameSound(sound);return result;};}
const burialBeforeAudio=updatePlayerAction;
updatePlayerAction=function(){const before=s.bag.bones;burialBeforeAudio();if(s.bag.bones<before)playGameSound('bury');};
const departureBeforeAudio=departTutorialIsland;
departTutorialIsland=function(){const result=departureBeforeAudio();if(result){playGameSound('teleport');updateAreaMusic();}return result;};
function openSoundSettings(){
 const p=audioPreferences();dialog('Sound & music','<div id="soundSettings"><button id="soundMaster" type="button"></button><div id="soundSliders"></div><p class="sound-track">Now playing<br><strong id="nowPlaying"></strong></p></div>');
 const master=$('soundMaster'),label=()=>{master.textContent=s.sound===false?'Sound off · Enable':'Sound on · Mute';master.setAttribute('aria-pressed',String(s.sound!==false));};label();master.onclick=()=>{toggleAmbient();label();};
 for(const [key,title]of [['effects','Sound effects'],['music','Music'],['ambience','Environment']]){const row=document.createElement('label'),name=document.createElement('span'),input=document.createElement('input'),value=document.createElement('output');row.className='sound-slider';name.textContent=title;input.type='range';input.min=0;input.max=100;input.value=Math.round(p[key]*100);input.setAttribute('aria-label',title+' volume');value.textContent=input.value+'%';input.oninput=()=>{audioPreferences()[key]=Number(input.value)/100;value.textContent=input.value+'%';setAudioVolumes();if(key==='music')updateAreaMusic(true);};input.onchange=()=>{save();if(key==='effects')playGameSound('click');};row.append(name,input,value);$('soundSliders').appendChild(row);}
 $('nowPlaying').textContent=gameAudio.current?AREA_MUSIC[gameAudio.current].title:'Tap or press a key with sound enabled to begin music.';
}
// Login, appearance editing and dialogue pause simulation; their music still transitions.
let screenMusicCheck=-1000;
const frameBeforeAudio=frame;
frame=function(now){frameBeforeAudio(now);if(now-screenMusicCheck>=500){screenMusicCheck=now;updateAreaMusic();}};
