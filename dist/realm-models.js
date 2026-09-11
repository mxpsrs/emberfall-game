'use strict';
// Replacement model library: human masonry, elven living architecture and dwarven vaults.
function materialRealm(r,material){return {software:r.software,face:(p,c,n)=>r.face(p,c,n,material)};}
function roofRealm(r,x,y,z,w,d,rise,color){const q=materialRealm(r,6),a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],topA=[x,y+rise,z-d/2+.32],topB=[x,y+rise,z+d/2-.32];q.face([a,e,topB,topA],color);q.face([b,topA,topB,c],shade3(color,1.08));q.face([a,topA,b],shade3(color,.86));q.face([e,c,topB],color);beamArt(materialRealm(r,5),topA,topB,.045,'#b6a079');}
function windowRealm(r,x,y,z,w,h,frame='#bca77b',pointed=false){
 const q=materialRealm(r,7),top=y+h/2,base=y-h/2;
 q.face([[x-w/2,base,z],[x+w/2,base,z],[x+w/2,top-.2,z],[x,top+(pointed?.2:0),z],[x-w/2,top-.2,z]],'#31555e');
 for(const side of [-1,1])beamArt(q,[x+side*w/2,base-.03,z+.01],[x+side*w/2,top-.2,z+.01],.035,frame,4);
 beamArt(q,[x-w/2,top-.2,z+.01],[x,top+(pointed?.2:0),z+.01],.035,frame,4);beamArt(q,[x+w/2,top-.2,z+.01],[x,top+(pointed?.2:0),z+.01],.035,frame,4);
 beamArt(q,[x,base,z+.02],[x,top,z+.02],.02,frame,4);beamArt(q,[x-w/2,y,z+.02],[x+w/2,y,z+.02],.025,frame,4);box3(q,x,base-.045,z+.04,w+.15,.09,.15,frame);
}
function doorRealm(r,x,z,w=1,h=1.8,color='#3f3529',frame='#aaa894'){
 const q=materialRealm(r,7);q.face([[x-w/2,.12,z],[x+w/2,.12,z],[x+w/2,h-.25,z],[x,h,z],[x-w/2,h-.25,z]],color);
 for(const side of [-1,1]){beamArt(q,[x+side*(w/2+.055),.1,z+.03],[x+side*(w/2+.055),h-.2,z+.03],.065,frame,5);beamArt(q,[x+side*(w/2+.055),h-.2,z+.03],[x,h+.1,z+.03],.065,frame,5);}
 for(const y of [.55,1.22])box3(q,x,y,z+.035,w*.9,.05,.035,'#81704e');oval3(q,x+w*.24,.87,z+.06,.07,.075,.045,'#d6b875');
 box3(q,x,.06,z+.24,w+.36,.12,.5,frame);
}
function turretRealm(r,x,z,rad,h,color,roof,spire=false){
 const q=materialRealm(r,7);profile3(q,x,h/2,z,rad*2,h,rad*2,[[-.5,1.1],[-.4,1],[.4,1],[.47,1.12],[.5,1.12]],color,a=>a,12);
 for(const y of [.28,h*.55,h-.25])profile3(q,x,y,z,rad*2.08,.13,rad*2.08,[[-.5,1],[.5,1]],shade3(color,.82),a=>a,12);
 if(spire){profile3(materialRealm(r,6),x,h+.75,z,rad*2.6,1.7,rad*2.6,[[-.5,1],[-.32,.95],[.03,.48],[.5,.01]],roof,a=>a,12);beamArt(q,[x,h+1.6,z],[x,h+2.1,z],.025,'#c5af7b');}
 else for(let i=0;i<8;i++){const a=i/8*Math.PI*2;box3(q,x+Math.cos(a)*rad,h+.18,z+Math.sin(a)*rad,.3,.36,.3,color);}
}
function humanBuildingRealm(r,b){
 const stone=materialRealm(r,7),wood=materialRealm(r,5),x=b.x+b.w/2,z=b.y+b.h/2,w=b.w,d=b.h,variant=b.variant||0,roof=['#72556b','#4a6076','#826552','#50665c','#635775'][variant],eave=2.85,front=z+d/2+.12;
 box3(stone,x,.17,z,w+.22,.34,d+.22,'#888b83');box3(stone,x,.88,z,w,1.45,d,'#b7b6a2');box3(stone,x,2.13,z,w+.16,1.26,d+.16,'#d3c8a6');
 for(const side of [-1,1]){box3(wood,x+side*(w/2+.055),2.12,z,.13,1.45,d+.18,'#5c4b37');for(const y of [1.47,2.81])box3(wood,x,y,z+side*(d/2+.10),w+.28,.13,.14,'#594a39');}
 for(let i=0;i<4;i++){const xx=x-w/2+i*w/3;box3(wood,xx,2.13,front,.095,1.36,.095,'#69533b');if(i<3)beamArt(wood,[xx,1.51,front+.01],[xx+w/3,2.73,front+.01],.045,'#79603f',4);}
 roofRealm(r,x,eave,z,w+.65,d+.6,1.22,roof);
 // A true projecting dormer, rather than a painted square on the roof.
 if(w>=4){box3(stone,x-w*.23,3.13,z+d*.27,.82,.55,.55,'#c6b996');roofRealm(r,x-w*.23,3.4,z+d*.27,1.02,.83,.52,roof);windowRealm(r,x-w*.23,3.16,z+d*.27+.29,.39,.46);}
 const doorX=b.service?b.service.x+.5:x;doorRealm(r,doorX,front+.015,.8,1.5);
 for(const side of [-1,1]){const wx=x+side*w*.31;windowRealm(r,wx,2.12,front+.015,.58,.91);if(Math.abs(wx-doorX)>.65)windowRealm(r,wx,.91,front+.005,.48,.66);}
 for(const side of [-1,1]){const sideR={software:r.software,face:(p,c,n,m)=>r.face(p.map(([xx,yy,zz])=>[x+side*(zz-z),yy,z+(xx-x)]),c,null,m)};for(const off of [-.23,.23])windowRealm(sideR,x+off*d,2.1,z+w/2+.10,.61,.85);}
 box3(stone,x+w*.3,3.27,z-d*.26,.52,1.82,.57,'#999b90');box3(stone,x+w*.3,4.22,z-d*.26,.69,.17,.73,'#737970');
 if(b.archetype==='shop'){for(let i=0;i<6;i++){const a=x-w*.43+i*w*.86/6;r.face([[a,1.65,front+.05],[a+w*.86/6,1.65,front+.05],[a+w*.86/6,1.25,front+.85],[a,1.25,front+.85]],i%2?'#d8c99c':'#536a71',null,7);}for(const side of [-1,1])beamArt(wood,[x+side*w*.43,.1,front+.85],[x+side*w*.43,1.3,front+.85],.055,'#755a3b');}
 else if(b.archetype==='forge'){turretRealm(r,x+w*.28,z-d*.15,.4,4.1,'#777f80','#4f6270');}
 else{box3(wood,doorX,1.71,front+.24,1.35,.1,.5,'#70543b');for(const side of [-1,1])beamArt(wood,[doorX+side*.59,1.3,front+.04],[doorX+side*.59,1.68,front+.44],.04,'#70543b');}
}
function elvenBuildingRealm(r,b){
 const x=b.x+b.w/2,z=b.y+b.h/2,w=b.w,d=b.h,wood=materialRealm(r,5),ivory=materialRealm(r,7),color=['#428475','#54816b','#3f6c82','#707d68','#456f66'][b.variant||0];
 profile3(wood,x,1.65,z,w,2.7,d,[[-.5,.72],[-.36,.92],[.26,.9],[.5,.67]],'#a7a98b',a=>a,10);
 // Sweeping root buttresses become the ribs of the roof.
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a),points=[[x+dx*w*.63,.04,z+dz*d*.63],[x+dx*w*.48,.8,z+dz*d*.48],[x+dx*w*.41,2.45,z+dz*d*.41],[x+dx*w*.2,3.6,z+dz*d*.2]];for(let j=0;j<3;j++)beamArt(ivory,points[j],points[j+1],j===0?.12:.075,'#d3cdad',7);}
 profile3(materialRealm(r,7),x,3.4,z,w*1.4,2.7,d*1.4,[[-.5,1],[-.35,.88],[-.1,.48],[.25,.25],[.5,.025]],color,a=>a,12);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;beamArt(ivory,[x+Math.cos(a)*w*.67,2.07,z+Math.sin(a)*d*.67],[x+Math.cos(a)*w*.35,3.25,z+Math.sin(a)*d*.35],.025,'#a8bd94',5);}
 oval3(ivory,x,4.95,z,.22,.36,.22,'#b2d7c5');const doorX=b.service?b.service.x+.5:x;doorRealm(r,doorX,z+d*.46+.045,.86,1.9,'#3b6555','#d2c8a5');
 for(const side of [-1,1])windowRealm(r,x+side*w*.29,1.65,z+d*.40+.035,.47,1.35,'#d9ce9b',true);
 profile3(ivory,x,.17,z,w*1.1,.16,d*1.1,[[-.5,1],[.5,1]],'#b7b99d',a=>a,10);
}
function dwarfBuildingRealm(r,b){
 const x=b.x+b.w/2,z=b.y+b.h/2,w=b.w,d=b.h,q=materialRealm(r,7),metal=materialRealm(r,8),front=z+d/2+.03;
 profile3(q,x,1.3,z,w,2.6,d,[[-.5,1.05],[-.38,1],[.38,1],[.5,.83]],'#78848b',a=>a,8);
 profile3(q,x,2.8,z,w*1.12,.65,d*1.12,[[-.5,1],[.05,1],[.5,.72]],'#a6aaa0',a=>a,8);
 box3(q,x,3.28,z,w*.69,.36,d*.72,'#676c72');box3(metal,x,3.54,z,w*.48,.16,d*.51,'#9e8053');
 for(const side of [-1,1]){const bx=x+side*w*.39;profile3(q,bx,1.3,front,.5,2.6,.68,[[-.5,1.4],[.3,1],[.5,.8]],'#a3a798',a=>a,6);box3(metal,bx,1.63,front+.32,.44,.13,.08,'#b09665');windowRealm(r,x+side*w*.27,1.62,front+.08,.4,.7,'#c3a778');}
 const doorX=b.service?b.service.x+.5:x;doorRealm(r,doorX,front+.09,1.03,2.14,'#343f48','#b9b8a0');
 for(const y of [.5,1.05,1.6])box3(metal,doorX,y,front+.14,.83,.075,.055,'#b09461');
 if(b.archetype==='forge'||b.archetype==='mine'){for(const side of [-1,1]){box3(q,x+side*w*.3,3.6,z-d*.26,.55,1.8,.55,'#596770');box3(metal,x+side*w*.3,4.49,z-d*.26,.7,.16,.7,'#b69361');}}
 else{profile3(metal,x,3.66,z,.7,.22,.7,[[-.5,1],[.5,1]],'#b19459',a=>a,8);}
}
function castleRealm(r,b){
 const x=b.x+b.w/2,z=b.y+b.h/2,w=b.w,d=b.h,race=b.race,q=materialRealm(r,7),stone=race==='dwarf'?'#849095':race==='elf'?'#bbbda4':'#b8b5a2',roof=race==='elf'?'#438779':race==='dwarf'?'#66737e':'#555e85';
 if(race==='elf'){
  elvenBuildingRealm(r,{...b,x:x-3,y:z-3,w:6,h:6,service:{x:x-.5}});for(const side of [-1,1]){turretRealm(r,x+side*w*.32,z+d*.18,1.05,5.5,stone,roof,true);for(let i=0;i<3;i++)beamArt(q,[x+side*w*.4,.1,z+2-i*1.8],[x+side*1.1,4.6,z+1-i*.7],.16,'#c6c6a7',8);}profile3(q,x,5.6,z,2.1,3.6,2.1,[[-.5,1],[0,.7],[.5,.01]],'#729e8a');
 }else{
  box3(q,x,1.7,z-d*.15,w*.64,3.4,d*.63,stone);box3(q,x,3.95,z-d*.17,w*.45,1.1,d*.45,stone);roofRealm(r,x,4.5,z-d*.17,w*.51,d*.51,1.5,roof);
  for(const side of [-1,1])for(const end of [-1,1])turretRealm(r,x+side*(w/2-1),z+end*(d/2-1),.94,end===1?4.5:5.3,stone,roof,race!=='dwarf');
  for(const side of [-1,1]){box3(q,x+side*(w/2-.65),1.65,z,1,3.3,d-1.4,stone);box3(q,x+side*(w*.3),1.6,z+d/2-.7,w*.3,3.2,.9,stone);}
  box3(q,x,1.5,z-d/2+.6,w-1.4,3,.9,stone);arch3(r,x,z+d/2-.7,3.6,.95,1.5);
  for(let i=0;i<9;i++){const xx=x-w/2+.8+i*(w-1.6)/8;box3(q,xx,3.37,z-d/2+.6,.45,.55,.98,stone);if(Math.abs(xx-x)>1.8)box3(q,xx,3.35,z+d/2-.7,.43,.45,.92,stone);}
  for(const side of [-1,1])windowRealm(r,x+side*1.8,3,z+d*.16,.65,1.25,'#d0c29e',true);
 }
 const flagY=race==='elf'?8.1:7.5;beamArt(q,[x,flagY-1.7,z],[x,flagY,z],.04,'#c7b47b');r.face([[x,flagY,z],[x+1.0,flagY-.15,z],[x+.78,flagY-.55,z],[x,flagY-.55,z]],race==='elf'?'#578f80':race==='dwarf'?'#b4864c':'#946578',null,7);
}
const oldRealmBuilding=building3;
building3=function(r,b){if(b.arch){arch3(r,b.x+b.w/2,b.y+b.h/2,b.w,b.h,1.8);return;}if(!b.archetype&&/Mine|Crypt|ruins|beacon/.test(b.name)){oldRealmBuilding(r,b);return;}if(b.archetype==='castle')return castleRealm(r,b);if(b.race==='elf')elvenBuildingRealm(r,b);else if(b.race==='dwarf')dwarfBuildingRealm(r,b);else humanBuildingRealm(r,b);};

// Anatomical, articulated replacements, shared by players, residents and portraits.
humanoid3=function(r,x,z,look,gear={},heading=0,walk=0,attack=0,size=1){
 const race=gear._race||'human',dwarf=race==='dwarf',elf=race==='elf',bones=gear._bones,scale=size*(dwarf?.76:elf?1.06:1),bulk=dwarf?1.32:elf?.88:1,c=Math.cos(heading),sn=Math.sin(heading),bob=Math.abs(Math.sin(walk))*.025,root=([a,b,d])=>[x+(a*c+d*sn)*scale,(b+bob)*scale,z+(-a*sn+d*c)*scale];
 const skin=gear._skin||['#d6ae8c','#ab7b58','#e0bc9a','#875e46'][look%4],hair=dwarf?'#846048':['#61442f','#3b302b','#ad8c5c','#303340'][look%4],cloth=['#446c83','#74784e','#954f5c','#70618a'][look%4],robe=gear.body==='mageRobe',armor=robe?'#74658e':gear.body?'#7b563c':cloth,iron='#a9b6ba',leather='#544234';
 const part=(a,b,d,w,h,dep,col,t=root)=>profile3(r,a,b,d,w,h,dep,[[-.5,.45],[-.28,.87],[.14,1],[.4,.83],[.5,.5]],col,t,12);
 // Shoulder blades, chest and waist form one tapered torso, not separate balls.
 profile3(r,0,1.23,0,.58*bulk,.65,.33,[[-.5,.7],[-.2,.8],[.24,1],[.43,.94],[.5,.54]],bones?'#cfcab0':cloth,root,12);
 if(gear.body&&!bones){profile3(r,0,1.22,.005,.60*bulk,.59,.35,[[-.5,.73],[-.23,.82],[.24,1],[.44,.9],[.5,.55]],armor,root,12);for(const side of [-1,1]){surface3(r,[[side*.035,.98,.177],[side*.24*bulk,1.30,.168],[side*.17*bulk,1.46,.13],[side*.015,1.22,.185]].map(root),robe?'#b49fc2':'#b38b5c');beamArt({face:(p,col)=>r.face(p.map(root),col)},[side*.16*bulk,1.45,-.13],[side*.19*bulk,1.37,.14],.025,'#bca06f');}}
 if(bones){for(let i=0;i<4;i++){const yy=1.1+i*.09;part(0,yy,.14,.46-i*.025,.04,.13,'#e3dbc0');}part(0,1.22,0,.075,.55,.1,'#dbd2b4');}
 profile3(r,0,.91,0,.46*bulk,.105,.32,[[-.5,1],[.5,1]],leather,root);box3(r,0,.91,.166,.105,.075,.04,'#d2b673',root);
 if(robe)profile3(r,0,.59,0,.64*bulk,.57,.44,[[-.5,1],[-.1,.87],[.5,.64]],armor,root,12);
 else if(gear.body)for(const side of [-1,1])surface3(r,[[side*.025,.87,.16],[side*.22*bulk,.87,.14],[side*.25*bulk,.68,.18],[side*.045,.66,.2]].map(root),armor);
 part(0,1.59,0,.15,.18,.17,skin);
 profile3(r,0,1.80,0,.29,.36,.30,[[-.5,.53],[-.23,.83],[.05,1],[.34,.92],[.5,.7]],bones?'#dfd9bd':skin,root,14);
 for(const side of [-1,1]){part(side*.068,1.82,.142,bones?.07:.036,bones?.085:.028,.015,'#26343c');part(side*.065,1.865,.138,.09,.018,.026,hair);if(elf||race==='goblin')surface3(r,[[side*.12,1.83,0],[side*.29,1.97,-.025],[side*.15,1.73,.035]].map(root),skin);else part(side*.15,1.8,0,.045,.09,.075,skin);}
 surface3(r,[[-.024,1.83,.151],[.024,1.83,.151],[0,1.73,.205],[0,1.71,.145]].map(root),skin);part(0,1.7,.13,.09,.019,.025,bones?'#827a69':'#9c6e57');
 if(!bones){profile3(r,0,1.955,-.015,.325,.15,.33,[[-.5,1],[.1,.93],[.5,.3]],gear.head?iron:hair,root,14);if(gear.head){for(const side of [-1,1])surface3(r,[[side*.154,1.93,-.08],[side*.158,1.9,.13],[side*.137,1.71,.11],[side*.135,1.74,-.03]].map(root),iron);box3(r,0,1.917,.145,.3,.05,.04,'#ced2bf',root);}else{for(const side of [-1,1])part(side*.12,1.86,-.09,.085,.23,.14,hair);part(0,1.85,-.135,.26,.23,.055,hair);}if(dwarf)profile3(r,0,1.56,.16,.34,.5,.2,[[-.5,.28],[-.15,.85],[.5,1]],hair,root,10);}
 for(const side of [-1,1]){
  const legAngle=Math.sin(walk)*.47*side,knee=Math.max(0,-Math.sin(walk)*side)*.55,leg=([a,b,d])=>{const yy=b-.86;return root([a,.86+yy*Math.cos(legAngle)-d*Math.sin(legAngle),yy*Math.sin(legAngle)+d*Math.cos(legAngle)]);},calf=([a,b,d])=>{const yy=b-.45;return leg([a,.45+yy*Math.cos(knee)-d*Math.sin(knee),yy*Math.sin(knee)+d*Math.cos(knee)]);},lx=side*.13*bulk;
  part(lx,.66,0,bones?.075:.20,.43,.22,bones?'#d5cdb0':'#414b55',leg);part(lx,.44,.012,.15,.13,.18,bones?'#d5cdb0':leather,leg);part(lx,.25,0,bones?.06:.15,.33,.19,gear.feet?leather:'#46515a',calf);
  profile3(r,lx,.075,.075,.195,.15,.34,[[-.5,.95],[.05,1],[.5,.65]],gear.feet?leather:'#5d655f',calf);if(gear.feet){profile3(r,lx,.36,0,.18,.06,.205,[[-.5,1],[.5,1]],'#a88b60',calf);box3(r,lx,.04,.12,.2,.055,.35,'#323d3d',calf);}
  const angle=-Math.sin(walk)*.42*side+(side===1?-attack*1.55:attack*.2),arm=([a,b,d])=>{const yy=b-1.42;return root([a,1.42+yy*Math.cos(angle)-d*Math.sin(angle),yy*Math.sin(angle)+d*Math.cos(angle)]);},ax=side*.33*bulk;
  part(ax,1.40,0,.23,.22,.29,armor,arm);part(ax,1.23,0,bones?.075:.17,.33,.19,bones?'#d8d0b3':armor,arm);part(ax,1.055,.005,.13,.14,.145,skin,arm);part(ax,.91,.035,bones?.065:.135,.25,.16,skin,arm);part(ax,.755,.045,.13,.15,.15,skin,arm);
  if(gear.body){profile3(r,ax,.90,.035,.149,.19,.18,[[-.5,.82],[.5,1]],leather,arm);profile3(r,ax,1.43,0,.25,.17,.30,[[-.5,1],[.1,1],[.5,.65]],robe?armor:'#a28156',arm);}
  if(side===1&&gear.weapon){const gr={face:(p,col,n,m)=>r.face(p.map(arm),col,null,m)},wx=ax;
   if(gear.weapon==='oakStaff'){beamArt(gr,[wx,.1,.045],[wx,1.99,.045],.035,'#80633e');profile3(gr,wx,2.05,.045,.2,.32,.2,[[-.5,.5],[0,1],[.5,.1]],'#8dc8c7');}
   else if(gear.weapon==='shortbow'){const p=Array.from({length:11},(_,i)=>[wx,.25+i*.11,.045+Math.sin(i/10*Math.PI)*.26]);for(let i=0;i<10;i++)beamArt(gr,p[i],p[i+1],.025,'#a68b57');beamArt(gr,p[0],p[10],.008,'#d8d0b5',4);}
   else{beamArt(gr,[wx,.66,.045],[wx,.91,.045],.04,leather);beamArt(gr,[wx-.16,.91,.045],[wx+.16,.91,.045],.027,'#c4ad78');const col=gear.weapon==='bronzeSword'?'#b9a176':iron;for(const face of [[[-.065,.94,0],[0,1.87,0],[0,.95,.04]],[[0,.95,.04],[0,1.87,0],[.065,.94,0]]])surface3(gr,face.map(([a,b,d])=>[wx+a,b,.045+d]),col);}
  }
  if(side===-1&&gear.shield){const p=[[ax-.11,1.2,-.2],[ax-.11,1.2,.25],[ax-.11,.84,.31],[ax-.11,.54,.04],[ax-.11,.84,-.27]],mid=[ax-.19,.92,.04];for(let i=0;i<5;i++){surface3(r,[p[i],p[(i+1)%5],mid].map(arm),iron);beamArt({face:(p,c)=>r.face(p.map(arm),c)},p[i],p[(i+1)%5],.018,'#d0ba88',5);}part(ax-.20,.95,.04,.045,.15,.15,'#c6ac72',arm);}
 }
};
const oldRealmCreature=creature3;
creature3=function(r,o,x,z){if(o.race){const moving=Math.hypot((o.drawX??o.x)-o.x,(o.drawY??o.y)-o.y)>.02;humanoid3(r,x,z,(o.sprite||0)%4,{body:o.race==='elf'?'mageRobe':'leatherArmor',_race:o.race},Math.atan2(px-x,py-z),moving?time*8:0);return o.race==='dwarf'?1.8:2.3;}return oldRealmCreature(r,o,x,z);};
const oldRealmProp=prop3;
prop3=function(r,o,x,z){
 if(o.type==='tree'){
  const elf=o.race==='elf'||/Silverwood/.test(o.name),pine=/pine/i.test(o.name),seed=o.id||1,wood=elf?'#a7a68e':'#776044',h=elf?5.5:4.1;
  profile3(materialRealm(r,5),x,h*.30,z,elf?.53:.46,h*.6,elf?.5:.43,[[-.5,1.6],[-.38,1],[.18,.67],[.5,.36]],wood,a=>a,10);
  for(let i=0;i<5;i++){const a=seed+i*2.4,dx=Math.cos(a),dz=Math.sin(a);beamArt(r,[x,.2,z],[x+dx*.72,.025,z+dz*.72],.09,wood);const p=[[x,1.2,z],[x+dx*.35,2.2,z+dz*.35],[x+dx*1.03,h-.65+(i%2)*.2,z+dz*.9]];for(let j=0;j<2;j++)beamArt(r,p[j],p[j+1],.10-j*.045,wood);}
  if(pine){for(let i=0;i<5;i++)profile3(r,x,1.5+i*.55,z,2.1-i*.31,1.25,2-i*.3,[[-.5,1],[-.31,.92],[.5,.03]],i%2?'#477965':'#376451',a=>a,10);}
  else for(let i=0;i<7;i++){const a=seed+i*2.4,rad=i===6?0:.75,yy=h-.8+(i===6?.65:(i%3)*.14);profile3(r,x+Math.cos(a)*rad,yy,z+Math.sin(a)*rad,1.45,1.2,1.35,[[-.5,.28],[-.27,.86],[.05,1],[.33,.74],[.5,.14]],elf?['#537e6d','#70a182','#86ad8b'][i%3]:['#65834b','#79924f','#517640'][i%3],a=>a,10);}
  return h+.65;
 }
 if(o.name==='Mountain outcrop'){for(let i=0;i<3;i++)profile3(r,x+(i-1)*.56,.75+i*.23,z+(i%2)*.25,1.15,1.5+i*.5,1.1,[[-.5,1],[.1,.8],[.5,.16]],['#7c8b90','#97a29d','#687c83'][i],a=>a,5);return 2.8;}
 if(o.type==='prop'){
  const q=materialRealm(r,5);if(/table/i.test(o.name)){box3(q,x,.72,z,1.5,.14,.85,'#987b50');for(const a of [-1,1])for(const b of [-1,1])box3(q,x+a*.57,.34,z+b*.28,.1,.7,.1,'#65503a');box3(r,x,.84,z,.34,.08,.22,'#d5c9a8');return 1;}
  if(/Bookcase/.test(o.name)){box3(q,x,.78,z,.9,1.56,.38,'#624e39');for(const y of [.32,.7,1.1]){box3(q,x,y,z+.2,.93,.07,.12,'#aa8a56');for(let i=0;i<5;i++)box3(r,x-.32+i*.16,y+.16,z+.18,.11,.27,.25,['#7c635e','#63796b','#66788b','#b19c6b'][i%4]);}return 1.7;}
  if(/Bed/.test(o.name)){box3(q,x,.27,z,.8,.44,1.45,'#745b3b');box3(r,x,.52,z,.76,.17,1.35,'#b9b08d');box3(r,x,.62,z+.18,.77,.06,.9,'#567a73');box3(r,x,.65,z-.48,.56,.15,.29,'#e0d6b3');return .8;}
  if(/throne/.test(o.name)){box3(q,x,.42,z,.85,.8,.8,'#76604c');box3(r,x,1.1,z-.29,.95,1.5,.17,'#aa9465');box3(r,x,.95,z-.19,.58,.84,.06,'#7a5266');return 2;}
  if(/pillar|Altar/.test(o.name)){profile3(r,x,/pillar/.test(o.name)?1.4:.45,z,.65,/pillar/.test(o.name)?2.8:.9,.65,[[-.5,1.3],[-.4,1],[.4,1],[.5,1.3]],'#b0b4a0',a=>a,10);return /pillar/.test(o.name)?3:1.1;}
 }
 return oldRealmProp(r,o,x,z);
};
// The canvas fallback also streams nearby terrain instead of allocating a continent-sized bitmap.
const groundChunksRealm=new Map();
drawTerrainLayer3=function(){
 const unit=16,[mw,mh]=sceneSize(),corners=[[0,0],[screen.w,0],[screen.w,screen.h],[0,screen.h]].map(p=>unproject3(...p)),minx=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.x))/8)*8),maxx=Math.min(mw,Math.ceil(Math.max(...corners.map(p=>p.x))/8)*8),minz=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.z))/8)*8),maxz=Math.min(mh,Math.ceil(Math.max(...corners.map(p=>p.z))/8)*8),c=Math.cos(view3d.yaw),sn=Math.sin(view3d.yaw),st=Math.sin(view3d.tilt),k=cameraZoom3()/unit;
 for(let z=minz;z<maxz;z+=8)for(let x=minx;x<maxx;x+=8){const key=currentScene+':'+x+':'+z;let tile=groundChunksRealm.get(key);if(!tile){tile=document.createElement('canvas');tile.width=tile.height=unit*8;const g=tile.getContext('2d');for(let yy=0;yy<8&&z+yy<mh;yy++)for(let xx=0;xx<8&&x+xx<mw;xx++){const t=terrainType(x+xx,z+yy);g.fillStyle=shade3(['#628047','#aa956e','#989e8a','#427e89'][t],.96+.06*Math.sin((x+xx)*.7+(z+yy)*.3));g.fillRect(xx*unit,yy*unit,unit,unit);if(t===2){g.strokeStyle='#798372';g.strokeRect(xx*unit+1,yy*unit+1,7,6);g.strokeRect(xx*unit+8,yy*unit+8,7,6);}}groundChunksRealm.set(key,tile);if(groundChunksRealm.size>200)groundChunksRealm.delete(groundChunksRealm.keys().next().value);}
 const origin=project3(x,0,z);ctx.save();ctx.transform(k*c,k*sn*st,-k*sn,k*c*st,origin.x,origin.y);ctx.drawImage(tile,0,0);ctx.restore();}
};
