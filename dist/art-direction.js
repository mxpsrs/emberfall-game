'use strict';
// One material palette for architecture, creatures, equipment and inventory art.
const realmMaterials={stone:'#9b9b82',stoneDark:'#6f796b',plaster:'#c7bb92',timber:'#665039',oak:'#99794f',leather:'#88623d',iron:'#aab5b2',gold:'#c6a467',cloth:'#587e80'};
function beamArt(r,a,b,radius,color,sides=6){const dy=b[1]-a[1],dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz)||1,up=[dx/len,dy/len,dz/len],side=Math.abs(up[1])<.95?[up[2],0,-up[0]]:[1,0,0],sl=Math.hypot(...side);for(let i=0;i<3;i++)side[i]/=sl;const out=[up[1]*side[2]-up[2]*side[1],up[2]*side[0]-up[0]*side[2],up[0]*side[1]-up[1]*side[0]],rings=[a,b].map(p=>Array.from({length:sides},(_,i)=>p.map((v,j)=>v+radius*(Math.cos(i/sides*Math.PI*2)*side[j]+Math.sin(i/sides*Math.PI*2)*out[j]))));for(let i=0;i<sides;i++)surface3(r,[rings[0][i],rings[1][i],rings[1][(i+1)%sides],rings[0][(i+1)%sides]],color);}
function crownArt(r,x,y,z,w,h,d,color,seed){const n=meshDetail3<1?6:9,rows=[[-.45,.45],[-.2,1],[.2,.91],[.5,.23]].map(([yy,rr],j)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,k=rr*(.88+.13*Math.sin(i*2.37+seed+j));return [x+Math.cos(a)*w*k*.5,y+yy*h,z+Math.sin(a)*d*k*.5];}));for(let j=0;j<3;j++)for(let i=0;i<n;i++)surface3(r,[rows[j][i],rows[j][(i+1)%n],rows[j+1][(i+1)%n],rows[j+1][i]],color);r.face(rows[3],shade3(color,1.12));}
const originalPropArt=prop3;
prop3=function(r,o,x,z){
 if(o.type==='tree'){
  const seed=o.id||1,pine=/Pine/.test(o.name),h=2.6+(seed%4)*.13;profile3(r,x,.8,z,.44,1.6,.38,[[-.5,1.5],[-.35,.95],[.5,.52]],'#755435');
  for(let i=0;i<3;i++){const a=seed+i*2.1,dx=Math.cos(a),dz=Math.sin(a);beamArt(r,[x,.08,z],[x+dx*.5,.035,z+dz*.5],.065,'#735a3a');beamArt(r,[x,1.1,z],[x+dx*.55,1.9,z+dz*.55],.085,'#735435');}
  if(pine){for(let i=0;i<4;i++)crownArt(r,x,1.22+i*.45,z,1.95-i*.36,1,1.8-i*.32,i%2?'#50724a':'#3e6541',seed+i);}
  else{crownArt(r,x,2.1,z,2.15,1.35,1.85,'#5d7b44',seed);crownArt(r,x-.3,h,z+.15,1.45,.85,1.3,'#78934e',seed+3);crownArt(r,x+.62,1.9,z-.22,.9,.85,1,'#4b703d',seed+6);}return h+.5;
 }
 if(o.type==='ore'){crownArt(r,x,.32,z,.95,.65,.8,'#7f8980',o.id||0);crownArt(r,x-.24,.51,z-.1,.45,.5,.5,'#a5b0a5',4);r.face([[x-.29,.58,z-.05],[x+.05,.49,z+.21],[x+.12,.44,z+.18],[x-.24,.54,z-.11]],'#c4b38c');return .85;}
 if(o.type==='prop'&&/fence/i.test(o.name)){for(const side of [-1,1])box3(r,x+side*.4,.43,z,.13,.86,.13,'#7a6344');for(const y of [.3,.66])beamArt(r,[x-.5,y,z],[x+.5,y,z],.055,'#9c8257');return 1;}
 if(o.type==='prop'&&/well/i.test(o.name)){profile3(r,x,.37,z,.98,.74,.98,[[-.5,1],[.5,1]],'#9e9e86');profile3(r,x,.75,z,.77,.05,.77,[[-.5,1],[.5,1]],'#354f51');for(const side of [-1,1])box3(r,x+side*.48,1.2,z,.12,1.25,.12,'#71593c');box3(r,x,1.87,z,1.3,.13,.9,'#866147');return 2;}
 return originalPropArt(r,o,x,z);
};
const originalBuildingArt=building3;
building3=function(r,b){
 if(b.arch||/Mine|Crypt|ruins|beacon/.test(b.name)){originalBuildingArt(r,b);return;}
 const m=realmMaterials,x=b.x+b.w/2,z=b.y+b.h/2,w=b.w,d=b.h,shop=b.sprite===2,forge=b.sprite===1,roof=shop?'#516963':forge?'#636d78':'#995e46',h=2.05;
 box3(r,x,.18,z,w+.15,.36,d+.15,m.stoneDark);box3(r,x,1.14,z,w,1.95,d,m.plaster);
 for(const side of [-1,1])for(const zz of [-1,1])box3(r,x+side*(w/2-.06),1.17,z+zz*(d/2-.06),.16,2.12,.16,m.timber);
 for(const y of [.43,1.55,2.04]){box3(r,x,y,z+d/2+.015,w,.1,.07,m.timber);box3(r,x,y,z-d/2-.015,w,.1,.07,m.timber);}
 const a=[x-w/2-.2,h,z-d/2-.25],bb=[x+w/2+.2,h,z-d/2-.25],c=[x+w/2+.2,h,z+d/2+.25],dd=[x-w/2-.2,h,z+d/2+.25],e=[x,h+1.25,z-d/2-.25],f=[x,h+1.25,z+d/2+.25];r.face([a,dd,f,e],shade3(roof,.83));r.face([bb,e,f,c],shade3(roof,1.1));r.face([dd,c,f],'#c3b590');r.face([a,e,bb],'#b7ad8b');
 for(const side of [-1,1]){beamArt(r,[x,h+1.25,z+d/2+.26],[x+side*(w/2+.2),h,z+d/2+.26],.055,m.timber);for(let i=1;i<5;i++){const u=i/5;beamArt(r,[x+side*(w/2+.2)*u,h+1.25*(1-u),z-d/2-.25],[x+side*(w/2+.2)*u,h+1.25*(1-u),z+d/2+.25],.013,shade3(roof,.69),4);}}
 const doorX=b.service?b.service.x+.5:x;box3(r,doorX,.76,z+d/2+.035,.66,1.48,.055,'#433a2c');for(const side of [-1,1])box3(r,doorX+side*.38,.78,z+d/2+.08,.12,1.6,.15,m.stone);box3(r,doorX,1.59,z+d/2+.08,.86,.14,.15,m.stone);box3(r,doorX,.73,z+d/2+.08,.035,1.4,.025,m.oak);oval3(r,doorX+.22,.75,z+d/2+.1,.05,.075,.025,m.gold,a=>a,6);
 for(let i=0;i<2;i++)box3(r,doorX,.08+i*.07,z+d/2+.47-i*.19,1,.14,.35,'#aba68a');
 for(const side of [-1,1]){const wx=x+side*w*.31;if(Math.abs(wx-doorX)>.6){box3(r,wx,1.1,z+d/2+.025,.48,.64,.045,'#3d575a');for(const dx of [-.28,.28])box3(r,wx+dx,1.1,z+d/2+.08,.075,.75,.1,m.timber);box3(r,wx,1.1,z+d/2+.075,.028,.65,.03,'#b69c69');box3(r,wx,.75,z+d/2+.12,.65,.08,.25,m.oak);}}
 r.face([[x-.2,2.52,z+d/2+.26],[x,2.82,z+d/2+.26],[x+.2,2.52,z+d/2+.26],[x,2.22,z+d/2+.26]],'#475c59');
 if(shop){for(let i=0;i<6;i++){const ax=x-w*.4+i*w*.8/6;r.face([[ax,1.73,z+d/2+.14],[ax+w*.8/6,1.73,z+d/2+.14],[ax+w*.8/6,1.46,z+d/2+.68],[ax,1.46,z+d/2+.68]],i%2?'#c6b78c':'#737b53');}}
 else if(forge){box3(r,x+w*.27,2.43,z-d*.24,.53,1.8,.53,'#92917b');box3(r,x+w*.27,3.36,z-d*.24,.65,.16,.65,'#747c70');}
 else{for(const side of [-1,1])box3(r,doorX+side*.65,.78,z+d/2+.64,.1,1.56,.1,m.timber);r.face([[doorX-.85,1.76,z+d/2+.05],[doorX+.85,1.76,z+d/2+.05],[doorX+.85,1.6,z+d/2+.78],[doorX-.85,1.6,z+d/2+.78]],roof);}
};
const originalCreatureArt=creature3;
creature3=function(r,o,x,z){
 if(!['wolf','ridgewolf','rat'].includes(o.kind))return originalCreatureArt(r,o,x,z);
 return quadrupedArt(r,o,x,z);
};
function quadrupedArt(r,o,x,z,heading=Math.atan2(px-x,py-z),phase=time*9){
 const rat=o.kind==='rat',k=rat?.58:1,col=rat?'#897766':o.kind==='ridgewolf'?'#afb8ad':'#78867a',c=Math.cos(heading),ss=Math.sin(heading),rr={face(points,color){r.face(points.map(([a,b,d])=>[x+(a*c+d*ss)*k,b*k,z+(-a*ss+d*c)*k]),color);}},moving=Math.hypot(o.drawX-o.x,o.drawY-o.y)>.02;
 profile3(rr,0,.51,0,.48,.5,1.04,[[-.5,.65],[-.15,1],[.3,.9],[.5,.56]],col);
 profile3(rr,0,.72,.35,.42,.62,.43,[[-.5,.75],[0,1],[.5,.6]],col);oval3(rr,0,.92,.47,.33,.34,.42,col);oval3(rr,0,.84,.72,.22,.18,.36,'#b0b09a');oval3(rr,0,.87,.89,.15,.1,.07,'#35453f');
 for(const side of [-1,1]){cone3(rr,side*.12,1.02,.4,.09,rat?.12:.25,col,5);oval3(rr,side*.15,.96,.6,.035,.043,.045,'#293b32');}
 for(const a of [-1,1])for(const b of [-1,1]){const stride=moving?Math.sin(phase+a*b)*.09:0;beamArt(rr,[a*.17,.5,b*.33],[a*.18,.22,b*.36+stride],.066,col);beamArt(rr,[a*.18,.22,b*.36+stride],[a*.18,.08,b*.33+stride],.04,col);oval3(rr,a*.18,.06,b*.33+.05+stride,.14,.12,.22,col);}
 beamArt(rr,[0,.57,-.45],[0,.48,-.78],rat?.035:.085,col);beamArt(rr,[0,.48,-.78],[.08,.26,-1],rat?.025:.05,col);return 1.3*k;
};
// Item silhouettes use the same materials and lighting as worn equipment.
function drawRealmItem(g,id){const w=g.canvas?.width||96,h=g.canvas?.height||96,v={yaw:-.45,tilt:.4,zoom:Math.min(w,h)*.55},project=(x,y,z)=>{const p=project3(x,y,z,v,0,0,0,0);p.x+=w/2;p.y+=h*.86;return p;},r=painter3(g,project),m=realmMaterials,prev=meshDetail3;meshDetail3=1;
 if(ITEMS[id]?.modelTint||ITEMS[id]?.modelScale){const mesh=wornModularMesh('male',id);if(mesh){const [lo,hi]=mesh.bounds,k=1.3/Math.max(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2]);briarEmit(r,mesh,briarTransform(-(lo[0]+hi[0])*k/2,.78-(lo[1]+hi[1])*k/2,-(lo[2]+hi[2])*k/2,k));}}
 else if(id==='copperNecklace'){briarEmit(r,modularMesh('male','Emberfall_Necklace'),briarTransform(0,-5.05,.14,4));}
 else if(/Sword/.test(id)){beamArt(r,[0,.05,0],[0,.35,0],.055,m.leather);beamArt(r,[-.23,.35,0],[.23,.35,0],.045,m.gold);const metal=id==='bronzeSword'?'#c9a16b':m.iron;r.face([[-.095,.4,0],[0,1.48,0],[0,.4,.05]],metal);r.face([[0,.4,.05],[0,1.48,0],[.095,.4,0]],shade3(metal,1.18));}
 else if(ITEMS[id]?.style==='ranged'&&ITEMS[id]?.slot==='weapon'){const pts=Array.from({length:9},(_,i)=>[Math.sin(i/8*Math.PI)*.38,.1+i/8*1.25,0]);for(let i=0;i<8;i++)beamArt(r,pts[i],pts[i+1],.033,m.oak);beamArt(r,[0,.1,0],[0,1.35,0],.01,'#cfc3a0');}
 else if(ITEMS[id]?.style==='magic'&&ITEMS[id]?.slot==='weapon'){beamArt(r,[0,0,0],[0,1.3,0],.047,m.oak);crownArt(r,0,1.4,0,.26,.3,.26,'#91b9b7',2);}
 else if(id==='ironHelm'){oval3(r,0,.72,0,.8,.85,.7,m.iron);box3(r,0,.69,.33,.59,.09,.04,'#344649');}
 else if(id==='ironShield'){const pts=[[-.46,1.16,0],[.46,1.16,0],[.4,.62,0],[0,.1,0],[-.4,.62,0]],center=[0,.8,.17];for(let i=0;i<5;i++)surface3(r,[pts[i],pts[(i+1)%5],center],m.iron);oval3(r,0,.81,.18,.2,.2,.07,m.gold);}
 else if(id==='leatherBoots'){for(const x of [-.21,.21]){limb3(r,x,.59,0,.33,.8,.36,m.leather);oval3(r,x,.19,.12,.34,.31,.62,m.leather);}}
 else if(ITEMS[id]?.slot==='body'){profile3(r,0,.82,0,.89,.95,.52,[[-.5,.66],[-.2,.7],[.3,1],[.5,.78]],ITEMS[id]?.magicAccuracy>0?'#695d82':m.leather);for(const side of [-1,1])oval3(r,side*.47,1.08,0,.29,.32,.4,ITEMS[id]?.magicAccuracy>0?'#695d82':m.leather);box3(r,0,.48,.23,.65,.09,.025,m.gold);}

 else if(ITEMS[id]?.logType){for(const [x,y]of [[-.2,.35],[.2,.35],[0,.66]]){beamArt(r,[x,y,-.35],[x,y,.4],.19,m.timber,10);profile3(r,x,y,.41,.35,.015,.35,[[-.5,1],[.5,1]],m.oak,a=>[a[0],y+(a[2]-.41),.41+(a[1]-y)],10);}}
 else if(ITEMS[id]?.resource||ITEMS[id]?.metal){crownArt(r,-.15,.55,0,.85,.75,.7,'#7c8582',2);crownArt(r,.27,.35,.1,.55,.45,.5,'#abb1a5',5);}
 else if(id==='ashes'){crownArt(r,0,.18,0,1.25,.23,.85,'#8f9187',5);crownArt(r,-.22,.26,.1,.48,.18,.4,'#b4b3a5',3);crownArt(r,.22,.19,.15,.3,.11,.3,'#5e655d',2);}
 else if(ITEMS[id]?.heal||ITEMS[id]?.rawFish){oval3(r,0,.68,0,1.05,.36,.3,'#86a5a1');r.face([[.48,.7,0],[.78,.95,0],[.76,.43,0]],'#647f7d');r.face([[-.1,.83,0],[.1,1.08,0],[.29,.81,0]],'#78918a');oval3(r,-.38,.73,.14,.065,.065,.03,'#283c3c');}
 else if(id==='fang'){profile3(r,0,.72,0,.44,1.1,.35,[[-.5,.03],[-.2,.5],[.25,1],[.5,.8]],'#dfd5b3',a=>[a[0]+(a[1]-.5)*.2,a[1],a[2]]);}
 else if(id==='bones'){beamArt(r,[-.3,.3,0],[.3,1.12,0],.085,'#d8d1b1');for(const [x,y]of [[-.3,.3],[.3,1.12]])for(const dx of [-.07,.07])oval3(r,x+dx,y,0,.17,.2,.2,'#e1d9bc');}
 else if(ITEMS[id]?.rangedStrength||id.includes('Arrow')||id==='arrowheads'){for(const x of [-.18,0,.18]){beamArt(r,[x,.15,0],[x,1.3,0],.022,m.oak);r.face([[x-.065,1.25,0],[x,1.48,0],[x+.065,1.25,0]],m.iron);r.face([[x,.18,0],[x-.1,.05,0],[x-.1,.29,0],[x,.4,0]],'#d3cdb7');}}
 else if(id==='runes'||id.endsWith('Runes')){crownArt(r,0,.6,0,.85,.9,.3,'#99a5a1',2);beamArt(r,[-.18,.43,.17],[.06,.94,.17],.035,'#a8e4dc',4);beamArt(r,[.06,.94,.17],[.22,.62,.17],.035,'#a8e4dc',4);beamArt(r,[-.07,.62,.17],[.22,.62,.17],.035,'#a8e4dc',4);}
 else {meshDetail3=prev;return false;}r.flush();meshDetail3=prev;return true;}
