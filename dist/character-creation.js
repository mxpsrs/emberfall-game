'use strict';
let creatorAngle=-.4,creatorFace=false,creatorDrag=null,creatorRenderQueued=false;
const CREATOR_FIELDS=[
 ['frame','Body',['Male','Female']],
 ['hair','Hairstyle',['Side part','Long','Cropped','Shaved','Buns'],[0,1,2,3,5]],
 ['hairColor','Hair colour',['Black','Brown','Auburn','Blond','Silver','White']],
 ['eyeColor','Eye colour',['Brown','Blue','Green','Hazel','Grey','Violet']],
 ['beard','Facial hair',['Clean shaven','Full beard']],
 ['skin','Skin colour',['Porcelain','Fair','Warm','Tan','Brown','Deep']],
 ['topStyle','Top',['None','Peasant shirt','Ranger tunic'],[6,4,5]],
 ['topColor','Top colour',['Blue','Red','Green','Purple','Ochre','Charcoal','Linen','Brown']],
 ['bottomStyle','Legs & footwear',['None','Peasant breeches','Ranger trousers'],[5,3,4]],
 ['bottomColor','Leg colour',['Blue','Red','Green','Purple','Ochre','Charcoal','Linen','Brown']]
];
const CREATOR_SWATCHES={skin:['#e1c3a2','#cda782','#b99370','#aa7c58','#805b42','#593e2d'],hairColor:['#272728','#60432d','#924c30','#bb9552','#b2b4b0','#e2dece'],topColor:['#456e8b','#8d4240','#4b7855','#75558d','#b19a56','#45494d','#c6bfa2','#795139']};
CREATOR_SWATCHES.eyeColor=['#5c2e14','#2663a6','#306b3b','#7a5c29','#6b757d','#78428f'];
CREATOR_SWATCHES.bottomColor=CREATOR_SWATCHES.topColor;
// Keep the authored outfit IDs stable for saved characters and the world renderer.
function creatorChoiceValue(key,index){const values=CREATOR_FIELDS.find(row=>row[0]===key)?.[3];return key==='frame'?(index?'female':'male'):values?values[index]:index;}
function creatorChoiceIndex(key){const field=CREATOR_FIELDS.find(row=>row[0]===key);return Math.max(0,field[2].findIndex((_,i)=>creatorChoiceValue(key,i)===creatorDraft[key]));}
function setCreatorChoice(key,index){
 const field=CREATOR_FIELDS.find(row=>row[0]===key);if(!field||!creatorDraft)return;
 const n=field[2].length;index=(index%n+n)%n;creatorDraft[key]=creatorChoiceValue(key,index);syncCreatorControls();renderLooks();
}
function creatorStep(key,delta){setCreatorChoice(key,creatorChoiceIndex(key)+delta);}
function syncCreatorControls(){
 for(const [key,,options]of CREATOR_FIELDS){
  const value=creatorChoiceIndex(key);
  const label=$('appearance-'+key);if(label){label.textContent=options[value];label.dataset.value=String(creatorDraft[key]);}
  for(let i=0;i<options.length;i++){const button=$('choice-'+key+'-'+i);if(button)button.setAttribute('aria-pressed',String(value===i));}
 }
}
function buildCreatorControls(){
 $('appearanceFields').replaceChildren();$('clothingFields').replaceChildren();$('creatorBody').replaceChildren();
 for(const [key,label,options]of CREATOR_FIELDS){
  const group=document.createElement('fieldset');group.className='appearance-control';
  const legend=document.createElement('legend');legend.textContent=label;group.appendChild(legend);
  if(key==='frame'||CREATOR_SWATCHES[key]){
   group.classList.add(key==='frame'?'body-choices':'colour-choices');const buttons=document.createElement('div');buttons.className='choice-buttons';
   options.forEach((name,index)=>{const button=document.createElement('button');button.type='button';button.id='choice-'+key+'-'+index;button.title=name;button.setAttribute('aria-label',label+': '+name);button.onclick=()=>setCreatorChoice(key,index);
    if(key==='frame')button.textContent=name;else{button.className='colour-swatch';button.style.setProperty('--swatch',CREATOR_SWATCHES[key][index]);}
    buttons.appendChild(button);
   });group.appendChild(buttons);
  }else{
   const stepper=document.createElement('div');stepper.className='appearance-stepper';
   const prev=document.createElement('button'),next=document.createElement('button'),value=document.createElement('output');
   value.id='appearance-'+key;value.setAttribute('aria-live','polite');
   for(const [button,delta,glyph]of [[prev,-1,'◀'],[next,1,'▶']]){button.type='button';button.textContent=glyph;button.setAttribute('aria-label',(delta<0?'Previous ':'Next ')+label.toLowerCase());button.onclick=()=>creatorStep(key,delta);}
   stepper.append(prev,value,next);group.appendChild(stepper);
  }
  $(key==='frame'?'creatorBody':key.startsWith('top')||key.startsWith('bottom')?'clothingFields':'appearanceFields').appendChild(group);
 }
 syncCreatorControls();
}
openCreator=function(edit=false){
 stop();if($('modal').open)$('modal').close();editingCharacter=edit;selectedLook=s.character?.look||0;creatorAngle=-.4;creatorFace=false;
 creatorDraft={race:'human',frame:'male',skin:1,hair:0,hairColor:1,eyeColor:0,beard:0,topStyle:4,topColor:6,bottomStyle:3,bottomColor:7,...s.character};
 for(const [key,,options]of CREATOR_FIELDS)if(!options.some((_,i)=>creatorChoiceValue(key,i)===creatorDraft[key]))creatorDraft[key]=key==='topStyle'?4:key==='bottomStyle'?3:key==='beard'&&creatorDraft[key]===2?1:creatorChoiceValue(key,0);
 $('creatorTitle').textContent=edit?'Change your appearance':'Choose your appearance';syncCharacterName();
 $('begin').textContent=edit?'Save appearance':'Begin adventure';$('cancelCreator').hidden=!edit;$('characterSaveError').textContent='';$('creatorZoom').textContent='Face detail';
 buildCreatorControls();$('creator').showModal();renderLooks();
};
// A depth buffer gives the preview the same solid surfaces as the world renderer,
// including overlapping hair, collars and sleeves. Draw only when a choice changes.
const creatorMaterialPixels=new Map();
let creatorMaterialOwner=null;
function creatorMaterialSource(id){
 if(!globalThis.VeldrenAssets?.materialPlan)return null;
 if(creatorMaterialOwner!==VeldrenAssets){creatorMaterialOwner=VeldrenAssets;VeldrenAssets.onDispose(()=>{creatorMaterialPixels.clear();creatorMaterialOwner=null;});VeldrenAssets.onReload(()=>creatorMaterialPixels.clear());}
 let state=creatorMaterialPixels.get(id);if(state)return state;
 state={ready:false};creatorMaterialPixels.set(id,state);
 state.promise=Promise.resolve().then(async()=>{
  const plan=VeldrenAssets.materialPlan(id,'browser-mobile'),wanted=['albedo','appearanceMask'];
  const images=await Promise.all(wanted.map(async uniform=>{
   const binding=plan.textures.find(texture=>texture.uniform===uniform);if(!binding)return null;
   let bytes;if(binding.encoded)bytes=Uint8Array.from(atob(binding.encoded),c=>c.charCodeAt(0));else{const response=await fetch(realmAssetURL(binding.path));if(!response.ok)throw Error('Character preview texture unavailable: '+binding.path);bytes=new Uint8Array(await response.arrayBuffer());}
   const native=VeldrenAssets.processTexture(bytes,{...binding.processing,maxDimension:1024});
   try{return {...native.info.levels[0],pixels:native.level(0)};}finally{native.release();}
  }));
  state.albedo=images[0];state.mask=images[1];state.baseFactor=plan.float4.baseFactor;state.ready=true;
 }).catch(error=>{state.error=error;});
 return state;
}
function creatorTextureSample(image,u,v,out){
 const x=((u%1+1)%1)*image.width-.5,y=((v%1+1)%1)*image.height-.5,x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0;
 for(let k=0;k<3;k++){let value=0;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const col=(x0+dx+image.width)%image.width,row=(y0+dy+image.height)%image.height;value+=image.pixels[(row*image.width+col)*4+k]*(dx?tx:1-tx)*(dy?ty:1-ty);}out[k]=value/255;}
 return out;
}
function creatorPainter(g,project,width,height){
 const pixels=g.createImageData(width,height),depth=new Float32Array(width*height),packets=[],pending=new Set(),sample=new Float32Array(3),maskSample=new Float32Array(3);
 const token={};if(g.canvas)g.canvas._characterPreviewToken=token;
 function triangle(points,rgb,uvs,part,lighting=1){
  const p=points.map(point=>project(...point)),[a,b,c]=p,area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(Math.abs(area)<.001)return;
  const x0=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),x1=Math.min(width-1,Math.ceil(Math.max(a.x,b.x,c.x))),y0=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),y1=Math.min(height-1,Math.ceil(Math.max(a.y,b.y,c.y))),source=part?.material?creatorMaterialSource(part.material):null;
  if(source&&!source.ready&&!source.error)pending.add(source.promise);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const u=((b.x-x-.5)*(c.y-y-.5)-(b.y-y-.5)*(c.x-x-.5))/area,v=((c.x-x-.5)*(a.y-y-.5)-(c.y-y-.5)*(a.x-x-.5))/area,w=1-u-v;if(u<0||v<0||w<0)continue;
   const z=u*a.depth+v*b.depth+w*c.depth,k=y*width+x;if(z<=depth[k])continue;depth[k]=z;const offset=k*4;
   if(source?.ready){
    const tu=u*uvs[0][0]+v*uvs[1][0]+w*uvs[2][0],tv=u*uvs[0][1]+v*uvs[1][1]+w*uvs[2][1];creatorTextureSample(source.albedo,tu,tv,sample);
    const mask=part.tint?(source.mask?creatorTextureSample(source.mask,tu,tv,maskSample)[0]:1):0,light=Math.max(...sample);
    for(let channel=0;channel<3;channel++){const base=sample[channel]*source.baseFactor[channel],changed=part.kind==='skin'?base*(part.tint?.[channel]??1):light*(part.tint?.[channel]??1);pixels.data[offset+channel]=Math.max(0,Math.min(1,base*(1-mask)+changed*mask))*255*lighting;}
   }else for(let channel=0;channel<3;channel++)pixels.data[offset+channel]=rgb[channel]*lighting;
   pixels.data[offset+3]=255;
  }
 }
 function draw(){pixels.data.fill(0);depth.fill(-Infinity);pending.clear();for(const packet of packets)triangle(...packet);g.putImageData(pixels,0,0);}
 return {software:true,face(points,color){const rgb=color.startsWith('#')?color.slice(1).match(/.{2}/g).map(value=>parseInt(value,16)):color.match(/[\d.]+/g).slice(0,3).map(Number);for(let i=1;i<points.length-1;i++)packets.push([[points[0],points[i],points[i+1]],rgb,null,null]);},indexed(mesh,model){
  for(const part of mesh.materialParts||[{indexOffset:0,indexCount:mesh.i.length}])for(let i=part.indexOffset;i<part.indexOffset+part.indexCount;i+=3){
   const vertices=[mesh.i[i],mesh.i[i+1],mesh.i[i+2]],points=vertices.map(v=>briarPoint(Array.from(mesh.p.subarray(v*3,v*3+3)),0,model)),uvs=vertices.map(v=>Array.from(mesh.uv.subarray(v*2,v*2+2))),normal=vertices.map(v=>briarNormal(Array.from(mesh.n.subarray(v*3,v*3+3)),0,model)),rgb=[0,1,2].map(k=>vertices.reduce((sum,v)=>sum+mesh.c[v*3+k],0)/3*255),n=[0,1,2].map(k=>normal.reduce((sum,n)=>sum+n[k],0)/3),light=.58+.42*Math.max(0,-n[0]*.40+n[1]*.75+n[2]*.53);
   packets.push([points,rgb,uvs,part,light]);
  }
 },flush(){draw();if(pending.size)Promise.all([...pending]).then(()=>{if(!g.canvas||g.canvas._characterPreviewToken===token)draw();});}};
}
renderLooks=function(){
 if(!creatorDraft)return;const c=$('characterPreview'),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);
 const previous=meshDetail3;meshDetail3=1;const scale=creatorFace?620:235,cy=Math.cos(creatorAngle),sy=Math.sin(creatorAngle),tilt=.10,ct=Math.cos(tilt),st=Math.sin(tilt),anchor=creatorFace?c.height*.48+1.69*scale:c.height-86;
 try{const r=creatorPainter(g,(x,y,z)=>({x:c.width/2+(x*cy-z*sy)*scale,y:anchor+((x*sy+z*cy)*st-y*ct)*scale,depth:(x*sy+z*cy)*ct+y*st}),c.width,c.height);humanoid3(r,0,0,selectedLook,{_frame:creatorDraft.frame,_appearance:creatorDraft});r.flush();}finally{meshDetail3=previous;}
 $('lookName').textContent=creatorFace?'Face detail':'Drag to turn your character';
};
$('creatorZoom').onclick=()=>{creatorFace=!creatorFace;$('creatorZoom').textContent=creatorFace?'Full body':'Face detail';renderLooks();};
$('creatorRandom').onclick=()=>{for(const [key,,options]of CREATOR_FIELDS)creatorDraft[key]=creatorChoiceValue(key,Math.floor(Math.random()*options.length));syncCreatorControls();renderLooks();};
const creatorCanvas=$('characterPreview');
creatorCanvas.addEventListener('pointerdown',e=>{if(creatorDrag||e.button!==0)return;e.preventDefault();creatorDrag={id:e.pointerId,x:e.clientX,angle:creatorAngle};creatorCanvas.setPointerCapture(e.pointerId);});
creatorCanvas.addEventListener('pointermove',e=>{if(!creatorDrag||e.pointerId!==creatorDrag.id)return;creatorAngle=creatorDrag.angle+(e.clientX-creatorDrag.x)*.014;if(!creatorRenderQueued){creatorRenderQueued=true;requestAnimationFrame(()=>{creatorRenderQueued=false;renderLooks();});}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])creatorCanvas.addEventListener(event,e=>{if(e.pointerId===creatorDrag?.id)creatorDrag=null;});
creatorCanvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();creatorAngle+=(e.key==='ArrowLeft'?-1:1)*Math.PI/4;renderLooks();}});
$('creator').addEventListener('close',()=>{creatorDraft=null;creatorDrag=null;});
startRebuiltRealm();
