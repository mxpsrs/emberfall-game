'use strict';
// Original Veldren assembly model. Matrices are local to the building origin.
(function(root){
 const clone=v=>JSON.parse(JSON.stringify(v));
 const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0];
 function multiply(a,b){const r=[];for(let i=0;i<3;i++){for(let j=0;j<3;j++)r[i*4+j]=a[i*4]*b[j]+a[i*4+1]*b[4+j]+a[i*4+2]*b[8+j];r[i*4+3]=a[i*4]*b[3]+a[i*4+1]*b[7]+a[i*4+2]*b[11]+a[i*4+3];}return r;}
 function point(m,p){return [0,1,2].map(i=>m[i*4]*p[0]+m[i*4+1]*p[1]+m[i*4+2]*p[2]+m[i*4+3]);}
 function inverse(m){const [a,b,c,x,d,e,f,y,g,h,i,z]=m,det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);if(Math.abs(det)<1e-8)throw Error('Singular transform');const r=[(e*i-f*h)/det,(c*h-b*i)/det,(b*f-c*e)/det,0,(f*g-d*i)/det,(a*i-c*g)/det,(c*d-a*f)/det,0,(d*h-e*g)/det,(b*g-a*h)/det,(a*e-b*d)/det,0];for(let k=0;k<3;k++)r[k*4+3]=-(r[k*4]*x+r[k*4+1]*y+r[k*4+2]*z);return r;}
 function transform(x=0,y=0,z=0,angle=0,scale=1){const c=Math.cos(angle)*scale,s=Math.sin(angle)*scale;return [c,0,s,x,0,scale,0,y,-s,0,c,z];}
 function validate(a){
  if(!a||a.version!==1||!Array.isArray(a.modules)||a.modules.length>20000)throw Error('Invalid building assembly');
  const matrix=m=>{if(!Array.isArray(m)||m.length!==12||!m.every(v=>Number.isFinite(v)&&Math.abs(v)<1e7))throw Error('Invalid module transform');inverse(m);};matrix(a.parent);
  const ids=new Set();for(const m of a.modules){if(!m||typeof m.id!=='string'||ids.has(m.id)||typeof m.model!=='string'||!Number.isInteger(m.floor)||m.floor<0||m.floor>32)throw Error('Invalid module');ids.add(m.id);matrix(m.local);if(!Array.isArray(m.bounds)||m.bounds.length!==2||!m.bounds.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)))throw Error('Invalid module bounds');}
  for(const m of a.modules){if(m.host&&!ids.has(m.host))throw Error('Missing opening host');if(m.opening&&(!['service','normal'].every(k=>Array.isArray(m.opening[k])&&m.opening[k].length===3&&m.opening[k].every(Number.isFinite))))throw Error('Invalid opening');}
  if(a.layout!=null&&!Array.isArray(a.layout))throw Error('Invalid layout');
  for(const e of a.layout||[]){if(!Array.isArray(e.path)||!['civilRooms','civilUpperRooms','civilUpper','civilUpperLevels','civilRampart'].includes(e.path[0])||e.path.some(k=>['__proto__','prototype','constructor'].includes(k))||![e.position,e.door].filter(Boolean).every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)))throw Error('Invalid linked layout');}
  return a;
 }
 function serialize(a){validate(a);const out={version:1,buildingId:String(a.buildingId),layout:clone(a.layout||[]),parent:[...a.parent],modules:a.modules.map(m=>{const r={id:m.id,model:m.model,role:m.role||'prop',floor:m.floor,local:[...m.local],bounds:clone(m.bounds)};for(const k of ['host','objectId','destination','originalModel','cutaway','opening','stairs','name','baseline'])if(m[k]!=null)r[k]=clone(m[k]);return r;}).sort((a,b)=>a.id.localeCompare(b.id))};return out;}
 function category(key){if(/Roof/i.test(key))return /Corner/i.test(key)?'Roof corner':/End/i.test(key)?'Roof end':/Intersection|Cross/i.test(key)?'Roof intersection':'Roof straight';if(/Wall.*Door/i.test(key))return 'Door frames';if(/Wall.*Window|Window/i.test(key))return 'Windows';if(/Door/i.test(key))return 'Doors';if(/Wall.*Corner/i.test(key))return 'Wall corners';if(/Wall/i.test(key))return 'Walls';if(/Stair/i.test(key))return 'Stairs';if(/Floor/i.test(key))return 'Floors';if(/Balcony|Railing|Rail_/i.test(key))return 'Railings';if(/Column|Pillar/i.test(key))return 'Columns';if(/Foundation/i.test(key))return 'Foundations';return /Bed|Table|Chair|Shelf|Counter|Furnace|Anvil|Book|Chest|Throne/i.test(key)?'Interior props':'Exterior props';}
 function role(key){const c=category(key);return /Roof/.test(c)?'roof':/Door frames/.test(c)?'wall':c==='Doors'?'door':c==='Windows'?'window':/Wall/.test(c)?'wall':c==='Floors'?'floor':c==='Stairs'?'stairs':'prop';}
 function bounds(m){const pts=[];for(const x of [m.bounds[0][0],m.bounds[1][0]])for(const y of [m.bounds[0][1],m.bounds[1][1]])for(const z of [m.bounds[0][2],m.bounds[1][2]])pts.push(point(m.local,[x,y,z]));return [0,1].map(k=>[0,1,2].map(i=>Math[k?'max':'min'](...pts.map(p=>p[i]))));}
 function jointBounds(m){
  // The kit joins on the wall centre plane. Trim and frames must not push
  // neighbouring structural modules apart when snapping their endpoints.
  if(/Wall_(Plaster|UnevenBrick)_/.test(m.model)&&Math.abs(m.bounds[0][0]+1)<.01&&Math.abs(m.bounds[1][0]-1)<.01)return bounds({...m,bounds:[[-1,0,0],[1,3.02,0]]});
  return bounds(m);
 }
 function snap(a,candidate,config={}){
  const m=clone(candidate),grid=config.grid??.25,vertical=config.vertical??3,mode=config.mode||'edge',threshold=config.threshold??.65;
  if(grid>0){m.local[3]=Math.round(m.local[3]/grid)*grid;m.local[11]=Math.round(m.local[11]/grid)*grid;}
  if(mode==='floor'||mode==='stair-to-floor')m.local[7]=Math.round(m.local[7]/vertical)*vertical;
  let match=null,best=threshold;
  if(mode!=='grid'&&mode!=='floor')for(const other of a.modules){if(other.id===m.id||other.floor!==m.floor)continue;
   if((m.role==='door'||m.role==='window')&&other.role!=='wall'&&other.role!=='window')continue;
   if(mode==='roof-edge'&&!['wall','roof'].includes(other.role))continue;
   if(mode==='stair-to-floor'&&other.role!=='floor')continue;
   const aa=jointBounds(m),bb=jointBounds(other),ac=aa[0].map((v,i)=>(v+aa[1][i])/2),bc=bb[0].map((v,i)=>(v+bb[1][i])/2);
   if(m.role==='door'||m.role==='window'){const d=Math.hypot(ac[0]-bc[0],ac[2]-bc[2]);if(d<best){best=d;match={host:other.id,delta:[bc[0]-ac[0],0,bc[2]-ac[2]]};}continue;}
   const candidates=[];
   for(const axis of [0,2])for(const side of [0,1]){const delta=[0,0,0];delta[axis]=bb[1-side][axis]-aa[side][axis];const cross=axis===0?2:0;if(mode==='endpoint'||mode==='corner')delta[cross]=bb[0][cross]-aa[0][cross];else if(Math.abs(ac[cross]-bc[cross])<threshold)delta[cross]=bc[cross]-ac[cross];else if(aa[1][cross]<bb[0][cross]||aa[0][cross]>bb[1][cross])continue;candidates.push(delta);}
   for(const delta of candidates){const d=Math.hypot(...delta);if(d<best){best=d;match={host:other.id,delta};}}
  }
  if(match){m.local[3]+=match.delta[0];m.local[7]+=match.delta[1];m.local[11]+=match.delta[2];}
  const requiresHost=['door','window'].includes(m.role);return {module:m,host:match?.host||null,valid:!requiresHost||!!match,reason:requiresHost&&!match?'Choose a compatible wall':null};
 }
 class History{constructor(){this.undoStack=[];this.redoStack=[];}push(before,after){if(JSON.stringify(before)===JSON.stringify(after))return;this.undoStack.push(clone(before));if(this.undoStack.length>100)this.undoStack.shift();this.redoStack=[];}undo(current){if(!this.undoStack.length)return null;this.redoStack.push(clone(current));return this.undoStack.pop();}redo(current){if(!this.redoStack.length)return null;this.undoStack.push(clone(current));return this.redoStack.pop();}}
 root.VeldrenAssembly={clone,identity,multiply,point,inverse,transform,validate,serialize,category,role,bounds,snap,History};
})(globalThis);
