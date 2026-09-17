'use strict';
let worldAtlasTerrain=null;
function atlasFullSpan(){return Math.max(sceneSizes.overworld[0],sceneSizes.overworld[1]*1.5)*1.08;}
const ATLAS_KINGDOM_LABELS=[{name:'AURELIA',x:275,y:302},{name:'KHAZ-DUR',x:811,y:242},{name:'SYLVARAN',x:566,y:542}];
function atlasPlayerPoint(){if(currentScene==='overworld')return [px,py];if(currentScene==='tutorial')return [24+px*.7,604+py*.7];const b=worldScenes.overworld.buildings.find(b=>b.service?.destination===(worldScenes[currentScene]?.exterior||currentScene));return b?[b.service.x,b.service.y]:Array.isArray(s.returnPoint)?[...s.returnPoint]:[55,61];}
function withAtlasWorld(fn){const before={scene:currentScene,objects:[...objects],buildings:[...buildings],px,py};try{currentScene='overworld';objects.splice(0,objects.length,...worldScenes.overworld.objects);buildings.splice(0,buildings.length,...worldScenes.overworld.buildings);[px,py]=localMapState?.player||atlasPlayerPoint();return fn();}finally{currentScene=before.scene;objects.splice(0,objects.length,...before.objects);buildings.splice(0,buildings.length,...before.buildings);px=before.px;py=before.py;}}
function atlasEntries(bounds,filter){if(bounds.w<=400||filter!=='all')return mapEntriesInBounds(bounds,filter);return SETTLEMENTS.filter(t=>t.x>=bounds.x&&t.x<bounds.x+bounds.w&&t.y>=bounds.y&&t.y<bounds.y+bounds.h).map(t=>({id:'settlement:'+t.id,name:t.name,detail:regionalAccount(t.id).title+' · '+KINGDOMS.find(k=>k.id===t.kingdom).name,kind:'all',tags:[],x:t.x,y:t.y,settlement:t})).concat(mapEntriesInBounds(bounds,filter).filter(e=>e.quarry));}
function atlasLabel(g,text,x,y,size,color='#f5e4bd',align='center'){g.font='600 '+size+'px Georgia';const half=(g.measureText(text)?.width||text.length*size*.6)/2;x=Math.max(half+7,Math.min((g.canvas?.width||900)-half-7,x));g.textAlign=align;g.textBaseline='middle';g.lineWidth=4;g.strokeStyle='#152b2a';g.strokeText(text,x,y);g.fillStyle=color;g.fillText(text,x,y);return {left:x-half-3,right:x+half+3,top:y-size/2-3,bottom:y+size/2+3};}
function drawAtlasLabels(g,bounds,w,h,markers=[]){
 const labelScale=Math.min(1.5,Math.max(1,w/($('localMap').getBoundingClientRect().width||w))),occupied=markers.map(m=>({left:m.x-m.r,right:m.x+m.r,top:m.y-m.r,bottom:m.y+m.r}));const point=(x,y)=>[(x-bounds.x)*w/bounds.w,(y-bounds.y)*h/bounds.h],visible=(x,y)=>x>=bounds.x&&x<=bounds.x+bounds.w&&y>=bounds.y&&y<=bounds.y+bounds.h;
 if(bounds.w>400)for(const k of ATLAS_KINGDOM_LABELS)if(visible(k.x,k.y)){
  const [anchorX,anchorY]=point(k.x,k.y);g.font='600 '+22*labelScale+'px Georgia';const half=g.measureText(k.name).width/2+7;
  const candidates=[[0,0],[-140,0],[140,0],[0,64],[0,-64]].map(([dx,dy])=>[Math.max(half,Math.min(w-half,anchorX+dx*labelScale)),Math.max(24*labelScale,Math.min(h-16*labelScale,anchorY+dy*labelScale))]);
  const [x,y]=candidates.find(([x,y])=>!occupied.some(p=>x+half>p.left&&x-half<p.right&&y+16*labelScale>p.top&&y-24*labelScale<p.bottom))||candidates[0];
  occupied.push(atlasLabel(g,'KINGDOM OF',x,y-15*labelScale,10*labelScale,'#dfd4b0'),atlasLabel(g,k.name,x,y+2,22*labelScale,'#f4d692'));
 }
 for(const t of SETTLEMENTS){if(!visible(t.x,t.y))continue;const [x,y]=point(t.x,t.y);g.fillStyle=t.capital?'#efc86f':'#e8dcc0';g.strokeStyle='#192925';g.lineWidth=2;g.beginPath();g.arc(x,y,t.capital?5:3.5,0,Math.PI*2);g.fill();g.stroke();
  const offsets={briarhaven:[5,22],willowcross:[22,-13],stoneford:[6,18],crownreach:[0,19],ironhollow:[0,20],deepforge:[0,19],copperdelve:[0,-17],stonehearth:[-10,-18],aelindor:[0,19],moonwillow:[0,19],fernwatch:[0,19],silverbrook:[0,19],greyhaven:[0,19]},[dx,dy]=offsets[t.id]||[0,19];
  if(bounds.w>400&&dx){g.strokeStyle='#d3bf8a';g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x+dx,y+dy*.65);g.stroke();}
  const size=15*labelScale;g.font='600 '+size+'px Georgia';const half=(g.measureText(t.name)?.width||t.name.length*size*.6)/2;const candidates=[[dx,dy*labelScale],[dx,-24*labelScale],[42*labelScale,22*labelScale],[-42*labelScale,22*labelScale],[0,45*labelScale],[0,-46*labelScale],[65*labelScale,-30*labelScale],[-65*labelScale,-30*labelScale]].map(([a,b])=>[Math.max(half+7,Math.min(w-half-7,x+a)),Math.max(size,Math.min(h-size,y+b))]);const chosen=candidates.find(([a,b])=>!occupied.some(p=>a+half+4>p.left&&a-half-4<p.right&&b+size/2+4>p.top&&b-size/2-4<p.bottom))||candidates[0];g.strokeStyle='#d3bf8a';g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(...chosen);g.stroke();occupied.push(atlasLabel(g,t.name,...chosen,size));
  if(bounds.w>400)markers.push({entry:{id:'settlement:'+t.id,name:t.name,detail:t.kind,kind:'all',tags:[],x:t.x,y:t.y,settlement:t},x,y,r:14});
 }
 if(bounds.w>400){for(const l of WORLD_LAKES){const [x,y]=point(l.x,l.y);occupied.push(atlasLabel(g,l.name,x,y+(l.name==='Reedwater Mere'?-8:23),12,'#b9dce0'));}const [x,y]=point(78,717);occupied.push(atlasLabel(g,'Firstlight Isle',x,y,17,'#f5e4bd'));}
 for(const m of markers.filter(m=>m.entry.quarry)){
  const size=12*labelScale;g.font='600 '+size+'px Georgia';const half=g.measureText(m.entry.name).width/2,candidates=[];
  for(const dy of [26,-27,48,-49,70,-71,92,-93])for(const dx of [0,half*.6,-half*.6])candidates.push([Math.max(half+7,Math.min(w-half-7,m.x+dx)),Math.max(size,Math.min(h-size,m.y+dy*labelScale))]);
  const chosen=candidates.find(([x,y])=>!occupied.some(p=>x+half+4>p.left&&x-half-4<p.right&&y+size/2+4>p.top&&y-size/2-4<p.bottom))||candidates[0];
  g.strokeStyle='#b8d2d6';g.lineWidth=1;g.beginPath();g.moveTo(m.x,m.y+m.r*Math.sign(chosen[1]-m.y));g.lineTo(...chosen);g.stroke();occupied.push(atlasLabel(g,m.entry.name,...chosen,size,'#cde6ed'));
 }
}
// Draw actual world objects, with finer silhouettes as the player zooms in.
function drawAtlasFeatures(g,bounds,w,h,world=worldScenes.overworld){
 const sx=w/bounds.w,sy=h/bounds.h,detail=bounds.w<=400,point=(x,y)=>[(x-bounds.x)*sx,(y-bounds.y)*sy];
 const visible=(x,y)=>x>=bounds.x-15&&x<=bounds.x+bounds.w+15&&y>=bounds.y-15&&y<=bounds.y+bounds.h+15;
 const counts={houses:0,trees:0,rocks:0,bridges:0};
 for(const o of world.objects){if(!visible(o.x,o.y)||o.interiorBuilding)continue;const [x,y]=point(o.x+.5,o.y+.5);
  if(o.type==='tree'){counts.trees++;const k=detail?Math.max(2,sx*.85):1.7*sx;g.fillStyle='#243c29';g.beginPath();g.arc(x,y,k*1.2,0,Math.PI*2);g.fill();g.fillStyle=o.race==='dwarf'?'#567261':o.race==='elf'?'#477452':'#56723b';g.beginPath();g.arc(x-k*.2,y-k*.25,k*.78,0,Math.PI*2);g.fill();if(detail){g.fillStyle='#aa9163';g.fillRect(x-.35*sx,y+k*.6,.7*sx,k*.8);}}
  else if(o.type==='ore'||/rock|boulder/i.test((o.model||'')+' '+(o.name||''))){counts.rocks++;const k=Math.max(detail?2.3:1,sx*.8);g.fillStyle='#b6b7a6';g.strokeStyle='#59625d';g.lineWidth=.6;g.beginPath();g.moveTo(x-k,y+k*.5);g.lineTo(x-k*.7,y-k*.5);g.lineTo(x+k*.2,y-k);g.lineTo(x+k,y);g.lineTo(x+k*.6,y+k*.6);g.closePath();g.fill();g.stroke();}
 }
 for(const b of world.buildings){if(!visible(b.x,b.y))continue;counts.houses++;const [x,y]=point(b.x,b.y),bw=b.w*sx,bh=b.h*sy;g.fillStyle=b.archetype==='castle'?'#dcc38b':'#af9170';g.fillRect(x,y,bw,bh);g.strokeStyle='#534e3c';g.lineWidth=detail?1:.6;g.strokeRect(x,y,bw,bh);g.strokeStyle='#e1c29a';g.beginPath();if(bw>bh){g.moveTo(x+1,y+bh/2);g.lineTo(x+bw-1,y+bh/2);}else{g.moveTo(x+bw/2,y+1);g.lineTo(x+bw/2,y+bh-1);}g.stroke();}
 if(world===worldScenes.overworld)for(const b of bridgesInRealm()){if(!visible(b.x,b.z))continue;counts.bridges++;const [x,y]=point(b.x,b.z),bw=(b.eastWest?b.span:b.width)*sx,bh=(b.eastWest?b.width:b.span)*sy;g.fillStyle='#cfaf78';g.fillRect(x-bw/2,y-bh/2,bw,bh);g.strokeStyle='#624f35';g.lineWidth=detail?1.2:.8;g.strokeRect(x-bw/2,y-bh/2,bw,bh);if(detail){g.beginPath();for(let a=2;a<b.span;a+=2){if(b.eastWest){g.moveTo(x-bw/2+a*sx,y-bh/2);g.lineTo(x-bw/2+a*sx,y+bh/2);}else{g.moveTo(x-bw/2,y-bh/2+a*sy);g.lineTo(x+bw/2,y-bh/2+a*sy);}}g.stroke();}}
 if(world===worldScenes.overworld&&typeof civilWalls!=='undefined'){
  g.fillStyle='#c8c4b0';for(const tile of civilWalls.get('overworld')?.values()||[]){if(!visible(tile.x,tile.y))continue;const [x,y]=point(tile.x,tile.y);g.fillRect(x,y,Math.max(1,sx),Math.max(1,sy));}
  for(const q of surfaceQuarries){if(!visible(q.x,q.y))continue;for(let i=0;i<=q.levels;i++){const [x,y]=point(q.x-q.rx+i*5,q.y-q.ry+i*5);g.fillStyle=['#a5a393','#918f80','#807e70','#716e60','#625f53'][i];g.fillRect(x,y,(q.rx*2-i*10)*sx,(q.ry*2-i*10)*sy);}const [x,y]=point(q.x-2,q.y-8);g.fillStyle='#b6a389';g.fillRect(x,y,4*sx,(q.ry+8)*sy);}
 }
 return counts;
}
function buildAtlasTerrain(){
 const c=document.createElement('canvas');c.width=1152;c.height=768;const g=c.getContext('2d');
 for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2){const d=worldWaterDistance(x+1,y+1),k=kingdomAt(x,y),height=landBase(x,y),shade=Math.max(0,Math.min(15,Math.round(height*.9)));
  g.fillStyle=d<0?(d> -3?'#4b9297':'#235763'):d<2?'#c0b388':k.id==='khazdur'?'rgb('+(101+shade)+','+(105+shade)+','+(88+shade)+')':k.id==='sylvaran'?'rgb('+(47+shade)+','+(85+shade)+','+(64+shade)+')':'rgb('+(78+shade)+','+(105+shade)+','+(65+shade)+')';g.fillRect(x,y,2,2);
 }
 g.strokeStyle='#c3b58e';g.lineWidth=1.4;g.beginPath();for(const seg of organicRoads){g.moveTo(...seg.a);g.lineTo(...seg.b);}g.stroke();
 drawAtlasFeatures(g,{x:0,y:0,w:1152,h:768},1152,768);
 // Firstlight is a separate playable island, shown offshore without a false land bridge.
 const old=currentScene;currentScene='tutorial';for(let y=0;y<150;y+=2)for(let x=0;x<135;x+=2)if(firstlightWaterDistance(x,y)>=0){g.fillStyle='#749466';g.fillRect(24+x*.7,604+y*.7,1.6,1.6);}currentScene=old;
 g.save();g.translate(24,604);g.scale(.7,.7);drawAtlasFeatures(g,{x:0,y:0,w:135,h:150},135,150,worldScenes.tutorial);g.restore();
 return c;
}
const atlasTerrainBefore=drawMapTerrain;
drawMapTerrain=function(g,bounds,w,h){if(currentScene!=='overworld')return atlasTerrainBefore(g,bounds,w,h);if(bounds.w<=400){atlasTerrainBefore(g,bounds,w,h);drawAtlasFeatures(g,bounds,w,h);return;}worldAtlasTerrain??=buildAtlasTerrain();g.fillStyle='#235763';g.fillRect(0,0,w,h);g.drawImage(worldAtlasTerrain,-bounds.x*w/bounds.w,-bounds.y*h/bounds.h,1152*w/bounds.w,768*h/bounds.h);};
const atlasRenderBefore=renderLocalMap;
renderLocalMap=function(){if(!localMapState)return;return withAtlasWorld(atlasRenderBefore);};
