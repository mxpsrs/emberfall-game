'use strict';
// One geometry source for inventory icons and ground loot. Existing fitted
// equipment keeps its authored mesh; supplies use small, flat-colored solids.
const itemVisualCache=new Map(),itemIconCache=new Map();
const ITEM_METALS={copper:'#c37c48',tin:'#b8bdba',bronze:'#b69358',iron:'#858e99',steel:'#c1cbd0',black:'#414852',coal:'#30343c',gold:'#dfb94b',mithril:'#788ac5',adamant:'#65976c',rune:'#61b8c9',dragonslayer:'#b95643'};
function drawGatheringTool(r,m,tool){
 const id=s.toolBelt?.[tool+'Item']||(tool==='axe'?'bronzeAxe':'bronzePickaxe');
 const build=q=>{
  if(tool==='axe'||tool==='pickaxe')buildToolItem({face:(p,c)=>q.face(p.map(([x,y,z])=>[x*.70,y*.70+.24,z*.70]),c)},id,ITEMS[id]||{beltTool:tool});
  else if(tool==='fishingNet'||tool==='lobsterPot'){
   itemRod(q,[0,-.12,0],[0,.70,0],.025,'#97764c');
   const ring=Array.from({length:17},(_,i)=>[Math.cos(i*Math.PI/8)*.25,.86+Math.sin(i*Math.PI/8)*.25,0]);itemPath(q,ring,.018,'#a38d60');
   for(let i=0;i<16;i+=2)itemRod(q,ring[i],[0,.72,-.28],.008,'#b2ae8c');
  }else{
   itemRod(q,[0,-.1,0],[0,1.55,.20],.018,'#a18152');
   itemRod(q,[0,1.55,.20],[0,.75,.70],.003,'#c9c5ad');
   itemOval(q,0,.76,.70,.06,.10,.06,'#c06648',6);
  }return 1.8;
 };
 if(r.indexed)cachedRealmShape(r,'held-tool:'+tool+':'+id,m,build);
 else build({face:(p,c)=>r.face(p.map(v=>briarPoint(v,0,m)),c)});
}
const ITEM_WOODS={normal:['#866042','#d8b982'],oak:['#785237','#b9965c'],willow:['#6a7a50','#c4c492'],maple:['#9d5237','#e2aa69'],yew:['#58463f','#bb8877'],magic:['#536981','#9ebeda']};
function itemFace(r,points,color){r.face(points,color);}
function itemProfile(r,x,y,z,w,h,d,rings,color,sides=8){
 const rows=rings.map(([yy,rad])=>Array.from({length:sides},(_,i)=>{const a=i/sides*Math.PI*2;return [x+Math.cos(a)*w*.5*rad,y+yy*h,z+Math.sin(a)*d*.5*rad];}));
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<sides;i++){const k=(i+1)%sides;itemFace(r,[rows[j][i],rows[j+1][i],rows[j+1][k],rows[j][k]],color);}
 itemFace(r,rows[0],color);itemFace(r,[...rows.at(-1)].reverse(),color);
}
function itemOval(r,x,y,z,w,h,d,color,sides=8){itemProfile(r,x,y,z,w,h,d,[[-.5,.12],[-.30,.80],[0,1],[.30,.80],[.5,.12]],color,sides);}
function itemBlock(r,x,y,z,w,h,d,color){
 const p=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([a,b,c])=>[x+a*w/2,y+b*h/2,z+c*d/2]);
 for(const ids of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[1,2,6,5],[0,4,7,3]])itemFace(r,ids.map(i=>p[i]),color);
}
function itemPlate(r,points,color,depth=.035){
 const front=points.map(([x,y,z=0])=>[x,y,z+depth/2]),back=points.map(([x,y,z=0])=>[x,y,z-depth/2]);
 itemFace(r,front,color);itemFace(r,[...back].reverse(),color);
 for(let i=0;i<points.length;i++){const j=(i+1)%points.length;itemFace(r,[back[i],back[j],front[j],front[i]],color);}
}
function itemRod(r,a,b,radius,color,sides=6){
 const up=b.map((v,i)=>v-a[i]),len=Math.hypot(...up)||1;for(let i=0;i<3;i++)up[i]/=len;
 const side=Math.abs(up[1])<.9?[up[2],0,-up[0]]:[1,0,0],sl=Math.hypot(...side)||1;for(let i=0;i<3;i++)side[i]/=sl;
 const out=[up[1]*side[2]-up[2]*side[1],up[2]*side[0]-up[0]*side[2],up[0]*side[1]-up[1]*side[0]];
 const rings=[a,b].map(p=>Array.from({length:sides},(_,i)=>p.map((v,j)=>v+radius*(Math.cos(i/sides*Math.PI*2)*side[j]+Math.sin(i/sides*Math.PI*2)*out[j]))));
 for(let i=0;i<sides;i++){const j=(i+1)%sides;itemFace(r,[rings[0][i],rings[0][j],rings[1][j],rings[1][i]],color);}
 itemFace(r,[...rings[0]].reverse(),color);itemFace(r,rings[1],color);
}
function itemPath(r,points,radius,color){for(let i=1;i<points.length;i++)itemRod(r,points[i-1],points[i],radius,color);}
function itemMetal(id){return ITEM_METALS[id==='arrowheads'?'iron':id==='arrows'?'bronze':Object.keys(ITEM_METALS).find(key=>id.startsWith(key))]||ITEM_METALS.iron;}
function itemFoodInfo(id){
 if(id==='burntFish')return {kind:'trout',state:'burnt'};
 for(const [kind,f]of Object.entries(FISH_RESOURCES)){if(id===f.raw)return {kind,state:'raw'};if(id===f.food)return {kind,state:'cooked'};}return null;
}
function buildFoodItem(r,food){
 const {kind,state}=food,raw=state==='raw',burnt=state==='burnt';
 const rawColors={shrimp:'#a9b9b1',trout:'#799c96',salmon:'#7794b0',lobster:'#516e73',swordfish:'#6b9fae',shark:'#748b9c'};
 const cookedColors={shrimp:'#eb9b72',trout:'#cb955e',salmon:'#df8868',lobster:'#d26d47',swordfish:'#d5ad76',shark:'#c39773'};
 const shell=burnt?'#393934':(raw?rawColors:cookedColors)[kind],fin=shade3(shell,.76),belly=burnt?'#615b4d':raw?'#d4d6bf':'#f0c08a';
 if(kind==='shrimp'){
  for(let i=0;i<7;i++){const a=-.9+i*.48,rad=.29,k=1-i*.08;itemOval(r,Math.cos(a)*rad,Math.sin(a)*rad,0,.29*k,.23*k,.22*k,i%2?shell:shade3(shell,.92),6);}
  itemOval(r,.22,-.25,0,.34,.27,.26,shell,6);itemOval(r,.32,-.29,.12,.05,.05,.035,'#252d30',6);
  itemPath(r,[[.29,-.34,0],[.42,-.43,0],[.58,-.44,0]],.012,fin);
  itemPath(r,[[.25,-.35,.03],[.32,-.50,.03],[.48,-.55,.03]],.01,fin);
  itemPlate(r,[[-.10,.25,0],[-.28,.42,0],[-.34,.22,0],[-.16,.20,0]],fin,.055);
  for(let i=0;i<3;i++)itemRod(r,[.05+i*.07,-.16,0],[-.03+i*.07,-.29,0],.014,belly);
  return;
 }
 if(kind==='lobster'){
  itemOval(r,0,.08,0,.34,.53,.26,shell);
  for(let i=0;i<4;i++)itemOval(r,0,-.22-i*.095,0,.29-i*.035,.13,.21-i*.025,i%2?fin:shell,6);
  itemPlate(r,[[-.08,-.5,0],[-.23,-.62,0],[.23,-.62,0],[.08,-.5,0]],shell,.09);
  for(const side of [-1,1]){
   itemPath(r,[[side*.1,.23,0],[side*.29,.30,0],[side*.32,.45,0]],.042,shell);
   itemOval(r,side*.33,.55,0,.22,.29,.17,shell,6);
   itemPlate(r,[[side*.27,.62,.085],[side*.34,.76,.085],[side*.39,.63,.085]],fin,.016);
   for(let i=0;i<3;i++)itemPath(r,[[side*.13,.11-i*.11,0],[side*.31,.03-i*.11,0],[side*.38,-.09-i*.10,0]],.016,fin);
   itemOval(r,side*.08,.34,.1,.045,.045,.035,'#222d30',6);
   itemPath(r,[[side*.07,.33,0],[side*.09,.48,0],[side*.15,.59,0]],.01,belly);
  }return;
 }
 const salmon=kind==='salmon',shark=kind==='shark',bill=kind==='swordfish',length=shark?1.22:salmon?1.08:1,thick=shark?.37:salmon?.36:.33;
 itemOval(r,-.04,0,0,length,thick,.27,shell,10);
 itemOval(r,-.06,-.095,.066,length*.75,.13,.20,belly,8);
 itemPlate(r,[[length*.42,.025,0],[length*.71,.23,0],[length*.64,0,0],[length*.73,shark?-.30:-.20,0],[length*.43,-.05,0]],fin,.055);
 itemPlate(r,[[-.13,.13,0],[shark?.07:0,shark?.47:bill?.37:.31,0],[.24,.10,0]],fin,.048);
 itemPlate(r,[[-.2,-.015,.13],[.01,-.28,.18],[.05,-.07,.10]],fin,.025);
 if(bill)itemPlate(r,[[-.47,.10,0],[-1,.10,0],[-.45,.015,0]],shell,.045);
 itemOval(r,-length*.35,.035,.125,.048,.048,.04,'#202d30',6);
 const gillX=-length*.26;itemRod(r,[gillX,.09,.137],[gillX+.025,-.065,.137],.014,fin,4);
 if(shark)for(let i=1;i<3;i++)itemRod(r,[gillX+i*.055,.095,.139],[gillX+i*.055+.025,-.065,.139],.009,fin,4);
 if(salmon&&raw)itemRod(r,[-.31,.008,.143],[.36,.008,.11],.027,'#bd909c');
 if(kind==='trout'&&raw)for(const [x,y]of [[-.18,.07],[.03,.11],[.21,.06],[.09,-.02]])itemOval(r,x,y,.137,.027,.027,.015,'#485d56',5);
 if(!raw)for(const x of [-.14,.04,.22])itemRod(r,[x-.035,.085,.134],[x+.015,-.055,.15],.013,burnt?'#222826':'#865d3c',4);
}
function buildLogItem(r,key){
 const [bark,cut]=ITEM_WOODS[key]||ITEM_WOODS.normal;
 for(const [x,y]of [[-.19,.17],[.19,.17],[0,.47]]){
  itemRod(r,[x,y,-.42],[x,y,.38],.19,bark,8);itemRod(r,[x,y,.385],[x,y,.40],.165,cut,8);itemRod(r,[x,y,.401],[x,y,.407],.085,shade3(cut,.79),8);itemRod(r,[x,y,.408],[x,y,.413],.062,cut,8);
  itemRod(r,[x+.135,y+.105,-.33],[x+.135,y+.105,.28],.015,shade3(bark,.7),4);
 }
 if(key==='magic')for(const z of [-.2,0,.2])itemPlate(r,[[-.045,.65,z],[0,.73,z],[.045,.65,z],[0,.59,z]],'#a8d9d1',.025);
}
function buildOreItem(r,key){
 const ore=ITEM_METALS[key],stone=key==='coal'?'#30353d':'#666c70';
 itemProfile(r,-.10,.25,0,.78,.55,.65,[[-.5,.65],[-.25,1],[.18,.77],[.5,.18]],stone,7);
 itemProfile(r,.32,.14,.17,.39,.33,.35,[[-.5,.8],[0,1],[.5,.20]],shade3(stone,1.14),5);
 if(key==='coal')itemPlate(r,[[-.30,.32,.26],[-.06,.49,.10],[.11,.30,.28]],'#5b6269',.035);
 else for(const [x,y,z,w]of [[-.23,.36,.16,.22],[.10,.27,.23,.25],[-.01,.47,0,.17],[.35,.23,.22,.14]])itemProfile(r,x,y,z,w,w*.85,w*.7,[[-.5,.85],[.14,1],[.5,.45]],ore,5);
}
function buildBarItem(r,key){
 const color=ITEM_METALS[key];
 const p=[[-.5,0,-.23],[.5,0,-.23],[.5,0,.23],[-.5,0,.23],[-.40,.24,-.15],[.40,.24,-.15],[.40,.24,.15],[-.40,.24,.15]];
 for(const ids of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]])itemFace(r,ids.map(i=>p[i]),color);
 itemBlock(r,0,.246,0,.20,.012,.075,shade3(color,.67));
}
const ITEM_RUNE_GLYPHS={
 runes:[[[.18,.04],[.18,.22],[.08,.31],[-.10,.29],[-.18,.15],[-.15,-.09],[0,-.22],[.03,-.34]],[[.08,.1],[-.02,.08],[-.07,.01]]],
 airRunes:[[[-.29,.20],[.11,.20],[.23,.28],[.17,.35]], [[-.33,.03],[.25,.03],[.31,.12]], [[-.25,-.14],[.10,-.14],[.16,-.23],[.07,-.28]]],
 waterRunes:[[[0,.36],[-.23,-.06],[-.18,-.24],[0,-.32],[.19,-.24],[.24,-.05],[0,.36]]],
 earthRunes:[[[-.31,-.21],[-.12,.17],[.02,-.02],[.15,.31],[.33,-.21],[-.31,-.21]]],
 fireRunes:[[[.04,.37],[-.23,.08],[-.20,-.19],[0,-.33],[.23,-.13],[.22,.14],[.06,-.04],[.04,.37]]],
 chaosRunes:[[[-.28,.26],[.27,-.26]], [[-.27,-.26],[.27,.26]], [[0,.33],[0,-.33]]],
 deathRunes:[[[-.25,-.03],[-.25,.21],[-.13,.32],[.14,.32],[.25,.20],[.24,-.04],[.12,-.12],[.12,-.29],[-.12,-.29],[-.12,-.12],[-.25,-.03]], [[-.14,.08],[-.09,.08]], [[.10,.08],[.15,.08]]],
 bloodRunes:[[[0,.32],[-.14,.03],[-.09,-.11],[.09,-.11],[.14,.03],[0,.32]], [[-.27,-.20],[.27,-.20]], [[-.18,-.32],[.18,-.32]]]
};
function buildRuneItem(r,id){
 const colors={runes:'#bc8359',airRunes:'#dfebe1',waterRunes:'#518fc9',earthRunes:'#77a34e',fireRunes:'#d77a3e',chaosRunes:'#bf9844',deathRunes:'#b5aabe',bloodRunes:'#c35051'};
 itemOval(r,0,0,0,.87,1,.28,id==='deathRunes'?'#777e86':'#b3b6ac',8);
 for(const path of ITEM_RUNE_GLYPHS[id]||[])itemPath(r,path.map(([x,y])=>[x,y,.16]),.028,colors[id]);
}
function buildFeatherItem(r,x=0,y=0,z=0,scale=1){
 const q={face:(p,c)=>r.face(p.map(([a,b,d])=>[x+a*scale,y+b*scale,z+d*scale]),c)};
 itemPlate(q,[[0,-.43,0],[-.15,-.23,0],[-.21,.10,0],[-.08,.43,0],[.07,.53,0],[.17,.23,0],[.14,-.08,0]],'#e1dcc5',.027);
 itemPath(q,[[0,-.55,.022],[0,-.12,.022],[.065,.46,.022]],.012,'#a49674');
 for(const y of [-.18,-.02,.14])itemRod(q,[-.14,y+.10,.021],[.02,y,.03],.006,'#bcb595',4);
}
function buildAmmoItem(r,id){
 const heads=id==='arrowheads'||id.endsWith('Arrowheads'),shafts=id==='arrowShafts',headless=id==='headlessArrows',metal=itemMetal(id);
 if(heads){for(const [x,y]of [[-.21,-.13],[.20,-.15],[0,.22]]){itemPlate(r,[[x-.13,y-.14,0],[x+.13,y-.14,0],[x,y+.18,.03]],metal,.07);itemBlock(r,x,y-.18,0,.065,.13,.045,shade3(metal,.7));}return;}
 for(let i=0;i<3;i++){
  const x=(i-1)*.19,y=i===1?.06:0;itemRod(r,[x,-.60+y,0],[x,.47+y,0],.016,'#c4a171');
  if(!shafts){for(const side of [-1,1])itemPlate(r,[[x,-.51+y,.015],[x+side*.085,-.59+y,.015],[x+side*.085,-.38+y,.015],[x,-.31+y,.015]],'#d6d5bf',.015);}
  if(!shafts&&!headless)itemPlate(r,[[x-.057,.43+y,0],[x+.057,.43+y,0],[x,.67+y,.018]],metal,.045);
 }
}
function buildToolItem(r,id,item){
 const metal=itemMetal(id);itemRod(r,[0,-.55,0],[0,.46,0],.04,'#9c7448');itemRod(r,[0,-.51,0],[0,-.29,0],.048,'#594333');
 if(item.beltTool==='axe'){
  itemBlock(r,0,.36,0,.13,.18,.14,metal);
  itemPlate(r,[[-.025,.45,0],[.16,.48,0],[.42,.60,0],[.49,.44,0],[.42,.16,0],[.13,.23,0],[-.025,.27,0]],metal,.095);
  itemPlate(r,[[.41,.58,.052],[.48,.44,.052],[.41,.18,.052],[.36,.23,.052],[.42,.44,.052],[.36,.55,.052]],shade3(metal,1.24),.012);
 }else{
  itemPlate(r,[[-.55,.17,0],[-.32,.43,0],[-.10,.48,0],[.13,.47,0],[.39,.32,0],[.53,.12,0],[.27,.30,0],[.04,.33,0],[-.19,.32,0]],metal,.085);
  itemBlock(r,0,.38,0,.12,.20,.16,shade3(metal,.85));
 }
}
function buildClothingItem(r,id,item){
 if(id==='leatherBoots'){for(const x of [-.23,.23]){itemProfile(r,x,.39,0,.32,.58,.31,[[-.5,.85],[.40,1],[.5,1.09]],'#74553c');itemOval(r,x,.13,.13,.34,.26,.55,'#876348');itemBlock(r,x,.035,.10,.35,.07,.56,'#3f3d37');itemProfile(r,x,.65,0,.35,.09,.34,[[-.5,1],[.5,1]],'#b79868');}return;}
 const robes={mageRobe:'#72628c',wizardRobe:'#665595',adeptRobe:'#995788',mysticRobe:'#538eaf'},hides={leatherArmor:'#95683f',studdedBody:'#806246',greenHideBody:'#59815a',blueHideBody:'#507e9d',redHideBody:'#a45e4b',blackHideBody:'#464d57'},robe=!!robes[id],color=robes[id]||hides[id];
 itemProfile(r,0,.34,0,.60,.64,.29,[[-.5,.80],[-.17,.76],[.28,1],[.5,.75]],color);
 for(const side of [-1,1])itemRod(r,[side*.24,.57,0],[side*.44,robe?.16:.35,0],robe?.115:.12,color,6);
 if(robe){itemProfile(r,0,-.20,0,.71,.51,.34,[[-.5,1],[.5,.62]],color);for(const side of [-1,1])itemRod(r,[side*.09,.56,.139],[side*.025,.08,.15],.018,'#d6bd76');itemRod(r,[-.31,-.43,.16],[.31,-.43,.16],.018,'#d6bd76');}
 else if(id==='studdedBody')for(const x of [-.17,0,.17])for(const y of [.15,.31,.47])itemOval(r,x,y,.157,.035,.035,.024,'#bac1bc',5);
 else if(id.endsWith('HideBody'))for(const y of [.16,.32,.47])for(const x of [-.13,.10])itemPlate(r,[[x-.07,y+.04,.156],[x,y-.045,.167],[x+.07,y+.04,.156]],shade3(color,1.2),.012);
 itemBlock(r,0,.035,.15,.49,.08,.042,'#654a35');itemBlock(r,.05,.035,.181,.09,.08,.03,'#d4b676');
}
function buildBowItem(r,id){
 const key=id==='shortbow'?'normal':id.replace('Shortbow',''),[wood,trim]=ITEM_WOODS[key]||ITEM_WOODS.normal;
 const pts=Array.from({length:11},(_,i)=>[Math.sin(i/10*Math.PI)*.29,-.64+i*.128,0]);itemPath(r,pts,.03,wood);itemRod(r,pts[0],pts.at(-1),.009,'#d7cfb2');
 itemRod(r,[.285,-.13,0],[.285,.13,0],.044,'#69513d');
 for(const y of [-.40,.40])itemRod(r,[.22,y-.04,0],[.24,y+.025,0],.035,trim);
}
function buildMiscItem(r,id){
 if(id==='oakStaff'){itemPath(r,[[0,-.65,0],[.02,.19,0],[-.05,.48,0],[.03,.63,0],[.17,.57,0]],.045,'#8d6845');itemOval(r,.02,.51,0,.23,.27,.23,'#78aaa8',6);return;}
 if(id==='bones'){for(const [a,b]of [[[-.35,-.25,0],[.33,.24,0]],[[-.32,.28,.03],[.32,-.25,.03]]]){itemRod(r,a,b,.048,'#d7cfb2');for(const p of [a,b])for(const dx of [-.047,.047])itemOval(r,p[0]+dx,p[1],p[2],.12,.13,.12,'#e6dec5',6);}return;}
 if(id==='fang'){itemProfile(r,0,0,0,.39,.88,.29,[[-.5,.05],[-.25,.32],[.15,.84],[.42,1],[.5,.75]],'#e0d4b1',7);itemProfile(r,0,.37,0,.38,.18,.30,[[-.5,1],[.5,.83]],'#a49b82',7);return;}
 if(id==='ashes'){for(const [x,y,z,w,c]of [[0,.05,0,.85,'#969589'],[-.20,.10,.08,.36,'#b7b5a7'],[.18,.08,-.05,.29,'#686d68']])itemProfile(r,x,y,z,w,.13,w*.65,[[-.5,1],[0,.8],[.5,.10]],c,7);for(const [x,z]of [[-.18,.15],[.18,.11],[.07,-.10]])itemBlock(r,x,.13,z,.10,.035,.04,'#4b4f4b');return;}
 if(id==='feathers'){buildFeatherItem(r,-.14,0,0,.86);buildFeatherItem(r,.16,.02,.045,.95);return;}
 if(id==='potato'){itemOval(r,0,0,0,.81,.55,.57,'#bc9866',7);for(const [x,y,z]of [[-.22,.13,.22],[.10,.18,.23],[.26,-.03,.24]])itemOval(r,x,y,z,.055,.04,.017,'#80663f',5);return;}
 if(id==='potatoSeeds'){for(const [x,y,z]of [[-.23,-.12,0],[.05,-.16,.08],[.27,-.04,0],[-.16,.18,0],[.13,.17,.06]])itemOval(r,x,y,z,.18,.24,.12,'#987044',6);return;}
 if(id==='herbs'){
  for(const side of [-1,0,1]){itemRod(r,[0,-.42,0],[side*.17,.35,0],.013,'#6b9250');for(const y of [-.05,.14])for(const dir of [-1,1]){const x=side*.13;itemPlate(r,[[x,y,0],[x+dir*.24,y+.035,.04],[x+dir*.15,y+.17,.02]],side?'#79a05c':'#a0bb72',.018);}}
  itemRod(r,[-.09,-.25,.04],[.10,-.25,.04],.025,'#cab27a');return;
 }
 if(id==='coins'){for(const [x,y,z]of [[-.17,.04,.07],[.16,.04,-.10],[.10,.10,-.10],[-.03,.04,.26]]){itemProfile(r,x,y,z,.33,.055,.33,[[-.5,1],[.5,1]],'#d8b14d',10);itemProfile(r,x,y+.03,z,.24,.012,.24,[[-.5,1],[.5,1]],'#f0d176',10);}return;}
 return false;
}
function buildSupplyItem(r,id,item){
 const food=itemFoodInfo(id);if(food){buildFoodItem(r,food);return {lie:true,food};}
 if(item.logType){buildLogItem(r,item.logType);return {lie:false};}
 if(item.resource){buildOreItem(r,item.resource);return {lie:false};}
 if(item.metal){buildBarItem(r,item.metal);return {lie:false};}
 if(ITEM_RUNE_GLYPHS[id]){buildRuneItem(r,id);return {lie:true};}
 if(item.beltTool){buildToolItem(r,id,item);return {lie:true};}
 if(id==='arrowheads'||id==='arrowShafts'||id==='headlessArrows'||id==='arrows'||/Arrowheads$|Arrows$/.test(id)){buildAmmoItem(r,id);return {lie:true};}
 if(item.slot==='body'||id==='leatherBoots'){buildClothingItem(r,id,item);return {lie:true};}
 if(item.style==='ranged'&&item.slot==='weapon'){buildBowItem(r,id);return {lie:true};}
 if(buildMiscItem(r,id)===false)return null;
 return {lie:!['ashes','coins'].includes(id)};
}
function itemVisual(id){
 if(itemVisualCache.has(id))return itemVisualCache.get(id);
 const item=ITEMS[id]||(id==='coins'?{name:'Coins'}:null);if(!item)return null;
 const faces=[],r={software:true,face:(points,color)=>faces.push({points:points.map(p=>Array.from(p)),color})};let info;
 const imported=typeof modularModel==='function'&&modularModel(id)?wornModularMesh('male',id):null;
 if(imported){
  briarEmit(r,imported,briarTransform(0,0,0));
  const shoulders=armorShoulderItem(id);if(shoulders)briarEmit(r,wornModularMesh('male',shoulders),briarTransform(0,0,0));
  // Pair gloves below the cuffs and face shields toward the icon camera;
  // their authored bind poses remain unchanged on the character.
  if(item.slot==='hands')for(const f of faces)f.points=f.points.map(([x,y,z])=>[Math.sign(x)*.14+z+.06,Math.abs(x)-.52,y-1.45]);
  if(item.slot==='shield')for(const f of faces)f.points=f.points.map(([x,y,z])=>[y,z,x]);
  info={lie:true,authored:true};
 }
 else info=buildSupplyItem(r,id,item);
 if(!info||!faces.length)return null;
 const points=faces.flatMap(f=>f.points),lo=[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),hi=[0,1,2].map(k=>Math.max(...points.map(p=>p[k]))),span=Math.max(...hi.map((v,k)=>v-lo[k]))||1;
 // Center every mesh without changing the proportions of the original asset.
 for(const f of faces){f.points=f.points.map(p=>p.map((v,k)=>(v-(lo[k]+hi[k])/2)/span));const [a,b,c]=f.points,u=b.map((v,k)=>v-a[k]),v=c.map((v,k)=>v-a[k]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;f.normal=n.map(v=>v/len);}
 const min=[0,1,2].map(k=>(lo[k]-hi[k])/2/span),max=min.map(v=>-v),data=[];
 for(const f of faces)flatFaceData(data,f.points,f.color,null,12);
 const visual={...info,faces,min,max,mesh:{packed:new Float32Array(data)},size:id.includes('_dagger')?.48:item.slot==='weapon'?.90:item.beltTool?.80:info.food?.kind==='shrimp'?.49:id==='coins'?.46:.68};
 itemVisualCache.set(id,visual);return visual;
}
function drawItemModelIcon(g,id){
 const model=itemVisual(id);if(!model)return false;const w=g.canvas.width,h=g.canvas.height,key=id+':'+w+':'+h;
 let icon=itemIconCache.get(key);if(!icon){
  icon=document.createElement('canvas');icon.width=w;icon.height=h;const q=icon.getContext('2d'),yaw=-.35,tilt=model.lie?.50:.82,cy=Math.cos(yaw),sy=Math.sin(yaw),ct=Math.cos(tilt),st=Math.sin(tilt);
  const projected=model.faces.map(f=>({...f,p:f.points.map(([x,y,z])=>{const u=x*cy-z*sy,d=x*sy+z*cy;return {x:u,y:d*st-y*ct,depth:d*ct+y*st};})}));
  const points=projected.flatMap(f=>f.p),loX=Math.min(...points.map(p=>p.x)),hiX=Math.max(...points.map(p=>p.x)),loY=Math.min(...points.map(p=>p.y)),hiY=Math.max(...points.map(p=>p.y));
  const foot=model.food?h*.15:0,k=Math.min(w*.84/(hiX-loX||1),(h*.84-foot)/(hiY-loY||1))*(id.includes('_dagger')?.72:1),ox=w/2-(loX+hiX)*k/2,oy=(h-foot)/2-(loY+hiY)*k/2;
  projected.sort((a,b)=>a.p.reduce((s,p)=>s+p.depth,0)/a.p.length-b.p.reduce((s,p)=>s+p.depth,0)/b.p.length);
  for(const f of projected){const n=f.normal,light=.76+.30*Math.max(0,-n[0]*.43+n[1]*.65+n[2]*.62);q.fillStyle=shade3(f.color,light);q.beginPath();f.p.forEach((p,i)=>q[i?'lineTo':'moveTo'](ox+p.x*k,oy+p.y*k));q.closePath();q.fill();}
  if(model.food){q.font='bold '+Math.round(h*.13)+'px sans-serif';q.textAlign='center';q.fillStyle=model.food.state==='raw'?'#bad7d9':model.food.state==='burnt'?'#beb6a5':'#edbd82';q.fillText(model.food.state.toUpperCase(),w/2,h*.95);}
  itemIconCache.set(key,icon);if(itemIconCache.size>256)itemIconCache.delete(itemIconCache.keys().next().value);
 }
 g.drawImage(icon,0,0,w,h);return true;
}
function groundItemTransform(model,x,z,angle=0){
 const k=model.size,c=Math.cos(angle),s=Math.sin(angle),t=model.lie?Math.PI/2:0,ct=Math.cos(t),st=Math.sin(t),bottom=model.lie?model.min[2]:model.min[1];
 return [c*k,s*st*k,s*ct*k,x,0,ct*k,-st*k,-bottom*k+.025,-s*k,c*st*k,c*ct*k,z];
}
function drawGroundItemModel(r,id,x,z,angle=0){
 const model=itemVisual(id);if(!model)return false;const matrix=groundItemTransform(model,x,z,angle),q=groundedPainter(r,x,z);
 if(q.indexed)q.indexed(model.mesh,matrix);
 else for(const f of model.faces){const normal=briarNormal(f.normal,0,matrix),len=Math.hypot(...normal)||1,light=.76+.30*Math.max(0,(-normal[0]*.43+normal[1]*.65+normal[2]*.62)/len);q.face(f.points.map(p=>briarPoint(p,0,matrix)),shade3(f.color,light),null,12);}
 return true;
}
function drawGroundPileModels(r,pile,x,z){
 const ids=Object.keys(pile.items).filter(id=>pile.items[id]>0),shown=ids.slice(0,3);
 shown.forEach((id,i)=>{const offset=shown.length===1?0:.19,angle=shown.length===1?-.35:i*.75-.75;drawGroundItemModel(r,id,x+(i-(shown.length-1)/2)*offset,z+(i%2)*.12,angle);});
 return shown.length>0;
}
const flatGroundItemIcons=new Map();
function drawFlatGroundItem(g,id,x,y,size){
 let icon=flatGroundItemIcons.get(id);if(!icon){icon=document.createElement('canvas');icon.width=icon.height=64;if(!drawItemModelIcon(icon.getContext('2d'),id))return false;flatGroundItemIcons.set(id,icon);}
 g.drawImage(icon,x-size/2,y-size,size,size);return true;
}
