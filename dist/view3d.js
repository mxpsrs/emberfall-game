'use strict';
// Orthographic 3D geometry: world X/Z, height Y, a freely orbiting camera.
const view3d={yaw:-.55,tilt:.85,zoom:34,min:14,max:65};
try{const v=JSON.parse(localStorage.getItem('emberfall-camera-v1'));if(v){view3d.yaw=Number(v.yaw)||-.55;view3d.tilt=Math.max(.5,Math.min(1.2,Number(v.tilt)||.85));view3d.zoom=Math.max(14,Math.min(65,Number(v.zoom)||34));}}catch{}
function rememberView(){try{localStorage.setItem('emberfall-camera-v1',JSON.stringify(view3d));}catch{}}
function project3(x,y,z,v=view3d,cx=px+.5,cz=py+.5,w=screen.w,h=screen.h){const dx=x-cx,dz=z-cz,c=Math.cos(v.yaw),s=Math.sin(v.yaw),u=dx*c-dz*s,d=dx*s+dz*c;return {x:w/2+u*v.zoom,y:h*.54+(d*Math.sin(v.tilt)-y*Math.cos(v.tilt))*v.zoom,depth:d*Math.cos(v.tilt)+y*Math.sin(v.tilt)};}
function unproject3(sx,sy){const u=(sx-screen.w/2)/view3d.zoom,d=(sy-screen.h*.54)/view3d.zoom/Math.sin(view3d.tilt),c=Math.cos(view3d.yaw),s=Math.sin(view3d.yaw);return {x:px+.5+u*c+d*s,z:py+.5-u*s+d*c};}
function shade3(hex,f){const n=parseInt(hex.slice(1),16);return '#'+[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(v*f))).toString(16).padStart(2,'0')).join('');}
function painter3(g,project){const faces=[];return {face(points,color){const p=points.map(a=>project(...a));faces.push({p,color,d:p.reduce((a,b)=>a+b.depth,0)/p.length});},flush(){faces.sort((a,b)=>a.d-b.d);for(const {p,color}of faces){g.fillStyle=color;g.beginPath();g.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)g.lineTo(p[i].x,p[i].y);g.closePath();g.fill();}}};}
function box3(r,x,y,z,w,h,d,color,transform=a=>a){const p=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([a,b,c])=>transform([x+a*w/2,y+b*h/2,z+c*d/2]));[[[0,1,2,3],.72],[[4,7,6,5],1],[[0,4,5,1],.55],[[3,2,6,7],1.18],[[1,5,6,2],.85],[[0,3,7,4],.95]].forEach(([ids,f])=>r.face(ids.map(i=>p[i]),shade3(color,f)));}
function cone3(r,x,y,z,radius,height,color,n=7){const top=[x,y+height,z];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;r.face([[x+Math.cos(a)*radius,y,z+Math.sin(a)*radius],top,[x+Math.cos(b)*radius,y,z+Math.sin(b)*radius]],shade3(color,.8+.25*Math.sin(a)));}}
function ring3(g,x,z,color,r=.4,y=.035){g.beginPath();for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,p=project3(x+Math.cos(a)*r,y,z+Math.sin(a)*r);if(i)g.lineTo(p.x,p.y);else g.moveTo(p.x,p.y);}g.strokeStyle=color;g.lineWidth=2;g.stroke();}
let playerHeading=0;
function humanoid3(r,x,z,look,gear={},heading=0,walk=0,attack=0,size=1){
 const cloth=gear._bones?'#d3d1b5':['#356788','#567447','#854b57','#755588'][look%4],skin=gear._skin||['#d6a27b','#ac7754','#e3b38f','#78543f'][look%4];
 const armor=gear.body==='ironArmor'?'#9baeb5':gear.body==='mageRobe'?'#665191':gear.body?'#846348':cloth;
 const metal='#afc1c5',boots=gear.feet?'#493629':'#60625a';
 const c=Math.cos(heading),sn=Math.sin(heading),bob=Math.abs(Math.sin(walk))*Math.min(.045,Math.abs(walk));
 const root=([a,b,d])=>[x+(a*c+d*sn)*size,(b+bob)*size,z+(-a*sn+d*c)*size];
 const part=(a,b,d,w,h,dep,col,t=root)=>box3(r,a,b,d,w,h,dep,col,t);
 // The equipped chest replaces the torso surface rather than overlaying a sprite.
 part(0,1.12,0,.51,.59,.29,armor);part(0,.83,0,.5,.1,.3,'#40342c');part(0,.83,.16,.09,.08,.025,'#c8a66b');
 if(gear.body==='mageRobe')part(0,.6,0,.52,.45,.34,armor);
 part(0,1.49,0,.16,.15,.16,skin);part(0,1.69,0,.34,.35,.31,skin);
 part(0,1.86,-.02,.36,.09,.33,gear.head?metal:'#49372d');
 if(gear.head){part(-.16,1.72,0,.055,.24,.33,metal);part(.16,1.72,0,.055,.24,.33,metal);part(0,1.8,.167,.34,.065,.045,metal);}else part(0,1.74,-.14,.35,.23,.055,'#49372d');
 for(const side of [-1,1]){part(side*.077,1.71,.163,.033,.032,.018,'#242a30');
  const legSwing=Math.sin(walk)*.52*side;
  const leg=([a,b,d])=>{const yy=b-.8;return root([a,.8+yy*Math.cos(legSwing)-d*Math.sin(legSwing),yy*Math.sin(legSwing)+d*Math.cos(legSwing)]);};
  part(side*.14,.48,0,.2,.6,.22,gear._bones?'#d3d1b5':gear.body==='ironArmor'?'#677a83':'#3e4850',leg);
  part(side*.14,.13,.055,.22,gear.feet?.25:.16,.34,boots,leg);
  const angle=Math.sin(walk)*-.48*side+(side===1?-attack*1.7:attack*.25);
  const arm=([a,b,d])=>{const yy=b-1.36;return root([a,1.36+yy*Math.cos(angle)-d*Math.sin(angle),yy*Math.sin(angle)+d*Math.cos(angle)]);};
  part(side*.34,1.16,0,.17,.39,.2,armor,arm);part(side*.34,.88,0,.14,.21,.16,skin,arm);part(side*.34,.73,0,.16,.16,.17,skin,arm);
  if(gear.body&&gear.body!=='mageRobe')part(side*.32,1.35,0,.23,.14,.27,armor,arm);
  if(side===-1&&gear.shield){part(-.45,.84,.055,.09,.58,.47,gear.shield==='ironShield'?metal:'#795d3a',arm);part(-.505,.84,.055,.025,.14,.14,'#c6a970',arm);}
  if(side===1&&gear.weapon){const id=gear.weapon;
   if(id==='oakStaff'){part(.34,1.02,.055,.065,1.63,.065,'#805839',arm);part(.34,1.85,.055,.19,.2,.18,'#80cacf',arm);}
   else if(id==='shortbow'){part(.34,.85,.13,.065,.92,.055,'#a78454',arm);part(.34,1.28,.045,.06,.06,.22,'#a78454',arm);part(.34,.41,.045,.06,.06,.22,'#a78454',arm);part(.34,.85,-.055,.015,.88,.015,'#e1d6b0',arm);}
   else{part(.34,.76,.04,.08,.2,.08,'#443730',arm);part(.34,.9,.04,.27,.05,.08,'#d2b27c',arm);part(.34,1.28,.04,.115,.73,.045,id==='bronzeSword'?'#c7a379':metal,arm);}
  }
 }
}
function creature3(r,o,x,z){const kind=o.kind,walk=Math.hypot(o.drawX-o.x,o.drawY-o.y)>.02?time*9:0;
 if(['wolf','ridgewolf','rat'].includes(kind)){const rat=kind==='rat',k=rat?.58:1,col=rat?'#807369':kind==='ridgewolf'?'#a9b4b6':'#707e83';box3(r,x,.48*k,z,.4*k,.43*k,.85*k,col);box3(r,x,.7*k,z+.42*k,.34*k,.35*k,.38*k,col);box3(r,x,.64*k,z+.64*k,.22*k,.16*k,.2*k,'#44464b');for(const a of [-1,1])for(const b of [-1,1])box3(r,x+a*.16*k,.18*k,z+b*.29*k,.1*k,.36*k,.12*k,col);return .95*k;}
 if(kind==='slime'){cone3(r,x,.03,z,.42,.62,'#77a987',9);return .75;}
 if(o.type==='spirit'){cone3(r,x,.45+Math.sin(time*3)*.08,z,.24,.52,['#db9764','#83baca','#d7c379','#a0b98a'][o.sprite%4]);return 1.3;}
 const enemy=fighter(o),gear=enemy?{body:kind==='skeleton'?null:'leatherArmor',weapon:'ironSword',_bones:kind==='skeleton',_skin:kind==='skeleton'?'#d3d1b5':kind==='goblin'?'#789568':null}:{};
 humanoid3(r,x,z,(o.sprite||0)%4,gear,Math.atan2(px-x,py-z),walk,Math.max(0,Math.sin(Math.min(1,(time-(o.attackAt||-9))/.4)*Math.PI)),kind==='warden'||o.type==='boss'?1.35:1);return o.type==='boss'?2.6:2;
}
function prop3(r,o,x,z){if(o.type==='tree'){box3(r,x,.65,z,.23,1.3,.23,'#715541');cone3(r,x,.95,z,.83,1.45,'#385c4c');cone3(r,x,1.6,z,.61,1.2,'#52735a');return 2.85;}
 if(o.type==='ore'){box3(r,x,.26,z,.68,.52,.6,'#778687');cone3(r,x-.2,.25,z,.36,.42,'#91a1a1',5);return .8;}
 if(o.type==='camp'){box3(r,x,.13,z,.6,.2,.15,'#6e513c');cone3(r,x,.15,z,.24,.6+Math.sin(time*12)*.08,'#eda75a',5);return 1;}
 if(o.type==='crop'){for(const a of [-.2,0,.2])cone3(r,x+a,0,z,.16,o.harvestedUntil>time?.1:.48,'#859356',5);return .6;}
 if(o.type==='fish'){return .1;}
 if(o.type==='door'||o.type==='exit'){box3(r,x,.04,z,.8,.08,.55,'#bba577');return .1;}
 if(o.type==='forge'){box3(r,x,.33,z,.65,.65,.4,'#576a74');return .8;}
 box3(r,x,.34,z,.53,.68,.53,o.type==='cache'?'#a0814c':'#79654b');box3(r,x,.48,z,.56,.07,.56,'#485157');return .8;}
function building3(r,b){const x=b.x+b.w/2,z=b.y+b.h/2,w=b.w,d=b.h,h=1.8;box3(r,x,h/2,z,w,h,d,'#acaa8c');for(const a of [-1,1])for(const c of [-1,1])box3(r,x+a*(w/2-.09),h/2,z+c*(d/2-.09),.16,h,.16,'#5b5041');
 const a=[x-w/2-.18,h,z-d/2-.18],bb=[x+w/2+.18,h,z-d/2-.18],c=[x+w/2+.18,h,z+d/2+.18],dd=[x-w/2-.18,h,z+d/2+.18],e=[x,h+1.2,z-d/2-.18],f=[x,h+1.2,z+d/2+.18];r.face([a,dd,f,e],'#576e78');r.face([bb,e,f,c],'#6f8890');r.face([a,e,bb],'#8c938b');r.face([dd,c,f],'#9ba291');box3(r,x,.65,z+d/2+.02,.6,1.3,.06,'#544b40');for(const side of [-1,1])box3(r,x+side*w*.3,1.07,z+d/2+.04,.45,.48,.07,'#b6c8b6');}
function drawWorldMood3(){
 const hours=(s.worldClock/480*24+4)%24,night=(hours>=20||hours<5)?1:hours>=17?(hours-17)/3:hours<8?(8-hours)/3:0;
 const dark=!inWorld()?(currentScene==='dungeon'?.35:currentScene==='mine'?.22:.08):night*.29;
 ctx.fillStyle='rgba(7,15,40,'+dark+')';ctx.fillRect(0,0,screen.w,screen.h);
 $('worldClock').textContent=(hours<5||hours>=20?'Night':hours<8?'Dawn':hours>=17?'Dusk':'Day')+' '+String(Math.floor(hours)).padStart(2,'0')+':'+String(Math.floor(hours%1*60)).padStart(2,'0');
}
function draw3d(){const w=screen.w,h=screen.h;ctx.clearRect(0,0,w,h);ctx.fillStyle='#243b40';ctx.fillRect(0,0,w,h);const r=painter3(ctx,project3),corners=[[0,0],[w,0],[w,h],[0,h]].map(p=>unproject3(...p)),[mw,mh]=sceneSize();
 const minx=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.x)))-4),maxx=Math.min(mw-1,Math.ceil(Math.max(...corners.map(p=>p.x)))+4),minz=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.z)))-4),maxz=Math.min(mh-1,Math.ceil(Math.max(...corners.map(p=>p.z)))+4);
 for(let z=minz;z<=maxz;z++)for(let x=minx;x<=maxx;x++){const t=terrainType(x,z),col=['#506d51','#9a8b65','#8a9383','#426f80'][t],v=.96+((x*17+z*13)%7)*.012;r.face([[x,0,z],[x+1,0,z],[x+1,0,z+1],[x,0,z+1]],shade3(col,v));if(!inWorld()&&worldWall(x,z))box3(r,x+.5,.5,z+.5,1,1,1,'#62716e');}r.flush();
 if(path.length){ctx.beginPath();for(const [i,p]of [[px,py],...path].entries()){const q=project3(p[0]+.5,.035,p[1]+.5);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);}ctx.strokeStyle='#e9dba6';ctx.lineWidth=2;ctx.setLineDash([3,5]);ctx.stroke();ctx.setLineDash([]);}
 ring3(ctx,px+.5,py+.5,'#e4d6a2');if(target)ring3(ctx,target.x+.5,target.y+.5,fighter(target)?'#e79580':'#e4d6a2');
 const tp=inWorld()&&s.character&&s.tutorial<14?tutorialSteps[s.tutorial].point():null;if(tp)ring3(ctx,tp.x+.5,tp.y+.5,'#f3d280',.58);
 const mesh=painter3(ctx,project3),labels=[];hitboxes=[];
 const near=(x,z)=>x>=minx-3&&x<=maxx+3&&z>=minz-3&&z<=maxz+3;
 const hit=(o,x,z,height,width=.65)=>{const a=project3(x,0,z),b=project3(x,height,z);hitboxes.push({x:a.x-width*view3d.zoom/2,y:Math.min(a.y,b.y)-8,w:width*view3d.zoom,h:Math.abs(a.y-b.y)+16,o,depth:a.depth});};
 for(const b of buildings)if(near(b.x,b.y)){building3(mesh,b);if(b.service)hit(b.service,b.service.x+.5,b.service.y+.5,1.4,1);if(Math.hypot(px-b.x,py-b.y)<8)labels.push([b.name,b.x+b.w/2,3.3,b.y+b.h/2,'#e8d9b0']);}
 for(const o of objects){if(o.dead>time||(o.type==='boss'&&s.boss)||!near(o.x,o.y))continue;const x=(o.drawX??o.x)+.5,z=(o.drawY??o.y)+.5,living=fighter(o)||o.characterSprite||['elder','shop','questgiver','spirit','villager','inn'].includes(o.type),height=living?creature3(mesh,o,x,z):prop3(mesh,o,x,z);hit(o,x,z,height,o.type==='tree'?1.1:.7);if(['elder','questgiver'].includes(o.type))labels.push(['!',x,height+.3,z,'#ffdb8d']);if(target===o)labels.push([o.name,x,height+.35,z,'#ffe0bb',o]);}
 const moving=Math.hypot(s.x-px,s.y-py)>.01;if(moving)playerHeading=Math.atan2(s.x-px,s.y-py);else if(target)playerHeading=Math.atan2(target.x-px,target.y-py);
 humanoid3(mesh,px+.5,py+.5,s.character?.look||0,s.equipment,playerHeading,moving?time*10:0,Math.max(0,Math.sin(Math.min(1,(time-lastAttack)/.42)*Math.PI)));
 for(const pile of s.groundLoot||[])if(pile.scene===currentScene&&near(pile.x,pile.y)){box3(mesh,pile.x+.5,.1,pile.y+.5,.3,.2,.26,'#d7b66b');hit(pile,pile.x+.5,pile.y+.5,.35,.7);}
 mesh.flush();drawWorldMood3();hitboxes.sort((a,b)=>a.depth-b.depth);
 labels.push([s.character?.name||'Adventurer',px+.5,2.15,py+.5,'#ffedbd']);for(const [text,x,y,z,color,o]of labels){const p=project3(x,y,z);label(text,p.x,p.y,color,11);if(o&&fighter(o)){ctx.fillStyle='#202e32';ctx.fillRect(p.x-22,p.y-14,44,5);ctx.fillStyle='#cc776c';ctx.fillRect(p.x-22,p.y-14,44*Math.max(0,o.hp/o.maxhp),5);}}
 for(const p of projectiles){const t=Math.min(1,p.age/p.duration),q=project3(p.x+(p.tx-p.x)*t+.5,1+Math.sin(t*Math.PI)*.3,p.y+(p.ty-p.y)*t+.5);ctx.fillStyle=p.color||'#e3c382';ctx.beginPath();ctx.arc(q.x,q.y,p.style==='ranged'?3:5,0,Math.PI*2);ctx.fill();}
 if(spiritEffect)ring3(ctx,spiritEffect.x+.5,spiritEffect.y+.5,'#bce4d5',.6+spiritEffect.age);
 for(const f of floaters){const p=project3(f.x+.5,2+(1.4-f.life)*.8,f.y+.5);label(f.text,p.x,p.y,f.color,14);}
 const region=regionInfo()||['Briarhaven','The Border Realms'];$('region').textContent=region[0];$('regionSub').textContent=region[1];drawMinimap();
}
// Creation, equipment previews and gameplay share precisely the same fitted model.
drawEquippedCharacter=function(g,x,bottom,look,moving=false,age=10,scale=1){const v={yaw:-.45,tilt:.35,zoom:29*scale},proj=(a,b,c)=>project3(a,b,c,v,0,0,0,0),r=painter3(g,(a,b,c)=>{const p=proj(a,b,c);return {...p,x:p.x+x,y:p.y+bottom};});humanoid3(r,0,0,look,s.equipment,0,moving?time*10:0,Math.max(0,Math.sin(Math.min(1,age/.42)*Math.PI)));r.flush();};
draw=draw3d;
function clickWorld3(e){if(!assetsReady||$('creator').open||$('modal').open||$('spiritsDialog').open)return;const b=canvas.getBoundingClientRect(),sx=e.clientX-b.left,sy=e.clientY-b.top,p=unproject3(sx,sy),x=Math.floor(p.x),y=Math.floor(p.z);const hit=[...hitboxes].reverse().find(b=>sx>=b.x&&sx<=b.x+b.w&&sy>=b.y&&sy<=b.y+b.h);if(hit){select(hit.o);return;}const pile=(s.groundLoot||[]).find(p=>p.scene===currentScene&&p.x===x&&p.y===y);if(pile){select(pile);return;}walkTo(x,y);}
const cameraPointers=new Map();let gestureMoved=false,pinchStart=null;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);cameraPointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,button:e.button});if(cameraPointers.size===1)gestureMoved=false;if(cameraPointers.size===2){const [a,b]=[...cameraPointers.values()];pinchStart={distance:Math.hypot(a.x-b.x,a.y-b.y),angle:Math.atan2(b.y-a.y,b.x-a.x),yaw:view3d.yaw,zoom:view3d.zoom,tilt:view3d.tilt,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};gestureMoved=true;}});
canvas.addEventListener('pointermove',e=>{const p=cameraPointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(Math.hypot(p.x-p.startX,p.y-p.startY)>7)gestureMoved=true;if(cameraPointers.size===2&&pinchStart){const [a,b]=[...cameraPointers.values()];view3d.zoom=Math.max(14,Math.min(65,pinchStart.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinchStart.distance)));view3d.yaw=pinchStart.yaw+Math.atan2(b.y-a.y,b.x-a.x)-pinchStart.angle+((a.x+b.x)/2-pinchStart.cx)*.007;view3d.tilt=Math.max(.5,Math.min(1.2,pinchStart.tilt+((a.y+b.y)/2-pinchStart.cy)*.004));}else if(gestureMoved&&(e.pointerType==='mouse'||e.pointerType==='pen')){view3d.yaw+=dx*.009;view3d.tilt=Math.max(.5,Math.min(1.2,view3d.tilt+dy*.005));}});
canvas.addEventListener('pointerup',e=>{const p=cameraPointers.get(e.pointerId);if(!p)return;cameraPointers.delete(e.pointerId);if(!gestureMoved&&p.button===0)clickWorld3(e);pinchStart=null;rememberView();});
canvas.addEventListener('pointercancel',e=>{cameraPointers.delete(e.pointerId);gestureMoved=true;pinchStart=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();view3d.zoom=Math.max(14,Math.min(65,view3d.zoom*Math.exp(-e.deltaY*.001)));rememberView();},{passive:false});
$('cameraLeft').onclick=()=>{view3d.yaw-=Math.PI/8;rememberView();};$('cameraRight').onclick=()=>{view3d.yaw+=Math.PI/8;rememberView();};$('zoomOut').onclick=()=>{view3d.zoom=Math.max(14,view3d.zoom/1.2);rememberView();};$('zoomIn').onclick=()=>{view3d.zoom=Math.min(65,view3d.zoom*1.2);rememberView();};$('cameraReset').onclick=()=>{Object.assign(view3d,{yaw:-.55,tilt:.85,zoom:34});rememberView();};
boot();
