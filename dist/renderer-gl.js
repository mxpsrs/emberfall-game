'use strict';
// GPU depth, directional sunlight, PCF shadows and world-space materials.
// All interaction coordinates still use the existing orthographic camera.
const realmVertexShader = `
precision highp float;
attribute vec3 aPosition; attribute vec3 aNormal; attribute vec3 aColor; attribute float aMaterial; attribute vec2 aUV;
uniform float uLandCamera; uniform mat4 uModel; uniform vec4 uCamera; uniform vec4 uView; uniform vec3 uOrigin; uniform float uShadowPass; uniform float uLightRange; uniform float uTime;
varying vec3 vWorld; varying vec3 vNormal; varying vec3 vColor; varying float vMaterial; varying vec3 vShadow; varying vec2 vUV;
void main(){
 vec3 world=(uModel*vec4(aPosition,1.0)).xyz;if(aMaterial>8.5&&aMaterial<9.5){world.x+=sin(uTime*1.4+world.z*1.7)*min(.5,max(0.0,world.y))*.075;}vec3 p=world-uOrigin;
 vec3 light=normalize(vec3(-0.55,1.0,0.38)); vec3 right=normalize(vec3(light.z,0.0,-light.x)); vec3 up=cross(light,right);
 vec3 lp=vec3(dot(p,right),dot(p,up),-dot(p,light));
 vShadow=vec3(lp.xy/uLightRange*0.5+0.5,lp.z/160.0+0.5);
 if(uShadowPass>0.5){gl_Position=vec4(lp.xy/uLightRange,lp.z/80.0,1.0);}
 else {float dx=world.x-uCamera.x,dz=world.z-uCamera.y;float cy=cos(uCamera.z),sy=sin(uCamera.z),st=sin(uCamera.w),ct=cos(uCamera.w);float u=dx*cy-dz*sy,d=dx*sy+dz*cy;float sx=u*uView.z+uView.x*.5;float yy=(d*st-(world.y-uLandCamera)*ct)*uView.z+uView.y*.54;gl_Position=vec4(sx/uView.x*2.0-1.0,1.0-yy/uView.y*2.0,-(d*ct+world.y*st)/180.0,1.0);}
 vWorld=world;vNormal=mat3(uModel)*aNormal;vColor=aColor;vMaterial=aMaterial;vUV=aUV;
}`;
const realmFragmentShader = `
precision highp float;
varying vec3 vWorld; varying vec3 vNormal; varying vec3 vColor; varying float vMaterial; varying vec3 vShadow; varying vec2 vUV;
uniform sampler2D uShadow;uniform sampler2D uAtlas;uniform float uShadowPass;uniform float uTime;uniform float uNight;uniform float uInterior;uniform vec3 uOrigin;uniform vec3 uEye;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
vec4 packDepth(float d){vec4 e=fract(d*vec4(1.0,255.0,65025.0,16581375.0));e-=e.yzww*vec4(1.0/255.0,1.0/255.0,1.0/255.0,0.0);return e;}
float unpackDepth(vec4 d){return dot(d,vec4(1.0,1.0/255.0,1.0/65025.0,1.0/16581375.0));}
void main(){
 vec4 albedo=vec4(1.0);if(vMaterial>19.5){float tile=floor(vMaterial-20.0+.01);vec2 cell=vec2(mod(tile,8.0),floor(tile/8.0));albedo=texture2D(uAtlas,(cell+(vec2(2.0)+fract(vUV)*508.0)/512.0)/8.0);if(albedo.a<.45)discard;}
 if(uShadowPass>.5){gl_FragColor=packDepth(gl_FragCoord.z);return;}
 vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 light=normalize(vec3(-.55,1.0,.38)),col=vColor;float gloss=.0;vec2 p=vWorld.xz;float grain=noise(p*18.0);
 if(vMaterial>19.5){col*=albedo.rgb;}
 else if(vMaterial>17.5&&vMaterial<18.5){vec2 faceP=abs(n.y)>.6?p:abs(n.x)>.5?vWorld.zy:vWorld.xy;vec2 grid=faceP*vec2(1.65,3.2);grid.x+=mod(floor(grid.y),2.0)*.5;vec2 uv=fract(grid);float mortar=smoothstep(.015,.07,min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y)));col*=.77+.20*mortar+.065*noise(faceP*12.0);}
 else if(vMaterial>16.5&&vMaterial<17.5){float rim=min(min(vUV.x,1.0-vUV.x),1.0-vUV.y);col*=.72+.28*smoothstep(.0,.075,rim);col*=.96+.055*noise(vWorld.xz*32.0);}
 else if(vMaterial>14.5&&vMaterial<16.5){float patches=noise(p*.42)*.6+noise(p*2.7)*.4;vec3 grass=mix(vec3(.19,.31,.13),vec3(.44,.53,.23),patches)*(.91+.15*noise(p*34.0));vec3 dirt=mix(vec3(.42,.34,.22),vec3(.55,.46,.31),noise(p*4.5));dirt*=.91+.13*noise(p*28.0);if(vMaterial>15.5)dirt=texture2D(uAtlas,(vec2(5.0,0.0)+(vec2(2.0)+fract(p*.5)*508.0)/512.0)/8.0).rgb*.83;float edge=min(vUV.x,1.0-vUV.x);float wear=smoothstep(.01,.20,edge+(noise(p*8.0)-.5)*.10);col=mix(grass,dirt,wear);}

 else if(vMaterial>.5&&vMaterial<1.5){float patches=noise(p*.22)*.65+noise(p*2.7)*.35;col=mix(vec3(.21,.30,.15),vec3(.42,.49,.25),patches);col*=.94+.10*noise(p*30.0);float bank=vUV.y>.5?1.0-smoothstep(.4,3.8,vUV.x):0.0;vec3 earth=mix(vec3(.29,.26,.19),vec3(.48,.42,.30),noise(p*3.5));col=mix(col,earth,max(bank*.82,(1.0-smoothstep(.72,.94,n.y))*.65));if(vUV.y>.5){vec3 dirt=mix(vec3(.38,.31,.21),vec3(.54,.45,.31),noise(p*2.0));dirt*=.94+.09*noise(p*25.0);vec3 paving=texture2D(uAtlas,(vec2(5.0,0.0)+(vec2(2.0)+fract(p*.5)*508.0)/512.0)/8.0).rgb*.83;dirt=mix(dirt,paving,vColor.g);col=mix(col,dirt,smoothstep(.05,.9,vColor.r));}}
 else if(vMaterial<2.5&&vMaterial>1.5){col=mix(vec3(.39,.30,.18),vec3(.67,.55,.34),noise(p*1.4));float gravel=step(.84,hash(floor(p*15.0)));col+=gravel*.09;}
 else if(vMaterial<3.5&&vMaterial>2.5){col=texture2D(uAtlas,(vec2(5.0,0.0)+(vec2(2.0)+fract(p*.5)*508.0)/512.0)/8.0).rgb*.83;}
 else if(vMaterial<4.5&&vMaterial>3.5){float flow=noise(p*.18+vec2(uTime*.015,-uTime*.012));float a=dot(p,vec2(.65,.23))+uTime*.6,b=dot(p,vec2(-.19,.78))-uTime*.37;float ripple=sin(a+flow*3.0)*.018+sin(b)*.012;n=normalize(vec3(cos(a)*.035,1.0,cos(b)*.025));col=mix(vec3(.055,.20,.22),vec3(.12,.30,.29),flow)+ripple;float glint=pow(max(0.0,sin(a*2.0+sin(b))),24.0);col+=vec3(.14,.20,.18)*glint*.10;gloss=.12;}
 else if(vMaterial<5.5&&vMaterial>4.5){vec2 wood=vWorld.xz;float plank=floor(wood.x*3.0);float seam=smoothstep(.015,.06,min(fract(wood.x*3.0),1.0-fract(wood.x*3.0)));float grain=noise(vec2(wood.x*65.0,wood.y*1.6));float join=smoothstep(.0,.02,fract(wood.y*.36+mod(plank,3.0)*.33));col*=.76+.13*grain+.11*hash(vec2(plank,floor(wood.y*.36)));col*=.76+.24*seam*join;}
 else if(vMaterial<6.5&&vMaterial>5.5){vec2 tile=vec2(vWorld.z*5.0,(vWorld.x+vWorld.y)*6.0);tile.x+=mod(floor(tile.y),2.0)*.5;vec2 f=fract(tile);float lip=smoothstep(.02,.15,min(f.x,min(f.y,1.0-f.y)));col*=.68+.32*lip+hash(floor(tile))*.12;}
 else {col*=.95+.075*noise((vWorld.xz+vWorld.yy)*24.0);}
 float lit=1.0;if(vShadow.x>0.0&&vShadow.x<1.0&&vShadow.y>0.0&&vShadow.y<1.0){float shade=0.0;float bias=.0008+.0006*(1.0-max(0.0,dot(n,light)));for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float d=unpackDepth(texture2D(uShadow,vShadow.xy+vec2(float(x),float(y))/1024.0));shade+=step(vShadow.z-bias,d);}lit=.48+.52*shade/9.0;}
 float diffuse=max(0.0,dot(n,light));vec3 ambient=mix(vec3(.35,.40,.46),vec3(.31,.37,.57),uNight*.7);vec3 sun=mix(vec3(.78,.72,.58),vec3(.34,.39,.54),uNight);col*=ambient+sun*diffuse*lit;col+=vec3(.48,.65,.70)*pow(max(0.0,dot(reflect(-light,n),uEye)),40.0)*gloss*lit;
 float localGlow=exp(-length(vWorld-uOrigin)*.19)*uInterior;col+=vec3(.20,.10,.025)*localGlow;
 float fog=smoothstep(19.0,65.0,length(vWorld.xz-uOrigin.xz));col=mix(col,vec3(.28,.39,.40),fog*.32);col=pow(max(col,vec3(0.0)),vec3(.92));gl_FragColor=vec4(col,1.0);
}`;
let realmGPU=null,realmGPUUnavailable=false;
function createRealmGPU(){
 const surface=document.createElement('canvas');const gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'high-performance'});
 if(!gl||typeof gl.getParameter(gl.VERSION)!=='string')return null;
 const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
 const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,realmVertexShader));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,realmFragmentShader));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const attrs=['aPosition','aNormal','aColor','aMaterial','aUV'].map(n=>gl.getAttribLocation(program,n));const uniforms=Object.fromEntries(['uCamera','uView','uOrigin','uShadowPass','uLightRange','uShadow','uTime','uNight','uInterior','uEye','uAtlas','uModel','uLandCamera'].map(n=>[n,gl.getUniformLocation(program,n)]));
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1024,1024,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const framebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);const depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,1024,1024);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Shadow target unavailable');gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 const atlas=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,atlas);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));if(typeof REALM_ATLAS_IMAGE!=='undefined'&&REALM_ATLAS_IMAGE?.width>0&&REALM_ATLAS_IMAGE.complete!==false){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,REALM_ATLAS_IMAGE);}gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.activeTexture(gl.TEXTURE0);
 const sharedMeshes=new WeakMap(),cache=new WeakMap(),terrain=new Map(),dynamicBuffer=gl.createBuffer();
 const upload=data=>{const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return {buffer,count:data.length/12};};
 const bind=entry=>{const a=entry.model?Array.from(entry.model):null;if(a&&typeof landHeight==='function')a[7]+=landHeight(a[3],a[11]);gl.uniformMatrix4fv(uniforms.uModel,false,a?new Float32Array([a[0],a[4],a[8],0,a[1],a[5],a[9],0,a[2],a[6],a[10],0,a[3],a[7],a[11],1]):new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]));gl.bindBuffer(gl.ARRAY_BUFFER,entry.buffer);for(let i=0;i<5;i++){gl.enableVertexAttribArray(attrs[i]);gl.vertexAttribPointer(attrs[i],i===4?2:i===3?1:3,gl.FLOAT,false,48,i===4?40:i*12);}gl.drawArrays(gl.TRIANGLES,0,entry.count);};
 surface.addEventListener('webglcontextlost',e=>{e.preventDefault();realmGPU=null;realmGPUUnavailable=true;});surface.addEventListener('webglcontextrestored',()=>{realmGPUUnavailable=false;});
 return {surface,gl,cache,sharedMeshes,terrain,upload,render(entries,dynamic,g){
  if(gl.isContextLost())return;
  const dpr=Math.min(window.devicePixelRatio||1,1.5),width=Math.round(screen.w*dpr),height=Math.round(screen.h*dpr);if(surface.width!==width||surface.height!==height){surface.width=width;surface.height=height;}
  gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
  gl.uniform4f(uniforms.uCamera,px+.5,py+.5,view3d.yaw,view3d.tilt);gl.uniform4f(uniforms.uView,screen.w,screen.h,view3d.zoom,0);gl.uniform3f(uniforms.uOrigin,px+.5,0,py+.5);gl.uniform1f(uniforms.uLightRange,Math.max(20,Math.min(85,Math.hypot(screen.w,screen.h)/view3d.zoom*.65)));gl.uniform1f(uniforms.uTime,time);gl.uniform1f(uniforms.uInterior,inWorld()?0:1);
  gl.uniform1f(uniforms.uLandCamera,typeof walkSurfaceHeight==='function'?walkSurfaceHeight(px+.5,py+.5):0);const hours=(s.worldClock/480*24+4)%24;gl.uniform1f(uniforms.uNight,inWorld()?(hours>=20||hours<5?1:hours>=17?(hours-17)/3:hours<8?(8-hours)/3:0):.25);gl.uniform3f(uniforms.uEye,Math.sin(view3d.yaw)*Math.cos(view3d.tilt),Math.sin(view3d.tilt),Math.cos(view3d.yaw)*Math.cos(view3d.tilt));
  const drawEntries=[...entries];if(dynamic.length){const data=new Float32Array(dynamic);gl.bindBuffer(gl.ARRAY_BUFFER,dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);drawEntries.push({buffer:dynamicBuffer,count:data.length/12});}
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,null);gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.viewport(0,0,1024,1024);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform1f(uniforms.uShadowPass,1);for(const entry of drawEntries)if(!entry.terrain)bind(entry);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform1f(uniforms.uShadowPass,0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(uniforms.uShadow,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,atlas);gl.uniform1i(uniforms.uAtlas,1);gl.activeTexture(gl.TEXTURE0);for(const entry of drawEntries)bind(entry);g.drawImage(surface,0,0,screen.w,screen.h);
 }};
}
function realmFaceData(data,points,color,normals,material=0,colors,uvs){
 if(points.length<3)return;const rgb=parseInt(color.slice(1),16),col=[(rgb>>16)/255,((rgb>>8)&255)/255,(rgb&255)/255];
 const a=points[0],b=points[1],c=points[2],u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...normal)||1;for(let i=0;i<3;i++)normal[i]/=len;
 for(let i=1;i<points.length-1;i++)for(const j of [0,i,i+1])data.push(...points[j],...(normals?.[j]||normal),...(colors?.[j]||col),material,...(uvs?.[j]||[0,0]));
}
function realmGroundCover(data,x,z){
 const seed=Math.abs(Math.sin(x*127.1+z*311.7)*43758.5453)%1;if(seed>.37||typeof roadInfluence==='function'&&roadInfluence(x+.5,z+.5)[0]>.2)return;
 // Keep the paving and occupied building footprints clear.
 if(buildings.some(b=>x>=b.x-1&&x<b.x+b.w+1&&z>=b.y-1&&z<b.y+b.h+1))return;
 const river=[[x+1,z],[x-1,z],[x,z+1],[x,z-1]].some(([a,b])=>terrainType(a,b)===3),count=river?5:3;
 for(let i=0;i<count;i++){const xx=x+.17+((seed*11+i*.27)% .65),zz=z+.12+((seed*17+i*.31)% .72),h=river?.38+i*.045:.10+i*.035,w=river?.024:.035;realmFaceData(data,[[xx-w,0,zz],[xx+w,0,zz],[xx+.08,h,zz+.025]],river?'#7d914e':'#809956',null,9);if(river)realmFaceData(data,[[xx-.025,h*.6,zz],[xx+.025,h*.6,zz],[xx+.045,h+.1,zz],[xx+.01,h+.1,zz]],'#8c7345',null,9);}
 if(seed<.065){for(let i=0;i<3;i++){const xx=x+.25+i*.2,zz=z+.5;realmFaceData(data,[[xx-.05,.16,zz],[xx,.23,zz-.04],[xx+.05,.16,zz],[xx,.12,zz+.04]],(x+z)%2?'#d7be70':'#adb4d0',[[0,1,0],[0,1,0],[0,1,0],[0,1,0]],9);}}
}
function realmTerrainEntries(gpu){
 let chunks=gpu.terrain.get(currentScene);const [mw,mh]=sceneSize();if(!chunks){chunks=[];for(let z=inWorld()?-128:0;z<(inWorld()?mh+128:mh);z+=8)for(let x=inWorld()?-128:0;x<(inWorld()?mw+128:mw);x+=8)chunks.push({x:x+4,z:z+4,terrain:true});gpu.terrain.set(currentScene,chunks);}
 const visible=chunks.filter(c=>{if(Math.hypot(c.x-px,c.z-py)>Math.hypot(screen.w,screen.h)/view3d.zoom+24)return false;const p=project3(c.x,0,c.z),margin=view3d.zoom*7;return p.x>-margin&&p.x<screen.w+margin&&p.y>-margin&&p.y<screen.h+margin;});
 gpu.terrainTick=(gpu.terrainTick||0)+1;
 for(const c of visible){c.used=gpu.terrainTick;if(c.buffer)continue;const data=[],x=c.x-4,z=c.z-4;
  for(let zz=z;zz<Math.min(z+8,inWorld()?mh+128:mh);zz++)for(let xx=x;xx<Math.min(x+8,inWorld()?mw+128:mw);xx++){
   const type=terrainType(xx,zz),corners=[[xx,zz],[xx,zz+1],[xx+1,zz+1],[xx+1,zz]],shore=inWorld()&&corners.some(([a,b])=>shoreDistance(a,b)<2);
   if(type!==3){const detail=inWorld()?2:1;for(let dz=0;dz<detail;dz++)for(let dx=0;dx<detail;dx++){const a=xx+dx/detail,b=zz+dz/detail,k=1/detail,points=[[a,0,b],[a,0,b+k],[a+k,0,b+k],[a+k,0,b]];realmFaceData(data,points,'#808080',null,type+1,inWorld()?points.map(p=>roadInfluence(p[0],p[2])):null,inWorld()?points.map(p=>[shoreDistance(p[0],p[2]),1]):null);}if(type===0&&inWorld())realmGroundCover(data,xx,zz);}
   if(type===3||shore){const points=corners.map(([a,b])=>[a,.01-(inWorld()?landHeight(a,b):0),b]);realmFaceData(data,points,'#427e89',null,4);}
  }
  Object.assign(c,gpu.upload(new Float32Array(data)));
 }
 const resident=[...gpu.terrain.values()].flat().filter(c=>c.buffer);if(resident.length>384){resident.sort((a,b)=>a.used-b.used);for(const c of resident.slice(0,resident.length-384)){if(c.used===gpu.terrainTick)continue;gpu.gl.deleteBuffer(c.buffer);delete c.buffer;}}
 return visible;
}
const canvasPainterRealm=painter3;
painter3=function(g,project){
 if(project!==project3||realmGPUUnavailable){const painter=canvasPainterRealm(g,project);painter.software=true;return painter;}
 if(!realmGPU){try{realmGPU=createRealmGPU();}catch(error){console.warn('Using canvas rendering:',error.message);}if(!realmGPU){realmGPUUnavailable=true;return canvasPainterRealm(g,project);}}
 const gpu=realmGPU,entries=[],dynamic=[];
 return {face(points,color,normals,material,colors,uvs){realmFaceData(dynamic,points,color,normals,material,colors,uvs);},indexed(mesh,m){realmIndexedData(dynamic,mesh,m);},cached(cached){for(const instance of cached.instances||[]){let entry=gpu.sharedMeshes.get(instance.mesh);if(!entry){const data=[];if(typeof packingLocalMesh!=='undefined')packingLocalMesh=true;try{realmIndexedData(data,instance.mesh,[1,0,0,0,0,1,0,0,0,0,1,0]);}finally{if(typeof packingLocalMesh!=='undefined')packingLocalMesh=false;}entry=gpu.upload(new Float32Array(data));gpu.sharedMeshes.set(instance.mesh,entry);}entries.push({...entry,model:instance.matrix});}if(!cached.faces.length)return cached.height;let entry=gpu.cache.get(cached);if(!entry){const data=[];for(const f of cached.faces){let material=f.material||0;if(!material&&cached.kind==='building'){const n=parseInt(f.color.slice(1),16),red=n>>16,green=(n>>8)&255,blue=n&255,top=f.points.reduce((a,p)=>a+p[1],0)/f.points.length;if(top>2.05&&Math.max(red,green,blue)-Math.min(red,green,blue)>23)material=6;else if(red>green*1.15&&green>blue*1.1)material=5;}realmFaceData(data,f.points,f.color,f.normals,material,f.colors,f.uvs);}entry=gpu.upload(new Float32Array(data));gpu.cache.set(cached,entry);}entries.push(entry);return cached.height;},flush(){gpu.render([...realmTerrainEntries(gpu),...entries],dynamic,g);}};
};
// Smooth vertex normals on bodies and fitted equipment; the canvas fallback remains valid.
const profileBeforeGPU=profile3;
profile3=function(r,x,y,z,w,h,d,rings,color,t=a=>a,n=12){
 if(!realmGPU||r.software)return profileBeforeGPU(r,x,y,z,w,h,d,rings,color,t,n);
 n=meshDetail3<1?Math.max(6,Math.round(n*meshDetail3)):Math.max(12,n);
 const rows=rings.map(([yy,rr])=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return t([x+Math.cos(a)*w*.5*rr,y+yy*h,z+Math.sin(a)*d*.5*rr]);}));
 const normals=rings.map(([yy,rr],j)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,prev=rings[Math.max(0,j-1)],next=rings[Math.min(rings.length-1,j+1)],slope=(next[1]-prev[1])*Math.max(w,d)*.5/Math.max(.001,(next[0]-prev[0])*h),base=t([x,y,z]),end=t([x+Math.cos(a),y-slope,z+Math.sin(a)]),v=end.map((p,k)=>p-base[k]),l=Math.hypot(...v)||1;return v.map(p=>p/l);}));
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<n;i++){const next=(i+1)%n;r.face([rows[j][i],rows[j+1][i],rows[j+1][next],rows[j][next]],color,[normals[j][i],normals[j+1][i],normals[j+1][next],normals[j][next]]);}
 r.face([...rows[0]].reverse(),color);r.face(rows.at(-1),color);
};
