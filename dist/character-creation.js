'use strict';
let creatorAngle=-.4,creatorFace=false;
const CREATOR_FIELDS=[['frame','Body',['Masculine','Feminine']],['skin','Skin tone',['Porcelain','Fair','Warm','Tan','Brown','Deep']],['hair','Hairstyle',['Side part','Long','Cropped','Shaved','Tousled']],['hairColor','Hair color',['Black','Brown','Auburn','Blond','Silver','White']],['beard','Facial hair',['Clean shaven','Full beard','Shaped beard']],['topStyle','Shirt style',['Long sleeves','Sleeveless','Trimmed tunic','Traveler shirt']],['topColor','Shirt color',['Blue','Red','Green','Purple','Ochre','Charcoal','Linen','Brown']],['bottomStyle','Leg style',['Trousers','Breeches & stockings','Loose trousers']],['bottomColor','Leg color',['Blue','Red','Green','Purple','Ochre','Charcoal','Linen','Brown']]];
openCreator=function(edit=false){
 stop();if($('modal').open)$('modal').close();editingCharacter=edit;selectedLook=s.character?.look||0;
 creatorDraft={race:'human',frame:'male',skin:1,hair:0,hairColor:1,beard:0,topStyle:0,topColor:0,bottomStyle:0,bottomColor:5,...s.character};
 $('creatorTitle').textContent=edit?'Your appearance':'Create your adventurer';$('characterName').value=s.character?.name||accountUsername||'';
 $('begin').textContent=edit?'Save appearance':'Begin adventure';$('cancelCreator').hidden=!edit;$('characterSaveError').textContent='';
 const fields=$('appearanceFields');fields.innerHTML='';
 for(const [key,label,options]of CREATOR_FIELDS){const row=document.createElement('label');row.textContent=label;const select=document.createElement('select');select.id='appearance-'+key;select.setAttribute('aria-label',label);for(const [i,name]of options.entries()){const option=document.createElement('option');option.value=key==='frame'?(i?'female':'male'):String(i);option.textContent=name;select.appendChild(option);}select.value=String(creatorDraft[key]);select.onchange=()=>{creatorDraft[key]=key==='frame'?select.value:Number(select.value);renderLooks();};row.appendChild(select);fields.appendChild(row);}
 $('creator').showModal();renderLooks();
};
renderLooks=function(){
 const c=$('characterPreview'),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);shadow(g,c.width/2,c.height-30,70);
 const previous=meshDetail3;meshDetail3=1;const scale=creatorFace?270:125,r=painter3(g,(a,b,c)=>{const p=project3(a,b,c,{yaw:creatorAngle,tilt:.18,zoom:scale},0,0,0,0);return {...p,x:p.x+192,y:p.y+(creatorFace?555:310)};});const gear={_frame:creatorDraft.frame,_appearance:creatorDraft};humanoid3(r,0,0,selectedLook,gear);r.flush();meshDetail3=previous;
 $('lookName').textContent='Clothing preview'+' · '+(creatorDraft?.frame==='female'?'Feminine':'Masculine');
};
$('creatorZoom').onclick=()=>{creatorFace=!creatorFace;$('creatorZoom').textContent=creatorFace?'Full body':'Face detail';renderLooks();};
$('creatorLeft').onclick=()=>{creatorAngle-=Math.PI/4;renderLooks();};$('creatorRight').onclick=()=>{creatorAngle+=Math.PI/4;renderLooks();};
$('creatorRandom').onclick=()=>{for(const [key,,options]of CREATOR_FIELDS){const i=Math.floor(Math.random()*options.length);creatorDraft[key]=key==='frame'?(i?'female':'male'):i;$('appearance-'+key).value=String(creatorDraft[key]);}renderLooks();};
$('creator').addEventListener('close',()=>{creatorDraft=null;});
startRebuiltRealm();
