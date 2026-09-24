'use strict';
let creatorAngle=-.4,creatorFace=false,creatorDrag=null,creatorRenderQueued=false;
const CREATOR_FIELDS=[
 ['frame','Body',['Male','Female']],
 ['hair','Hairstyle',['Side part','Long','Cropped','Shaved','Tousled']],
 ['hairColor','Hair colour',['Black','Brown','Auburn','Blond','Silver','White']],
 ['beard','Facial hair',['Clean shaven','Full beard','Shaped beard']],
 ['skin','Skin colour',['Porcelain','Fair','Warm','Tan','Brown','Deep']],
 ['topStyle','Top',['Peasant shirt','Ranger tunic'],[4,5]],
 ['topColor','Top colour',['Blue','Red','Green','Purple','Ochre','Charcoal','Linen','Brown']],
 ['bottomStyle','Legs & footwear',['Peasant breeches','Ranger trousers'],[3,4]],
 ['bottomColor','Leg colour',['Blue','Red','Green','Purple','Ochre','Charcoal','Linen','Brown']]
];
const CREATOR_SWATCHES={skin:['#e1c3a2','#cda782','#b99370','#aa7c58','#805b42','#593e2d'],hairColor:['#272728','#60432d','#924c30','#bb9552','#b2b4b0','#e2dece'],topColor:['#456e8b','#8d4240','#4b7855','#75558d','#b19a56','#45494d','#c6bfa2','#795139']};
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
 creatorDraft={race:'human',frame:'male',skin:1,hair:0,hairColor:1,beard:0,topStyle:4,topColor:6,bottomStyle:3,bottomColor:7,...s.character};
 for(const [key,,options]of CREATOR_FIELDS)if(!options.some((_,i)=>creatorChoiceValue(key,i)===creatorDraft[key]))creatorDraft[key]=creatorChoiceValue(key,0);
 $('creatorTitle').textContent=edit?'Change your appearance':'Choose your appearance';syncCharacterName();
 $('begin').textContent=edit?'Save appearance':'Begin adventure';$('cancelCreator').hidden=!edit;$('characterSaveError').textContent='';$('creatorZoom').textContent='Face detail';
 buildCreatorControls();$('creator').showModal();renderLooks();
};
// A depth buffer gives the preview the same solid surfaces as the world renderer,
// including overlapping hair, collars and sleeves. Draw only when a choice changes.
function creatorPainter(g,project,width,height){
 const pixels=g.createImageData(width,height),depth=new Float32Array(width*height).fill(-Infinity);
 return {software:true,face(points,color){
  const rgb=color.startsWith('#')?color.slice(1).match(/.{2}/g).map(v=>parseInt(v,16)):color.match(/[\d.]+/g).slice(0,3).map(Number),p=points.map(v=>project(...v));
  for(let i=1;i<p.length-1;i++){
   const a=p[0],b=p[i],c=p[i+1],area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(Math.abs(area)<.001)continue;
   const x0=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),x1=Math.min(width-1,Math.ceil(Math.max(a.x,b.x,c.x))),y0=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),y1=Math.min(height-1,Math.ceil(Math.max(a.y,b.y,c.y)));
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const u=((b.x-x-.5)*(c.y-y-.5)-(b.y-y-.5)*(c.x-x-.5))/area,v=((c.x-x-.5)*(a.y-y-.5)-(c.y-y-.5)*(a.x-x-.5))/area,w=1-u-v;if(u<0||v<0||w<0)continue;
    const z=u*a.depth+v*b.depth+w*c.depth,k=y*width+x;if(z<=depth[k])continue;depth[k]=z;const offset=k*4;pixels.data[offset]=rgb[0];pixels.data[offset+1]=rgb[1];pixels.data[offset+2]=rgb[2];pixels.data[offset+3]=255;
   }
  }
 },flush(){g.putImageData(pixels,0,0);}};
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
