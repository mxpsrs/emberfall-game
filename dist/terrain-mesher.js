'use strict';
// A read-only cell kernel shared by the terrain worker and the cook/QA tools.
// Native Scene and landHeight remain the owners of collision and authored state.
(function(root){
 const base=(x,z)=>2.4+1.5*Math.sin(x*.052)*Math.cos(z*.061)+1.1*Math.sin(z*.026+x*.019)+Math.exp(-Math.pow((x-185)/27,2))*7*(.65+.35*Math.cos(z*.045));
 const decode=value=>typeof value==='string'?Uint8Array.from(atob(value),c=>c.charCodeAt(0)):value;
 function prepare(page){
  if(page.version!==1||!Number.isInteger(page.size)||page.size<1||page.size>32)throw Error('Invalid terrain page');
  const n=page.size,side=n+3,colors=decode(page.colors),flags=decode(page.flags),materials=decode(page.materials);
  if(page.heightsPacked){const bytes=decode(page.heightsPacked),values=[];let at=0,last=0;
   while(at<bytes.length){let value=0,shift=0,byte;do{if(at>=bytes.length||shift>28)throw Error('Corrupt terrain heights');byte=bytes[at++];value+=(byte&127)*2**shift;shift+=7;}while(byte&128);
    if(value===0)values.push(null);else {value--;last+=value%2?-(value+1)/2:value/2;values.push(last);}if(values.length>side*side)throw Error('Terrain height overflow');
   }page={...page,heights:values};
  }
  if((Array.isArray(page.heights)&&page.heights.length!==side*side)||colors.length!==(n*2+1)**2*3||flags.length!==n*n||materials.length!==(n*2)**2)throw Error('Truncated terrain page');
  const valid=h=>h===null||Number.isSafeInteger(h);
  if(!Number.isInteger(page.x)||!Number.isInteger(page.z)||(Array.isArray(page.heights)?!page.heights.every(valid):!valid(page.heights)))throw Error('Invalid terrain heights');
  const heights=new Float32Array(side*side);
  for(let z=0;z<side;z++)for(let x=0;x<side;x++){const i=x+z*side,h=Array.isArray(page.heights)?page.heights[i]:page.heights;heights[i]=h===null?base(page.x+x-1,page.z+z-1):h/10000;}
  return {...page,heights,colors,flags,materials,bytes:heights.byteLength+colors.byteLength+flags.byteLength+materials.byteLength};
 }
 function cell(page,x,z,size=16){
  const dx=x-page.x,dz=z-page.z,n=page.size,ns=n+3,side=size+3,cs=size*2+1,ps=n*2+1;
  if(dx<0||dz<0||dx+size>n||dz+size>n)throw Error('Terrain cell is outside its page');
  const heights=new Float32Array(side*side),colors=new Uint8Array(cs*cs*3),flags=new Uint8Array(size*size),materials=new Uint8Array(size*size*4);
  for(let j=0;j<side;j++)for(let i=0;i<side;i++)heights[i+j*side]=page.heights[dx+i+(dz+j)*ns];
  for(let j=0;j<cs;j++)for(let i=0;i<cs;i++){const a=(i+j*cs)*3,b=(dx*2+i+(dz*2+j)*ps)*3;colors.set(page.colors.subarray(b,b+3),a);}
  for(let j=0;j<size;j++)for(let i=0;i<size;i++)flags[i+j*size]=page.flags[dx+i+(dz+j)*n];
  for(let j=0;j<size*2;j++)for(let i=0;i<size*2;i++)materials[i+j*size*2]=page.materials[dx*2+i+(dz*2+j)*n*2];
  return {x,z,size,heights,colors,flags,materials};
 }
 function sampler(c){
  const n=c.size,side=n+3;
  const node=(x,z)=>c.heights[(x-c.x+1)+(z-c.z+1)*side];
  const height=(x,z)=>{const ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz;return v>=u?node(ix,iz)*(1-v)+node(ix,iz+1)*(v-u)+node(ix+1,iz+1)*u:node(ix,iz)*(1-u)+node(ix+1,iz)*(u-v)+node(ix+1,iz+1)*v;};
  const normal=(x,z)=>{const a=height(x-.2,z)-height(x+.2,z),b=height(x,z-.2)-height(x,z+.2),len=Math.hypot(a,.4,b);return [a/len,.4/len,b/len];};
  const color=(x,z)=>{const i=(Math.round((x-c.x)*2)+Math.round((z-c.z)*2)*(n*2+1))*3;return [c.colors[i]/255,c.colors[i+1]/255,c.colors[i+2]/255];};
  return {height,normal,color};
 }
 function mesh(c,requestedStep){
  if(![.5,1,2,4].includes(requestedStep))throw Error('Invalid terrain LOD');
  const n=c.size,s=sampler(c),data=[];
  // Shores, stair holes, paint and roads retain fine topology at every distance.
  const complex=c.flags.some(f=>f!==1)||c.materials.some(m=>m!==1)||c.colors.some((v,i)=>i%3!==2&&v>12);
  const step=complex?Math.min(1,requestedStep):requestedStep;
  const vertex=(x,z,m)=>[x,s.height(x,z),z,...s.normal(x,z),...(m&128?[0,0,1]:s.color(x,z)),m&127,x,z];
  for(let z=c.z;z<c.z+n;z+=step)for(let x=c.x;x<c.x+n;x+=step){
   const flag=c.flags[Math.floor(x-c.x)+Math.floor(z-c.z)*n];if(!(flag&1)||flag&4)continue;
   const material=c.materials[Math.min(n*2-1,Math.floor((x-c.x)*2))+Math.min(n*2-1,Math.floor((z-c.z)*2))*n*2],ring=[];
   const edge=(ax,az,bx,bz,boundary)=>{const count=boundary?Math.round(step*2):1;for(let i=0;i<count;i++)ring.push(vertex(ax+(bx-ax)*i/count,az+(bz-az)*i/count,material));};
   // Every outer edge has the same half-unit vertices, regardless of neighbor LOD.
   edge(x,z,x,z+step,x===c.x);edge(x,z+step,x+step,z+step,z+step===c.z+n);
   edge(x+step,z+step,x+step,z,x+step===c.x+n);edge(x+step,z,x,z,z===c.z);
   if(ring.length===4)for(const i of [0,1,2,0,2,3])data.push(...ring[i]);
   else {const center=vertex(x+step/2,z+step/2,material);for(let i=0;i<ring.length;i++)data.push(...center,...ring[i],...ring[(i+1)%ring.length]);}
  }
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const flag=c.flags[i+j*n];if(!(flag&2)||flag&4)continue;const x=c.x+i,z=c.z+j,points=[[x,z],[x,z+1],[x+1,z+1],[x+1,z]];
   for(const index of [0,1,2,0,2,3]){const [a,b]=points[index];data.push(a,.01,b,0,1,0,66/255,126/255,137/255,4,a,b);}
  }
  return {data:new Float32Array(data),step,requestedStep,complex};
 }
 root.VeldrenTerrainMesher=Object.freeze({base,prepare,cell,sampler,mesh});
})(globalThis);
