'use strict';
// GPU depth, directional sunlight, PCF shadows and world-space materials.
// The fallback renderer shares the live perspective camera and picking math.
const realmVertexShader = `
precision highp float;
attribute vec3 aPosition; attribute vec3 aNormal; attribute vec3 aColor; attribute float aMaterial; attribute vec2 aUV;
uniform float uLandCamera; uniform mat4 uModel; uniform mat3 uNormal; uniform vec4 uCamera; uniform vec4 uView; uniform vec3 uOrigin; uniform vec3 uShadowOrigin; uniform float uShadowPass; uniform float uLightRange; uniform float uTime;
varying vec3 vWorld; varying vec3 vNormal; varying vec3 vColor; varying float vMaterial; varying vec3 vShadow; varying vec2 vUV;
void main(){
 vec3 world=(uModel*vec4(aPosition,1.0)).xyz;if(aMaterial>8.5&&aMaterial<9.5){world.x+=sin(uTime*1.4+world.z*1.7)*min(.5,max(0.0,world.y))*.075;}vec3 p=world-uShadowOrigin;
 vec3 light=normalize(vec3(-0.55,1.0,0.38)); vec3 right=normalize(vec3(light.z,0.0,-light.x)); vec3 up=cross(light,right);
 vec3 lp=vec3(dot(p,right),dot(p,up),-dot(p,light));
 vShadow=vec3(lp.xy/uLightRange*0.5+0.5,lp.z/160.0+0.5);
 if(uShadowPass>0.5){gl_Position=vec4(lp.xy/uLightRange,lp.z/80.0,1.0);}
 else {float dx=world.x-uCamera.x,dz=world.z-uCamera.y;float cy=cos(uCamera.z),sy=sin(uCamera.z),st=sin(uCamera.w),ct=cos(uCamera.w);float u=dx*cy-dz*sy,d=dx*sy+dz*cy,depth=d*ct+(world.y-uLandCamera)*st,distance=uView.w/uView.z,scale=uView.w/max(.35,distance-depth);float sx=u*scale+uView.x*.5;float yy=(d*st-(world.y-uLandCamera)*ct)*scale+uView.y*.82;gl_Position=vec4(sx/uView.x*2.0-1.0,1.0-yy/uView.y*2.0,-depth/180.0,1.0);}
 vWorld=world;vNormal=uNormal*aNormal;vColor=aColor;vMaterial=aMaterial;vUV=aUV;
}`;
const realmFragmentShader = `
precision highp float;
varying vec3 vWorld; varying vec3 vNormal; varying vec3 vColor; varying float vMaterial; varying vec3 vShadow; varying vec2 vUV;
uniform sampler2D uShadow;uniform sampler2D uAtlas;uniform sampler2D uPaving;uniform float uShadowPass;uniform float uTime;uniform float uNight;uniform float uInterior;uniform vec3 uOrigin;uniform vec3 uEye;uniform vec3 uMood;uniform vec3 uFogColor;uniform vec4 uLightPos[16];uniform vec4 uLightColor[16];uniform float uLightCount;uniform vec4 uRoom[12];uniform float uRoomCeiling[12];uniform float uRoomCount;uniform float uHouse;uniform float uBossColor;uniform float uDissolve;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float rawNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
float detailVisibility(vec2 p){
#ifdef REALM_DERIVATIVES
 return 1.0-smoothstep(.35,1.5,max(length(dFdx(p)),length(dFdy(p))));
#else
 return 1.0;
#endif
}
// Integrate detail smaller than a pixel instead of letting it sparkle in motion.
float noise(vec2 p){float visible=detailVisibility(p);if(visible<=0.0)return .5;return mix(.5,rawNoise(p),visible);}
vec4 atlasSample(vec2 cell,vec2 uv){
 vec2 coord=(cell+(vec2(2.0)+fract(uv)*508.0)/512.0)/8.0;
#ifdef REALM_TEXTURE_GRAD
 // Derivatives must come from unwrapped UVs, never fract(uv). Keep the
 // footprint inside a single atlas tile, including both trilinear levels.
 vec2 dx=dFdx(uv)*508.0/4096.0,dy=dFdy(uv)*508.0/4096.0;
 float rho=max(length(dx),length(dy))*4096.0;
 float limit=min(1.0,512.0/max(rho,1.0));dx*=limit;dy*=limit;
 float lod=clamp(log2(max(rho*limit,1.0)),0.0,9.0);
 float inset=min(256.0,max(2.0,exp2(ceil(lod))))/4096.0;
 coord=clamp(coord,cell/8.0+inset,(cell+1.0)/8.0-inset);
 vec4 sampleColor=texture2DGradEXT(uAtlas,coord,dx,dy);sampleColor.rgb/=max(sampleColor.a,.0001);return sampleColor;
#else
 return texture2D(uAtlas,coord);
#endif
}
vec4 packDepth(float d){vec4 e=fract(d*vec4(1.0,255.0,65025.0,16581375.0));e-=e.yzww*vec4(1.0/255.0,1.0/255.0,1.0/255.0,0.0);return e;}
float unpackDepth(vec4 d){return dot(d,vec4(1.0,1.0/255.0,1.0/65025.0,1.0/16581375.0));}
void main(){
 vec4 albedo=vec4(1.0);if(vMaterial>19.5){float tile=floor(vMaterial-20.0+.01);vec2 cell=vec2(mod(tile,8.0),floor(tile/8.0));albedo=atlasSample(cell,vUV);if(albedo.a<.45)discard;}
 if(uDissolve>0.0&&hash(floor(vWorld.xz*21.0)+floor(vWorld.y*19.0))<uDissolve)discard;
 if(uShadowPass>.5){if(vMaterial>19.05&&vMaterial<19.15)discard;gl_FragColor=packDepth(gl_FragCoord.z);return;}
 vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 light=normalize(vec3(-.55,1.0,.38)),col=vColor;float gloss=.0;vec2 p=vWorld.xz;float grain=noise(p*18.0);
 if(vMaterial>19.5){col*=albedo.rgb;}
 else if(vMaterial>17.5&&vMaterial<18.5){vec2 faceP=abs(n.y)>.6?p:abs(n.x)>.5?vWorld.zy:vWorld.xy;vec2 grid=faceP*vec2(2.5,4.8);grid.x+=mod(floor(grid.y),2.0)*.5;vec2 uv=fract(grid);float mortar=smoothstep(.015,.07,min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y)));col*=.77+.20*mix(.8,mortar,detailVisibility(grid))+.065*noise(faceP*12.0);}
 else if(vMaterial>16.5&&vMaterial<17.5){float rim=min(min(vUV.x,1.0-vUV.x),1.0-vUV.y);col*=.72+.28*smoothstep(.0,.075,rim);col*=.96+.055*noise(vWorld.xz*32.0);}
 else if(vMaterial>14.5&&vMaterial<16.5){float patches=noise(p*.42)*.6+noise(p*2.7)*.4;vec3 grass=mix(vec3(.17,.27,.12),vec3(.34,.43,.20),patches)*(.96+.07*noise(p*12.0));vec3 dirt=mix(vec3(.42,.34,.22),vec3(.55,.46,.31),noise(p*4.5));dirt*=.94+.08*noise(p*14.0);if(vMaterial>15.5)dirt=texture2D(uPaving,p*.5).rgb*.83;float edge=min(vUV.x,1.0-vUV.x);float wear=smoothstep(.01,.20,edge+(noise(p*8.0)-.5)*.10);col=mix(grass,dirt,wear);}

 else if(vMaterial>.5&&vMaterial<1.5){
  float patches=noise(p*.15)*.55+noise(p*1.8)*.30+noise(p*.043)*.15;
  col=mix(vec3(.17,.27,.13),vec3(.32,.40,.21),patches);
  float forest=smoothstep(449.0,490.0,p.y)*smoothstep(135.0,175.0,p.x),mountain=smoothstep(548.0,610.0,p.x)*(1.0-smoothstep(417.0,465.0,p.y));
  vec3 woodland=mix(vec3(.19,.29,.20),vec3(.35,.42,.25),patches);
  vec3 moor=mix(vec3(.32,.35,.28),vec3(.43,.43,.34),patches);
  col=mix(mix(col,woodland,forest),moor,mountain);col*=.98+.035*noise(p*12.0);
  float bank=vUV.y>.5?1.0-smoothstep(.4,3.8,vUV.x):0.0;
  vec3 earth=mix(vec3(.31,.28,.22),vec3(.46,.41,.32),noise(p*3.5));
  float scree=mountain*smoothstep(.58,.82,noise(p*.23))*.42;
  col=mix(col,earth,max(max(bank*.82,(1.0-smoothstep(.78,.97,n.y))*.7),scree));
  if(vUV.y>.5){vec3 dirt=mix(vec3(.40,.335,.25),vec3(.47,.405,.31),noise(p*3.5));dirt*=.96+.055*noise(p*25.0);dirt+=vec3(.055,.052,.044)*smoothstep(.87,.97,noise(p*18.0));vec3 paving=texture2D(uPaving,p*.5).rgb*.83;dirt=mix(dirt,paving,vColor.g);vec3 cutRock=mix(vec3(.43,.44,.40),vec3(.64,.63,.56),noise(p*1.6));cutRock*=.94+.06*sin(vWorld.y*16.0)+.05*noise(p*22.0);dirt=mix(dirt,cutRock,vColor.b);col=mix(col,dirt,smoothstep(.05,.9,vColor.r));}
 }
 else if(vMaterial<2.5&&vMaterial>1.5){float earth=noise(p*.65)*.62+noise(p*4.5)*.38;col=mix(vec3(.28,.285,.255),vec3(.39,.375,.31),earth);col*=.96+.075*noise(p*18.0);}
 else if(vMaterial<3.5&&vMaterial>2.5){col=texture2D(uPaving,p*.5).rgb*.83;}
 else if(vMaterial<4.5&&vMaterial>3.5){float flow=noise(p*.18+vec2(uTime*.015,-uTime*.012));float a=dot(p,vec2(.65,.23))+uTime*.6,b=dot(p,vec2(-.19,.78))-uTime*.37;float ripple=sin(a+flow*3.0)*.018+sin(b)*.012;n=normalize(vec3(cos(a)*.035,1.0,cos(b)*.025));col=mix(vec3(.055,.20,.22),vec3(.12,.30,.29),flow)+ripple;float shallow=1.0-smoothstep(-.3,2.0,-vUV.x);col=mix(col,vec3(.23,.34,.29),shallow*.45);float foam=(1.0-smoothstep(.04,.28,abs(vUV.x)))*(.4+.6*noise(p*2.0+uTime*.1));col+=vec3(.16,.19,.15)*foam;float glint=pow(max(0.0,sin(a*2.0+sin(b))),24.0);col+=vec3(.14,.20,.18)*glint*.10;gloss=.12;}
 else if(vMaterial<5.5&&vMaterial>4.5){
  // Filament reserves surface 5 for explicit dirt roads. Procedural wood also
  // predates that assignment, so world-space terrain UVs distinguish the two.
  if(max(abs(vUV.x),abs(vUV.y))>1.5){float earth=noise(p*.65)*.62+noise(p*4.5)*.38;col=mix(vec3(.34,.29,.21),vec3(.49,.42,.30),earth);col*=.96+.075*noise(p*18.0);}
  else{vec2 wood=vWorld.xz;float plank=floor(wood.x*3.0);float seam=smoothstep(.015,.06,min(fract(wood.x*3.0),1.0-fract(wood.x*3.0)));float grain=noise(vec2(wood.x*65.0,wood.y*1.6));float join=smoothstep(.0,.02,fract(wood.y*.36+mod(plank,3.0)*.33));col*=.76+.13*grain+.11*hash(vec2(plank,floor(wood.y*.36)));col*=.76+.24*seam*join;}
 }
 else if(vMaterial<6.5&&vMaterial>5.5){vec2 tile=vec2(vWorld.z*5.0,(vWorld.x+vWorld.y)*6.0);tile.x+=mod(floor(tile.y),2.0)*.5;vec2 f=fract(tile);float lip=smoothstep(.02,.15,min(f.x,min(f.y,1.0-f.y)));col*=mix(.68+.32*.8+.06,.68+.32*lip+hash(floor(tile))*.12,detailVisibility(tile));}
 else {col*=.95+.075*noise((vWorld.xz+vWorld.yy)*24.0);}
 if(uBossColor>1.5)col=vec3(max(col.b,col.g*.95),col.r*.45,col.r*.35);
 float lit=1.0;if(vShadow.x>0.0&&vShadow.x<1.0&&vShadow.y>0.0&&vShadow.y<1.0){float shade=0.0;float bias=.0008+.0006*(1.0-max(0.0,dot(n,light)));for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float d=unpackDepth(texture2D(uShadow,vShadow.xy+vec2(float(x),float(y))/1024.0));shade+=step(vShadow.z-bias,d);}lit=.48+.52*shade/9.0;}
 float room=uHouse;for(int i=0;i<12;i++){if(float(i)>=uRoomCount)break;vec4 b=uRoom[i];if(p.x>b.x&&p.y>b.y&&p.x<b.z&&p.y<b.w&&vWorld.y<uRoomCeiling[i])room=1.0;}
 float diffuse=max(0.0,dot(n,light));vec3 ambient=mix(vec3(.35,.40,.46),vec3(.20,.24,.30),uNight);vec3 sun=mix(vec3(.78,.72,.58),vec3(.16,.20,.28),uNight);
 ambient=mix(ambient,vec3(.16,.175,.20),uInterior);sun=mix(sun,vec3(.065),uInterior);
 ambient=mix(ambient,vec3(.83,.79,.69),room);sun=mix(sun,vec3(.22,.22,.20),room);
 vec3 illumination=(ambient+sun*diffuse*mix(lit,1.0,room))*uMood;
 for(int i=0;i<16;i++){if(float(i)>=uLightCount)break;vec3 delta=uLightPos[i].xyz-vWorld;float distance=length(delta),falloff=max(0.0,1.0-distance/uLightPos[i].w);float facing=.65+.35*max(0.0,dot(n,normalize(delta)));illumination+=uLightColor[i].rgb*uLightColor[i].a*falloff*falloff*facing;}
 col*=min(illumination,vec3(1.3));col+=vec3(.48,.65,.70)*pow(max(0.0,dot(reflect(-light,n),uEye)),40.0)*gloss*lit*(1.0-uInterior);
 if(vMaterial>18.5&&vMaterial<19.5)col=mix(col,vColor*1.16,vMaterial>19.15?.75*uNight:.75);
 float fog=smoothstep(16.0,78.0,length(vWorld.xz-uOrigin.xz));col=mix(col,uFogColor,fog*.48);col=pow(max(col,vec3(0.0)),vec3(.92));
 gl_FragColor=vec4(col,1.0);
}`;
const REALM_SKIN_BONES=80;
// Uniform palettes work on WebGL 1 hardware with at least 256 vertex vectors.
// Devices below that limit retain the exact CPU deformation path.
const realmSkinnedVertexShader=realmVertexShader.replace('void main(){',`
attribute vec4 aJoints;attribute vec4 aWeights;
uniform vec4 uBones[240];uniform float uSkinning;
vec3 skinPoint(float bone,vec4 point){int b=int(bone)*3;return vec3(dot(uBones[b],point),dot(uBones[b+1],point),dot(uBones[b+2],point));}
void main(){
 vec3 skinPosition=aPosition,skinNormal=aNormal;
 if(uSkinning>.5){
  skinPosition=skinPoint(aJoints.x,vec4(aPosition,1.0))*aWeights.x+skinPoint(aJoints.y,vec4(aPosition,1.0))*aWeights.y+skinPoint(aJoints.z,vec4(aPosition,1.0))*aWeights.z+skinPoint(aJoints.w,vec4(aPosition,1.0))*aWeights.w;
  skinNormal=skinPoint(aJoints.x,vec4(aNormal,0.0))*aWeights.x+skinPoint(aJoints.y,vec4(aNormal,0.0))*aWeights.y+skinPoint(aJoints.z,vec4(aNormal,0.0))*aWeights.z+skinPoint(aJoints.w,vec4(aNormal,0.0))*aWeights.w;
 }
`).replace('uModel*vec4(aPosition,1.0)','uModel*vec4(skinPosition,1.0)').replace('uNormal*aNormal','uNormal*normalize(skinNormal)');
// Float textures avoid the dynamically indexed uniform array that broke some
// Android drivers. One 240-texel row stores an entire 80-bone palette.
const realmSkinTexturePoint=`
uniform highp sampler2D uBoneTexture;uniform float uBoneRow;
vec3 skinPoint(float bone,vec4 point){float x=bone*3.0;
 return vec3(dot(texture2D(uBoneTexture,vec2((x+.5)/240.0,uBoneRow)),point),dot(texture2D(uBoneTexture,vec2((x+1.5)/240.0,uBoneRow)),point),dot(texture2D(uBoneTexture,vec2((x+2.5)/240.0,uBoneRow)),point));
}`;
const realmTextureSkinnedVertexShader=realmSkinnedVertexShader
 .replace('uniform vec4 uBones[240];','')
 .replace('vec3 skinPoint(float bone,vec4 point){int b=int(bone)*3;return vec3(dot(uBones[b],point),dot(uBones[b+1],point),dot(uBones[b+2],point));}',realmSkinTexturePoint);
function realmSkinProbeData(){
 const bones=new Float32Array(REALM_SKIN_BONES*12),vertices=new Float32Array(REALM_SKIN_BONES*4),expected=new Uint8Array(REALM_SKIN_BONES*4);
 for(let i=0;i<REALM_SKIN_BONES;i++){bones.set([.8+i*.003,.013,-.007,i*.001,-.009,1.1+i*.002,.011,-i*.0015,.006,-.017,.9+i*.001,i*.002],i*12);vertices.set([i,.13,.27,.41],i*4);}
 for(let i=0;i<REALM_SKIN_BONES;i++){const p=[.13,.27,.41,1];for(let axis=0;axis<3;axis++){let value=0;for(let j=0;j<4;j++){const b=((i+[0,17,33,47][j])%REALM_SKIN_BONES)*12+axis*4;for(let k=0;k<4;k++)value+=(j+1)/10*bones[b+k]*p[k];}expected[i*4+axis]=Math.round((value*.4+.2)*255);}expected[i*4+3]=255;}
 return {bones,vertices,expected};
}
const realmSkinProbeVertex=`precision highp float;attribute vec4 aProbe;varying vec3 vProbe;${realmSkinTexturePoint}
void main(){float i=aProbe.x;vec4 p=vec4(aProbe.yzw,1.0);vProbe=(skinPoint(i,p)*.1+skinPoint(mod(i+17.0,80.0),p)*.2+skinPoint(mod(i+33.0,80.0),p)*.3+skinPoint(mod(i+47.0,80.0),p)*.4)*.4+.2;gl_Position=vec4((i+.5)/80.0*2.0-1.0,0.0,0.0,1.0);gl_PointSize=1.0;}`;
const realmSkinProbeFragment='precision highp float;varying vec3 vProbe;void main(){gl_FragColor=vec4(vProbe,1.0);}';
function realmProbePixelsValid(pixels,expected){return pixels.length===expected.length&&pixels.every((v,i)=>Math.abs(v-expected[i])<=2);}
function realmTestTextureSkinning(gl){
 if(!(Number(gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS))>=1)||!gl.getExtension('OES_texture_float'))return false;
 const shaders=[],textures=[];let program,framebuffer,buffer,attribute=-1;
 try{
  program=gl.createProgram();for(const [kind,text]of [[gl.VERTEX_SHADER,realmSkinProbeVertex],[gl.FRAGMENT_SHADER,realmSkinProbeFragment]]){const shader=gl.createShader(kind);shaders.push(shader);gl.shaderSource(shader,text);gl.compileShader(shader);gl.attachShader(program,shader);}gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return false;gl.useProgram(program);
  const {bones,vertices,expected}=realmSkinProbeData(),makeTexture=(w,h,type,data)=>{const texture=gl.createTexture();textures.push(texture);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,type,data);for(const [key,value]of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,key,value);return texture;};
  gl.activeTexture(gl.TEXTURE2);makeTexture(240,1,gl.FLOAT,bones);gl.uniform1i(gl.getUniformLocation(program,'uBoneTexture'),2);gl.uniform1f(gl.getUniformLocation(program,'uBoneRow'),.5);
  gl.activeTexture(gl.TEXTURE0);const target=makeTexture(80,1,gl.UNSIGNED_BYTE,null);framebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,target,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)return false;
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);attribute=gl.getAttribLocation(program,'aProbe');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,4,gl.FLOAT,false,16,0);gl.viewport(0,0,80,1);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.POINTS,0,80);
  const pixels=new Uint8Array(80*4);gl.readPixels(0,0,80,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return realmProbePixelsValid(pixels,expected);
 }catch{return false;}finally{
  if(attribute>=0)gl.disableVertexAttribArray(attribute);gl.bindFramebuffer(gl.FRAMEBUFFER,null);if(buffer)gl.deleteBuffer(buffer);if(framebuffer)gl.deleteFramebuffer(framebuffer);for(const texture of textures)gl.deleteTexture(texture);for(const shader of shaders)gl.deleteShader(shader);if(program)gl.deleteProgram(program);gl.activeTexture(gl.TEXTURE0);
 }
}
// Three affine rows keep static instancing within WebGL 1's eight-attribute
// minimum. This is a separate shader, independent of Android bone palettes.
const realmInstancedVertexShader=realmVertexShader
 .replace('void main(){','attribute vec4 aInstance0;attribute vec4 aInstance1;attribute vec4 aInstance2;\nvoid main(){')
 .replace('(uModel*vec4(aPosition,1.0)).xyz','vec3(dot(aInstance0,vec4(aPosition,1.0)),dot(aInstance1,vec4(aPosition,1.0)),dot(aInstance2,vec4(aPosition,1.0)))')
 .replace('vNormal=uNormal*aNormal;',`vec3 ca=vec3(aInstance0.x,aInstance1.x,aInstance2.x),cb=vec3(aInstance0.y,aInstance1.y,aInstance2.y),cc=vec3(aInstance0.z,aInstance1.z,aInstance2.z);float determinant=dot(ca,cross(cb,cc));vNormal=(cross(cb,cc)*aNormal.x+cross(cc,ca)*aNormal.y+cross(ca,cb)*aNormal.z)/determinant;`);
let realmGPU=null,realmGPUUnavailable=false;
// Native backing pixels stay stable throughout movement and zoom. No frame-rate
// feedback changes resolution, resizes the canvas, or hides stalls with blur.
const realmResolution={scale:1,samples:0,total:0};
function observeRenderTime(milliseconds){if(Number.isFinite(milliseconds)&&milliseconds>0&&!document.hidden){realmResolution.samples++;realmResolution.total+=milliseconds;if(typeof recordPerformanceFrame==='function')recordPerformanceFrame(milliseconds);}}
function realmPixelScale(){const agent=typeof navigator==='undefined'?'':navigator.userAgent||'',mobile=window.matchMedia?.('(pointer: coarse)')?.matches===true||/iPhone|iPad|iPod|Android/i.test(agent),ceiling=mobile?1.5:2;return Math.min(Math.max(1,window.devicePixelRatio||1),ceiling,Math.sqrt(8294400/Math.max(1,screen.w*screen.h)));}
function realmShadowCamera(x,z,range){
 const light=[-.55,1,.38],length=Math.hypot(...light);for(let i=0;i<3;i++)light[i]/=length;
 const right=[light[2],0,-light[0]],rlen=Math.hypot(...right);for(let i=0;i<3;i++)right[i]/=rlen;
 const up=[light[1]*right[2],light[2]*right[0]-light[0]*right[2],-light[1]*right[0]];
 const step=2*range/1024,rx=x*right[0]+z*right[2],uy=x*up[0]+z*up[2],depth=x*light[0]+z*light[2];
 const a=Math.round(rx/step)*step,b=Math.round(uy/step)*step;
 return right.map((r,i)=>r*a+up[i]*b+light[i]*depth);
}
const realmIdentityNormal=new Float32Array([1,0,0,0,1,0,0,0,1]);
function realmNormalMatrix(m){return m?new Float32Array([...briarNormal([1,0,0],0,m),...briarNormal([0,1,0],0,m),...briarNormal([0,0,1],0,m)]):realmIdentityNormal;}
const realmTopologies=new WeakMap();
function realmMeshTopology(mesh){
 let variants=realmTopologies.get(mesh.i);if(!variants){variants=new Map();realmTopologies.set(mesh.i,variants);}
 const key=mesh.t||(mesh.uv?'atlas':'plain');if(variants.has(key))return variants.get(key);
 const refs=[],mapped=new Map(),indices=new Uint16Array(mesh.i.length);
 // A vertex only needs a second copy where a triangle crosses atlas slots.
 // Keep that triangle's fallback colour and material exactly as before.
 for(let j=0;j<mesh.i.length;j+=3){const a=mesh.i[j],b=mesh.i[j+1],c=mesh.i[j+2],fallback=mesh.uv?20:12,ta=mesh.t?.[a]||fallback,tb=mesh.t?.[b]||fallback,tc=mesh.t?.[c]||fallback,mixed=ta!==tb||tb!==tc;
  for(let k=0;k<3;k++){const ref=mesh.i[j+k]*2+Number(mixed);let v=mapped.get(ref);if(v===undefined){v=refs.length;if(v>=65536){variants.set(key,null);return null;}mapped.set(ref,v);refs.push(ref);}indices[j+k]=v;}
 }
 const topology={refs:new Uint32Array(refs),indices};variants.set(key,topology);return topology;
}
function realmVertexData(mesh,topology,skinned=false,reuse=null){
 const stride=skinned?20:12,size=topology.refs.length*stride,data=reuse?.length===size?reuse:new Float32Array(size);
 for(let v=0;v<topology.refs.length;v++){const ref=topology.refs[v],id=ref>>>1,p=id*3,j=id*4,o=v*stride,mixed=ref&1,colors=mixed&&mesh.f?mesh.f:mesh.c;
  for(let k=0;k<3;k++){data[o+k]=mesh.p[p+k];data[o+3+k]=mesh.n[p+k];data[o+6+k]=colors[p+k];}
  data[o+9]=mixed?20:mesh.t?.[id]||(mesh.uv?20:12);data[o+10]=mesh.uv?.[id*2]||0;data[o+11]=mesh.uv?.[id*2+1]||0;
  if(skinned)for(let k=0;k<4;k++){data[o+12+k]=mesh.j[j+k];data[o+16+k]=mesh.w[j+k];}
 }
 return data;
}
function realmUploadIndexed(gpu,mesh,skinned=false){
 const topology=realmMeshTopology(mesh);if(!topology)return null;
 gpu.indexMeshes??=new WeakMap();let index=gpu.indexMeshes.get(topology);
 if(!index){const buffer=gpu.gl.createBuffer();gpu.gl.bindBuffer(gpu.gl.ELEMENT_ARRAY_BUFFER,buffer);gpu.gl.bufferData(gpu.gl.ELEMENT_ARRAY_BUFFER,topology.indices,gpu.gl.STATIC_DRAW);index={buffer,refs:0,bytes:topology.indices.byteLength,topology};gpu.indexMeshes.set(topology,index);gpu.meshBytes=(gpu.meshBytes||0)+index.bytes;}
 index.refs++;const data=realmVertexData(mesh,topology,skinned);
 return {...gpu.upload(data),count:topology.indices.length,stride:skinned?80:48,bytes:data.byteLength,index,uniqueVertices:topology.refs.length};
}
// Mesh vertices remain on the GPU; moving actors change their model matrix.
// A byte budget bounds animated pose storage without evicting anything used this frame.
function realmMeshEntry(gpu,mesh){
 let entry=gpu.sharedMeshes.get(mesh);gpu.meshUse??=new Map();
 if(!entry){entry=!mesh.packed&&realmUploadIndexed(gpu,mesh);if(!entry){let data=mesh.packed;if(!data){data=[];if(typeof packingLocalMesh!=='undefined')packingLocalMesh=true;
  try{realmIndexedData(data,mesh,[1,0,0,0,0,1,0,0,0,0,1,0]);}finally{if(typeof packingLocalMesh!=='undefined')packingLocalMesh=false;}data=new Float32Array(data);}
  entry=gpu.upload(data);entry.bytes=data.byteLength;}gpu.meshBytes=(gpu.meshBytes||0)+entry.bytes;gpu.sharedMeshes.set(mesh,entry);
  if(gpu.kind==='filament')entry.buffer.retire=()=>{if(gpu.sharedMeshes.get(mesh)!==entry)return;gpu.sharedMeshes.delete(mesh);gpu.meshUse.delete(mesh);gpu.meshBytes-=entry.bytes;if(entry.index&&--entry.index.refs===0){gpu.gl.deleteBuffer(entry.index.buffer);gpu.indexMeshes.delete(entry.index.topology);gpu.meshBytes-=entry.index.bytes;}};
 }
 gpu.meshUse.delete(mesh);gpu.meshUse.set(mesh,entry);entry.used=gpu.frameId||0;return entry;
}
const realmShapeCache=new Map();
function cachedRealmShape(r,key,matrix,build){
 let mesh=realmShapeCache.get(key);
 if(!mesh){const data=[],height=build({face:(p,c,n,mat,colors,uvs)=>(typeof flatFaceData==='function'?flatFaceData:realmFaceData)(data,p,c,n,mat,colors,uvs)});mesh={packed:new Float32Array(data),height};}
 realmShapeCache.delete(key);realmShapeCache.set(key,mesh);if(realmShapeCache.size>256)realmShapeCache.delete(realmShapeCache.keys().next().value);
 r.indexed(mesh,matrix);return mesh.height;
}
function trimRealmMeshes(gpu){
 const agent=typeof navigator==='undefined'?'':navigator.userAgent||'',mobile=window.matchMedia?.('(pointer: coarse)')?.matches===true||/iPhone|iPad|iPod|Android/i.test(agent),budget=(mobile?24:48)*1024*1024;
 if((gpu.meshBytes||0)<=budget)return;
 const entries=[...[...(gpu.meshUse||[])].map(([mesh,entry])=>({mesh,entry,uses:gpu.meshUse,cache:gpu.sharedMeshes})),...[...(gpu.skinUse||[])].map(([mesh,entry])=>({mesh,entry,uses:gpu.skinUse,cache:gpu.skinnedMeshes}))].sort((a,b)=>a.entry.used-b.entry.used);
 for(const {mesh,entry,uses,cache}of entries){if(gpu.meshBytes<=budget)break;if(entry.used===gpu.frameId)continue;gpu.gl.deleteBuffer(entry.buffer);uses.delete(mesh);cache.delete(mesh);gpu.meshBytes-=entry.bytes;if(entry.index&&--entry.index.refs===0){gpu.gl.deleteBuffer(entry.index.buffer);gpu.indexMeshes.delete(entry.index.topology);gpu.meshBytes-=entry.index.bytes;}}
}
function realmSkinnedEntry(gpu,mesh){
 let entry=gpu.skinnedMeshes.get(mesh);gpu.skinUse??=new Map();
 const touch=()=>{entry.used=gpu.frameId||0;gpu.skinUse.delete(mesh);gpu.skinUse.set(mesh,entry);
  if(gpu.kind==='filament'&&!entry.buffer.retire)entry.buffer.retire=()=>{if(gpu.skinnedMeshes.get(mesh)!==entry)return;gpu.skinnedMeshes.delete(mesh);gpu.skinUse.delete(mesh);gpu.meshBytes-=entry.bytes;if(entry.index&&--entry.index.refs===0){gpu.gl.deleteBuffer(entry.index.buffer);gpu.indexMeshes.delete(entry.index.topology);gpu.meshBytes-=entry.index.bytes;}};
  return entry;};
 if(entry)return touch();
 entry=realmUploadIndexed(gpu,mesh,true);if(entry){gpu.meshBytes=(gpu.meshBytes||0)+entry.bytes;gpu.skinnedMeshes.set(mesh,entry);return touch();}
 const data=new Float32Array(mesh.i.length*20);let offset=0;
 for(let triangle=0;triangle<mesh.i.length;triangle+=3){
  const ids=[mesh.i[triangle],mesh.i[triangle+1],mesh.i[triangle+2]],materials=ids.map(v=>mesh.t?.[v]||20),mixed=materials.some(m=>m!==materials[0]),colors=mixed&&mesh.f?mesh.f:mesh.c;
  for(const v of ids){const p=v*3,j=v*4;
   data.set([mesh.p[p],mesh.p[p+1],mesh.p[p+2],mesh.n[p],mesh.n[p+1],mesh.n[p+2],colors[p],colors[p+1],colors[p+2],mixed?20:materials[0],mesh.uv?.[v*2]||0,mesh.uv?.[v*2+1]||0,mesh.j[j],mesh.j[j+1],mesh.j[j+2],mesh.j[j+3],mesh.w[j],mesh.w[j+1],mesh.w[j+2],mesh.w[j+3]],offset);offset+=20;
  }
 }
 entry={...gpu.upload(data),count:mesh.i.length,stride:80,bytes:data.byteLength};gpu.meshBytes=(gpu.meshBytes||0)+entry.bytes;gpu.skinnedMeshes.set(mesh,entry);return touch();
}
function realmAllowsGpuSkinning(uniformVectors,userAgent=typeof navigator==='undefined'?'':navigator.userAgent){
 // Android must not use the large, dynamically indexed uniform palette.
 // It may use the separately validated texture path; otherwise keep CPU poses.
 return !/Android/i.test(userAgent)&&Number(uniformVectors)>=256;
}
const realmIdentityModel=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function realmGroundedMatrix(model){const m=Array.from(model);if(typeof landHeight==='function')m[7]+=landHeight(m[3],m[11]);return m;}
function realmPrepareDraws(entries,instancing){
 const singles=[],groups=new Map(),batches=[];
 for(const entry of entries){if(!instancing||!entry.model||entry.palette||entry.bossColor||entry.dissolve||entry.terrain){singles.push(entry);continue;}let group=groups.get(entry.buffer);if(!group){group=[];groups.set(entry.buffer,group);}group.push(entry);}
 let count=0;
 for(const group of groups.values()){if(group.length<3){singles.push(...group);continue;}batches.push({...group[0],instances:group.length,instanceOffset:count*48,group});count+=group.length;}
 const transforms=new Float32Array(count*12);let offset=0;
 for(const batch of batches){for(const entry of batch.group){transforms.set(realmGroundedMatrix(entry.model),offset);offset+=12;}delete batch.group;}
 for(const entry of singles){entry.normal=realmNormalMatrix(entry.model);const m=entry.model&&realmGroundedMatrix(entry.model);entry.matrix=m?new Float32Array([m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,m[3],m[7],m[11],1]):realmIdentityModel;}
 return {singles,batches,transforms};
}
function createRealmGPU(){
 const surface=document.createElement('canvas');const gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'high-performance'});
 if(!gl||typeof gl.getParameter(gl.VERSION)!=='string')return null;
 const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
 const derivatives=!!gl.getExtension('OES_standard_derivatives'),textureGrad=derivatives&&!!gl.getExtension('EXT_shader_texture_lod');
 const fragmentSource=(derivatives?'#extension GL_OES_standard_derivatives : enable\n#define REALM_DERIVATIVES\n':'')+(textureGrad?'#extension GL_EXT_shader_texture_lod : enable\n#define REALM_TEXTURE_GRAD\n':'')+realmFragmentShader;
 const link=vertex=>{const p=gl.createProgram(),v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragmentSource);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const error=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw new Error(error);}return p;};
 let skinning=realmAllowsGpuSkinning(gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)),textureSkinning=!skinning&&realmTestTextureSkinning(gl),program;skinning=skinning||textureSkinning;
 try{program=link(textureSkinning?realmTextureSkinnedVertexShader:skinning?realmSkinnedVertexShader:realmVertexShader);}catch(error){if(!skinning)throw error;skinning=false;textureSkinning=false;program=link(realmVertexShader);}
 gl.useProgram(program);
 const uniformNames=['uCamera','uView','uShadowOrigin','uOrigin','uShadowPass','uLightRange','uShadow','uTime','uNight','uInterior','uEye','uAtlas','uPaving','uModel','uNormal','uLandCamera','uSkinning','uBones[0]','uBoneTexture','uBoneRow','uMood','uFogColor','uLightPos[0]','uLightColor[0]','uLightCount','uRoom[0]','uRoomCeiling[0]','uRoomCount','uHouse','uBossColor','uDissolve'];
 const shaderState=(program,skinning,instanced=false)=>({program,skinning,instanced,attrs:['aPosition','aNormal','aColor','aMaterial','aUV','aJoints','aWeights'].map(n=>gl.getAttribLocation(program,n)),instanceAttrs:instanced?['aInstance0','aInstance1','aInstance2'].map(n=>gl.getAttribLocation(program,n)):[],uniforms:Object.fromEntries(uniformNames.map(n=>[n,gl.getUniformLocation(program,n)]))});
 const mainState={...shaderState(program,skinning),textureSkinning},instancing=gl.getExtension('ANGLE_instanced_arrays');let instanceState=null;
 if(instancing&&typeof instancing.drawElementsInstancedANGLE==='function'){try{instanceState=shaderState(link(realmInstancedVertexShader),false,true);}catch(error){console.warn('Using individual scenery draws:',error.message);}}

 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1024,1024,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const framebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);const depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,1024,1024);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Shadow target unavailable');gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 const atlas=gl.createTexture();if(textureGrad)gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,atlas);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));if(typeof REALM_ATLAS_IMAGE!=='undefined'&&REALM_ATLAS_IMAGE?.width>0&&REALM_ATLAS_IMAGE.complete!==false){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,REALM_ATLAS_IMAGE);}if(textureGrad){gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.generateMipmap(gl.TEXTURE_2D);}
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,textureGrad?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic')||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');if(anisotropy&&textureGrad)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.activeTexture(gl.TEXTURE0);
 // Repeating paving has its own sampler: a packed atlas cannot filter across
 // a repeat seam without reading a neighbouring material.
 const paving=gl.createTexture();gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,paving);
 if(typeof REALM_ATLAS_IMAGE!=='undefined'&&REALM_ATLAS_IMAGE?.width>=4096){const tile=document.createElement('canvas');tile.width=tile.height=512;tile.getContext('2d').drawImage(REALM_ATLAS_IMAGE,2562,2,508,508,0,0,512,512);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);}else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,116,94,255]));
 gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
 if(anisotropy)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));gl.activeTexture(gl.TEXTURE0);
 const boneTexture=textureSkinning?gl.createTexture():null;let boneHeight=0,boneData=null;
 const uploadPalettes=entries=>{
  if(!textureSkinning)return;const palettes=new Map();for(const e of entries)if(e.palette&&!palettes.has(e.palette))palettes.set(e.palette,palettes.size);
  if(!palettes.size)return;const rows=2**Math.ceil(Math.log2(palettes.size)),resize=rows>boneHeight;
  if(resize){boneHeight=rows;boneData=new Float32Array(240*4*rows);}
  for(const [palette,row]of palettes)boneData.set(palette,row*240*4);
  for(const e of entries)if(e.palette)e.boneRow=(palettes.get(e.palette)+.5)/boneHeight;
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,boneTexture);
  if(resize){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,240,boneHeight,0,gl.RGBA,gl.FLOAT,boneData);for(const [key,value]of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,key,value);}
  else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,240,palettes.size,gl.RGBA,gl.FLOAT,boneData.subarray(0,palettes.size*240*4));gl.activeTexture(gl.TEXTURE0);
 };
 const sharedMeshes=new WeakMap(),cache=new WeakMap(),terrain=new Map(),dynamicBuffer=gl.createBuffer(),instanceBuffer=gl.createBuffer();
 const upload=data=>{const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return {buffer,count:data.length/12};};
 const bind=(entry,state)=>{
  const {attrs,uniforms,skinning,textureSkinning,instanced}=state;
  gl.uniform1f(uniforms.uBossColor,entry.bossColor||0);gl.uniform1f(uniforms.uDissolve,entry.dissolve||0);
  if(!instanced){gl.uniformMatrix3fv(uniforms.uNormal,false,entry.normal);gl.uniformMatrix4fv(uniforms.uModel,false,entry.matrix);}
  gl.bindBuffer(gl.ARRAY_BUFFER,entry.buffer);
  for(let i=0;i<5;i++){gl.enableVertexAttribArray(attrs[i]);gl.vertexAttribPointer(attrs[i],i===4?2:i===3?1:3,gl.FLOAT,false,entry.stride||48,i===4?40:i*12);}
  if(skinning){gl.uniform1f(uniforms.uSkinning,entry.palette?1:0);if(entry.palette){if(textureSkinning)gl.uniform1f(uniforms.uBoneRow,entry.boneRow);else gl.uniform4fv(uniforms['uBones[0]'],entry.palette);}for(let i=5;i<7;i++){if(entry.palette){gl.enableVertexAttribArray(attrs[i]);gl.vertexAttribPointer(attrs[i],4,gl.FLOAT,false,80,i===5?48:64);}else{gl.disableVertexAttribArray(attrs[i]);gl.vertexAttrib4f(attrs[i],0,0,0,0);}}}
  if(instanced){gl.bindBuffer(gl.ARRAY_BUFFER,instanceBuffer);for(let i=0;i<3;i++){const attr=state.instanceAttrs[i];gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,4,gl.FLOAT,false,48,entry.instanceOffset+i*16);instancing.vertexAttribDivisorANGLE(attr,1);}}
  if(entry.index){gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,entry.index.buffer);if(instanced)instancing.drawElementsInstancedANGLE(gl.TRIANGLES,entry.count,gl.UNSIGNED_SHORT,0,entry.instances);else gl.drawElements(gl.TRIANGLES,entry.count,gl.UNSIGNED_SHORT,0);}
  else if(instanced)instancing.drawArraysInstancedANGLE(gl.TRIANGLES,0,entry.count,entry.instances);else gl.drawArrays(gl.TRIANGLES,0,entry.count);
  if(instanced)for(const attr of state.instanceAttrs){instancing.vertexAttribDivisorANGLE(attr,0);gl.disableVertexAttribArray(attr);}
 };
 const presented=!!canvas.parentElement?.insertBefore;if(presented){surface.className='realm-surface';surface.setAttribute('aria-hidden','true');canvas.parentElement.insertBefore(surface,canvas);}
 surface.addEventListener('webglcontextlost',e=>{e.preventDefault();surface.hidden=true;realmGPU=null;realmGPUUnavailable=true;});surface.addEventListener('webglcontextrestored',()=>{surface.remove?.();realmGPUUnavailable=false;});
 return {surface,presented,gl,cache,sharedMeshes,skinnedMeshes:new WeakMap(),skinning,textureSkinning,instancing:!!instanceState,terrain,upload,frameId:0,render(entries,dynamic,g){
  if(gl.isContextLost())return;
  const dpr=realmPixelScale(),width=Math.max(1,Math.floor(screen.w*dpr)),height=Math.max(1,Math.floor(screen.h*dpr));if(surface.width!==width||surface.height!==height){surface.width=width;surface.height=height;}
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
  const lair=typeof CREATURE_LAIRS!=='undefined'?CREATURE_LAIRS[currentScene]:null,hours=worldHour();
  const lighting=typeof realmLightingState==='function'?realmLightingState():{lights:[],rooms:[],cave:0,house:0,night:0};
  const lightPositions=new Float32Array(64),lightColors=new Float32Array(64),roomBounds=new Float32Array(48);lighting.lights.forEach((o,i)=>{lightPositions.set([o.x,o.y,o.z,o.radius],i*4);lightColors.set([...o.color,o.intensity],i*4);});lighting.rooms.forEach((b,i)=>roomBounds.set(b,i*4));
  const lightRange=Math.max(20,Math.min(85,Math.hypot(screen.w,screen.h)/cameraZoom3()*.65)),shadowOrigin=realmShadowCamera(px+.5,py+.5,lightRange);
  const configure=(state,shadowPass)=>{
   const {uniforms}=state;gl.useProgram(state.program);
   gl.uniform1f(uniforms.uShadowPass,shadowPass);gl.uniform3f(uniforms.uMood,...(lair?.ambient||[1,1,1]));gl.uniform3f(uniforms.uFogColor,...(lair?.fog||[.28,.39,.40]));gl.uniform4fv(uniforms['uLightPos[0]'],lightPositions);gl.uniform4fv(uniforms['uLightColor[0]'],lightColors);gl.uniform1f(uniforms.uLightCount,lighting.lights.length);gl.uniform4fv(uniforms['uRoom[0]'],roomBounds);gl.uniform1fv(uniforms['uRoomCeiling[0]'],new Float32Array(lighting.roomCeilings||[]));gl.uniform1f(uniforms.uRoomCount,lighting.rooms.length);gl.uniform1f(uniforms.uHouse,lighting.house);
   gl.uniform4f(uniforms.uCamera,px+.5,py+.5,view3d.yaw,cameraPitch3());gl.uniform4f(uniforms.uView,screen.w,screen.h,cameraZoom3(),cameraFocalLength3());gl.uniform3f(uniforms.uOrigin,px+.5,0,py+.5);gl.uniform3f(uniforms.uShadowOrigin,...shadowOrigin);gl.uniform1f(uniforms.uLightRange,lightRange);gl.uniform1f(uniforms.uTime,time);gl.uniform1f(uniforms.uInterior,lighting.cave);
   gl.uniform1f(uniforms.uLandCamera,typeof walkSurfaceHeight==='function'?walkSurfaceHeight(px+.5,py+.5):0);gl.uniform1f(uniforms.uNight,lighting.night);gl.uniform3f(uniforms.uEye,Math.sin(view3d.yaw)*Math.cos(cameraPitch3()),Math.sin(cameraPitch3()),Math.cos(view3d.yaw)*Math.cos(cameraPitch3()));gl.uniform1i(uniforms.uShadow,0);gl.uniform1i(uniforms.uAtlas,1);gl.uniform1i(uniforms.uPaving,3);if(state.textureSkinning)gl.uniform1i(uniforms.uBoneTexture,2);
  };
  const drawEntries=[...entries];if(dynamic.length){const data=new Float32Array(dynamic);gl.bindBuffer(gl.ARRAY_BUFFER,dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);drawEntries.push({buffer:dynamicBuffer,count:data.length/12});}
  uploadPalettes(drawEntries);const {singles,batches,transforms}=realmPrepareDraws(drawEntries,!!instanceState);
  if(transforms.length){gl.bindBuffer(gl.ARRAY_BUFFER,instanceBuffer);gl.bufferData(gl.ARRAY_BUFFER,transforms,gl.DYNAMIC_DRAW);}
  const drawPass=shadow=>{configure(mainState,shadow);for(const entry of singles)if(!shadow||!entry.terrain)bind(entry,mainState);if(batches.length){configure(instanceState,shadow);for(const entry of batches)bind(entry,instanceState);}};
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,null);gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.viewport(0,0,1024,1024);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);drawPass(1);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);const day=1-lighting.night,sky=lair?.fog||[.055+.35*day,.075+.58*day,.14+.69*day];gl.clearColor(...sky,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.bindTexture(gl.TEXTURE_2D,texture);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,atlas);gl.activeTexture(gl.TEXTURE0);drawPass(0);if(!presented)g.drawImage(surface,0,0,screen.w,screen.h);
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
function realmTerrainMaterial(road,x,z){
 const painted=window.VeldrenTerrainEdits?.paint(x,z);
 if(painted)return {grass:1,dirt:5,stone:2,paving:3}[painted];
 return road[2]>.18?3:road[1]>.18?2:road[0]>.18?5:1;
}
function realmTerrainUpload(gpu,c,data){
 const previous=c.buffer,entry=gpu.upload(data instanceof Float32Array?data:new Float32Array(data));c.buffer=entry.buffer;c.count=entry.count;
 if(gpu.kind==='filament')c.buffer.retire=()=>{if(gpu.terrain.get(c.scene)?.get(c.key)===c)gpu.terrain.get(c.scene).delete(c.key);};
 if(previous&&previous!==c.buffer)gpu.gl.deleteBuffer(previous);
}
function realmTerrainFallback(c,cell,mw,mh,tileBudget=1){
 const x=c.x-cell/2,z=c.z-cell/2,world=inWorld();if(!world)return [];
 const job=c.fallbackBuild||(c.fallbackBuild={data:[],xx:x,zz:z,endX:Math.min(x+cell,mw+128),endZ:Math.min(z+cell,mh+128)}),data=job.data;
 // A very coarse surface covers a new mobile chunk while its precise mesh
 // streams in bounded slices. Four-tile quads limit synchronous fallback work.
 let processed=0;while(job.zz<job.endZ&&processed++<tileBudget){
  const xx=job.xx,zz=job.zz,dx=Math.min(4,job.endX-xx),dz=Math.min(4,job.endZ-zz),points=[[xx,zz],[xx,zz+dz],[xx+dx,zz+dz],[xx+dx,zz]],cx=xx+dx/2,cz=zz+dz/2;
  job.xx+=4;if(job.xx>=job.endX){job.xx=x;job.zz+=4;}
  if(typeof civilStairWellAt==='function'&&civilStairWellAt(cx,cz))continue;
  const type=terrainType(xx,zz),shore=points.some(([a,b])=>Math.abs(worldWaterDistance(a,b))<2),road=roadInfluence(cx,cz),colors=points.map(()=>[road[0],road[1],Math.max(0,Math.min(1,shoreDistance(cx,cz)/4))]),uvs=points.map(([a,b])=>[a,b]);
  if(type!==3||shore){const vertices=points.map(([a,b])=>[a,landHeight(a,b),b]);flatFaceData(data,vertices,'#808080',vertices.map(()=>[0,1,0]),realmTerrainMaterial(road,cx,cz),colors,uvs);}
  if(type===3||shore){const waterPoints=points.map(([a,b])=>[a,.01-landHeight(a,b),b]);realmFaceData(data,waterPoints,'#427e89',null,4,null,uvs);}
 }
 if(job.zz<job.endZ)return null;c.fallbackBuild=null;return data;
}
function realmTerrainChunkRow(gpu,c,cell,detail,mw,mh,tileBudget=4){
 const world=inWorld(),x=c.x-cell/2,z=c.z-cell/2;
 const job=c.build||(c.build={data:[],samples:new Map(),row:0,column:0,endX:Math.min(x+cell,world?mw+128:mw),endZ:Math.min(z+cell,world?mh+128:mh)});
 if(job.row>=job.endZ-z||job.endX<=x){
  if(job.data.length)realmTerrainUpload(gpu,c,job.data);else if(c.buffer){gpu.gl.deleteBuffer(c.buffer);c.buffer=null;c.count=0;}
  c.noGeometry=!job.data.length;c.complete=true;c.build=null;return true;
 }
 const data=job.data,samples=job.samples,sample=(a,b)=>{const key=a+2048*b;let v=samples.get(key);if(!v){const road=roadInfluence(a,b);v={point:[a,landHeight(a,b),b],normal:landNormal(a,b),color:[road[0],road[1],Math.max(0,Math.min(1,shoreDistance(a,b)/4))],uv:[a,b]};samples.set(key,v);}return v;};
 let processed=0;const limit=Math.max(1,Math.min(32,Math.floor(tileBudget)||1));
 while(job.row<job.endZ-z&&processed<limit){
  const zz=z+job.row,xx=x+job.column;
  const skipped=typeof CREATURE_LAIRS!=='undefined'&&CREATURE_LAIRS[currentScene]&&worldWall(xx,zz)||typeof civilStairWellAt==='function'&&civilStairWellAt(xx+.5,zz+.5);
  if(!skipped){
   const type=terrainType(xx,zz),corners=[[xx,zz],[xx,zz+1],[xx+1,zz+1],[xx+1,zz]],shore=world&&corners.some(([a,b])=>Math.abs(worldWaterDistance(a,b))<2);
   if(type!==3||shore){for(let dz=0;dz<detail;dz++)for(let dx=0;dx<detail;dx++){const a=xx+dx/detail,b=zz+dz/detail,k=1/detail,points=[[a,0,b],[a,0,b+k],[a+k,0,b+k],[a+k,0,b]];if(world&&typeof flatFaceData==='function'){const vertices=points.map(p=>sample(p[0],p[2])),road=roadInfluence(a+k*.5,b+k*.5),painted=window.VeldrenTerrainEdits?.paint(xx,zz);flatFaceData(data,vertices.map(v=>v.point),'#808080',vertices.map(v=>v.normal),realmTerrainMaterial(road,xx,zz),vertices.map(v=>painted?[0,0,1]:v.color),vertices.map(v=>v.uv));}else realmFaceData(data,points,'#808080',null,type+1,points.map(()=>[0,0,1]),points.map(p=>[p[0],p[2]]));}}
   if(type===3||shore){const points=corners.map(([a,b])=>[a,.01-(world?landHeight(a,b):0),b]);realmFaceData(data,points,'#427e89',null,4,null,points.map(p=>[p[0],p[2]]));}
  }
  processed++;if(++job.column>=job.endX-x){job.column=0;job.row++;}
 }
 if(job.row>=job.endZ-z){
  if(data.length)realmTerrainUpload(gpu,c,data);else if(c.buffer){gpu.gl.deleteBuffer(c.buffer);c.buffer=null;c.count=0;}
  c.noGeometry=!data.length;c.complete=true;c.build=null;return true;
 }
 return false;
}
function realmTerrainEntries(gpu){
 let chunks=gpu.terrain.get(currentScene);const [mw,mh]=sceneSize();if(!chunks){chunks=new Map();gpu.terrain.set(currentScene,chunks);}
 const surfaceRevision=typeof landSurfaceRevision==='number'?landSurfaceRevision:0;
 if(gpu.terrainSurfaceRevision!==undefined&&gpu.terrainSurfaceRevision!==surfaceRevision){
  for(const sceneChunks of gpu.terrain.values())for(const c of sceneChunks.values()){c.complete=false;c.noGeometry=false;c.build=null;c.fallbackBuild=null;c.fallbackAttempted=false;}
  gpu.terrainQueueKey=null;
 }gpu.terrainSurfaceRevision=surfaceRevision;
 const agent=typeof navigator==='undefined'?'':navigator.userAgent||'',mobile=window.matchMedia?.('(pointer: coarse)')?.matches===true||/iPhone|iPad|iPod|Android/i.test(agent);
 const wide=inWorld()&&view3d.zoom<24;
 if(gpu.terrainStream===undefined)gpu.terrainStream=window.VeldrenTerrainStreaming?.create(gpu,mobile)||null;
 const streamed=inWorld()&&gpu.terrainStream,cell=streamed?16:wide?16:8,detail=inWorld()&&!wide&&!mobile?2:1;
 if(!inWorld())gpu.terrainStream?.frame([],surfaceRevision);
 const pose=typeof cameraPose3==='function'?cameraPose3():null,eye=pose?.eye||[px,0,py];
 const corners=[...(realmViewCorners||[[0,0],[screen.w,0],[screen.w,screen.h],[0,screen.h]].map(p=>boundedViewPoint3(...p))),{x:eye[0],z:eye[2]}],edge=inWorld()?128:0;
 // Sky-facing rays hit the ground behind a low follow camera. Cover the
 // existing camera far plane instead, keeping native scenery and terrain
 // together without increasing draw distance or changing streaming budgets.
 let footprint=null;
 if(pose&&Number.isFinite(pose.far)&&typeof cameraRay3==='function'){
  for(const [sx,sy] of [[0,0],[screen.w,0],[screen.w,screen.h],[0,screen.h]]){
   const {dir}=cameraRay3(sx,sy),ground=Number.isFinite(pose.ground)?pose.ground:0,t=dir[1]<-1e-6?(ground-eye[1])/dir[1]:Infinity,distance=t>0?Math.min(t,pose.far):pose.far;
   corners.push({x:eye[0]+dir[0]*distance,z:eye[2]+dir[2]*distance});
  }
  // A projected convex footprint keeps far-plane coverage bounded instead of
  // streaming every cell in its much larger, rotated enclosing rectangle.
  const sorted=corners.slice().sort((a,b)=>a.x-b.x||a.z-b.z),cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x),half=points=>{const h=[];for(const p of points){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}h.pop();return h;},hull=[...half(sorted),...half(sorted.slice().reverse())];
  if(hull.length>=3)footprint=hull.map((p,i)=>{const q=hull[(i+1)%hull.length],nx=p.z-q.z,nz=q.x-p.x;return {nx,nz,d:nx*p.x+nz*p.z,pad:cell*Math.hypot(nx,nz)};});
 }
 const minX=Math.max(-edge,Math.floor((Math.min(...corners.map(p=>p.x))-16)/cell)*cell),maxX=Math.min(mw+edge,Math.ceil((Math.max(...corners.map(p=>p.x))+16)/cell)*cell),minZ=Math.max(-edge,Math.floor((Math.min(...corners.map(p=>p.z))-16)/cell)*cell),maxZ=Math.min(mh+edge,Math.ceil((Math.max(...corners.map(p=>p.z))+16)/cell)*cell),visible=[],margin=cameraZoom3()*cell*3.5;
 // A low camera can put a near chunk's center well outside the viewport while
 // one of its corners still fills the foreground, so retain a wider edge band.
 // The height-aware projection samples elevation for every candidate chunk.
 // These corner-derived bounds already include a 16-unit edge band, so keep
 // the wide screen margin and use flat projection to avoid those samples.
 for(let z=minZ;z<maxZ;z+=cell)for(let x=minX;x<maxX;x+=cell){
  // A chunk straddling the camera plane can fill the foreground even when its
  // center projects behind the eye. Keep this bounded near-camera ring instead
  // of rejecting it by that center; streaming and upload budgets still apply.
  const dx=Math.max(x-eye[0],0,eye[0]-x-cell),dz=Math.max(z-eye[2],0,eye[2]-z-cell),near=dx*dx+dz*dz<=cell*cell;
  if(!near&&footprint?.some(e=>e.nx*(e.nx>=0?x+cell:x)+e.nz*(e.nz>=0?z+cell:z)<e.d-e.pad))continue;
  const p=flatProject3(x+cell/2,0,z+cell/2);if(!near&&(p.x< -margin||p.x>screen.w+margin||p.y< -margin||p.y>screen.h+margin))continue;
  const key=cell+':'+(streamed?'stream':detail)+':'+x+':'+z;let c=chunks.get(key);if(!c){c={x:x+cell/2,z:z+cell/2,terrain:true,key,scene:currentScene};chunks.set(key,c);}visible.push(c);
 }
 gpu.terrainTick=(gpu.terrainTick||0)+1;
 for(const c of visible){c.used=gpu.terrainTick;}
 if(streamed){
  for(const c of visible){const distance=Math.hypot(c.x-px,c.z-py),limits=mobile?[32,80,160]:[32,64,128],steps=mobile?[1,2,4,4]:[.5,1,2,4];
   let level=distance<limits[0]?0:distance<limits[1]?1:distance<limits[2]?2:3;
   if(c.lodLevel!==undefined&&level!==c.lodLevel){const boundary=limits[Math.min(level,c.lodLevel)];if(boundary&&Math.abs(distance-boundary)<boundary*.12)level=c.lodLevel;}
   c.lodLevel=level;c.targetStep=steps[level];
  }
  if(gpu.terrainStream.frame(visible,surfaceRevision)){
   const ready=gpu.terrainReady||(gpu.terrainReady=[]);ready.length=0;for(const c of visible)if(c.buffer)ready.push(c);
   const cap=mobile?160:384;
   // Evict stale scheduler records too, including cells abandoned before upload.
   if(gpu.terrainTick%16===0)for(const map of gpu.terrain.values())for(const [key,c]of map)if(c.used!==gpu.terrainTick&&(gpu.terrainTick-c.used>32||map.size>cap)){if(c.buffer)gpu.gl.deleteBuffer(c.buffer);map.delete(key);}
   return ready;
  }
  gpu.terrainStream=null;
 }
 const terrainStart=performance.now(),terrainMs=mobile?3:6;let fallbackSlices=0;
 if(mobile&&inWorld()){
  const fallbackCandidates=visible.filter(c=>!c.buffer&&!c.complete&&!c.noGeometry&&!c.fallbackAttempted);
  fallbackCandidates.sort((a,b)=>((a.x-px)**2+(a.z-py)**2)-((b.x-px)**2+(b.z-py)**2));
  for(const c of fallbackCandidates){
   while(!c.fallbackAttempted&&fallbackSlices<4&&performance.now()-terrainStart<terrainMs){const data=realmTerrainFallback(c,cell,mw,mh);fallbackSlices++;if(data!==null){c.fallbackAttempted=true;if(data.length)realmTerrainUpload(gpu,c,data);}}
   if(fallbackSlices>=4||performance.now()-terrainStart>=terrainMs)break;
  }
 }
 const terrainBudget=mobile?160:384;
 const cameraKey=[currentScene,cell,detail,screen.w,screen.h,Math.floor(px/8),Math.floor(py/8),Math.round(view3d.yaw*8),Math.round(cameraPitch3()*8),Math.round(cameraZoom3()*2)].join(':');
 if(gpu.terrainQueueKey!==cameraKey){const visibleSet=new Set(visible);for(const c of gpu.terrainQueue||[]){c.queued=false;if(!visibleSet.has(c)){c.build=null;c.fallbackBuild=null;}}gpu.terrainQueue=visible.filter(c=>!c.complete&&!c.noGeometry);gpu.terrainQueue.sort((a,b)=>((a.x-px)**2+(a.z-py)**2)-((b.x-px)**2+(b.z-py)**2));for(const c of gpu.terrainQueue)c.queued=true;gpu.terrainQueueIndex=0;gpu.terrainQueueKey=cameraKey;}
 else for(const c of visible)if(!c.complete&&!c.noGeometry&&!c.queued){c.queued=true;gpu.terrainQueue.push(c);}
 const maxSlices=mobile?16:24,tileBudget=mobile?1:2;let slices=0;
 while(gpu.terrainQueueIndex<gpu.terrainQueue.length&&slices<maxSlices&&performance.now()-terrainStart<terrainMs){const c=gpu.terrainQueue[gpu.terrainQueueIndex];if(c.complete||c.noGeometry){c.queued=false;gpu.terrainQueueIndex++;continue;}const complete=realmTerrainChunkRow(gpu,c,cell,detail,mw,mh,tileBudget);slices++;if(complete){c.queued=false;gpu.terrainQueueIndex++;}}
 gpu.terrainWork={slices,fallbackSlices,ms:performance.now()-terrainStart,budgetMs:terrainMs,pending:gpu.terrainQueue.length-gpu.terrainQueueIndex};
 if(gpu.terrainQueueIndex>=gpu.terrainQueue.length){gpu.terrainQueue.length=0;gpu.terrainQueueIndex=0;}
 const ready=gpu.terrainReady||(gpu.terrainReady=[]);ready.length=0;for(const c of visible)if(c.buffer)ready.push(c);
 if(gpu.terrainTick%16===0){const resident=[];for(const sceneChunks of gpu.terrain.values())for(const c of sceneChunks.values())if(c.buffer)resident.push(c);if(resident.length>terrainBudget){resident.sort((a,b)=>a.used-b.used);for(let i=0;i<resident.length-terrainBudget;i++){const c=resident[i];if(c.used===gpu.terrainTick)continue;gpu.gl.deleteBuffer(c.buffer);gpu.terrain.get(c.scene).delete(c.key);}}}
 if(!inWorld()&&(currentScene==='mine'||realmSceneInfo.get(currentScene)?.kind==='mine')){
  if(!gpu.caveBackground){const data=[];flatFaceData(data,[[-128,-.03,-128],[-128,-.03,512],[512,-.03,512],[512,-.03,-128]],'#323b35',null,14);gpu.caveBackground={...gpu.upload(new Float32Array(data)),terrain:true};if(gpu.kind==='filament')gpu.caveBackground.buffer.retire=()=>{gpu.caveBackground=null;};}
  return [gpu.caveBackground,...ready];
 }
 return ready;
}
const canvasPainterRealm=painter3;
painter3=function(g,project){
 if(project!==project3||realmGPUUnavailable){const painter=canvasPainterRealm(g,project);painter.software=true;return painter;}
 if(!realmGPU){try{realmGPU=createRealmGPU();}catch(error){console.warn('Using canvas rendering:',error.message);}if(!realmGPU){realmGPUUnavailable=true;return canvasPainterRealm(g,project);}}
 const gpu=realmGPU,entries=[],dynamic=[];
 const painter={face(points,color,normals,material,colors,uvs){realmFaceData(dynamic,points,color,normals,material,colors,uvs);},indexed(mesh,m,style={}){entries.push({...realmMeshEntry(gpu,mesh),model:m,...style});},cached(cached){if(cached.kind!=='building')for(const instance of cached.instances||[])entries.push({...realmMeshEntry(gpu,instance.mesh),model:instance.matrix});if(!cached.faces.length&&cached.kind!=='building')return cached.height;let entry=gpu.cache.get(cached);if(!entry){const data=[];if(cached.kind==='building')for(const instance of cached.instances||[])realmIndexedData(data,instance.mesh,instance.matrix);for(const f of cached.faces){let material=f.material||0;if(!material&&cached.kind==='building'){const n=parseInt(f.color.slice(1),16),red=n>>16,green=(n>>8)&255,blue=n&255,top=f.points.reduce((a,p)=>a+p[1],0)/f.points.length;if(top>2.05&&Math.max(red,green,blue)-Math.min(red,green,blue)>23)material=6;else if(red>green*1.15&&green>blue*1.1)material=5;}realmFaceData(data,f.points,f.color,f.normals,material,f.colors,f.uvs);}entry=gpu.upload(new Float32Array(data));gpu.cache.set(cached,entry);}entries.push(entry);return cached.height;},flush(){gpu.render([...realmTerrainEntries(gpu),...entries],dynamic,g);trimRealmMeshes(gpu);gpu.frameId=(gpu.frameId||0)+1;}};
 if(gpu.skinning)painter.skinned=(mesh,m,palette,style={})=>{if(palette.length>REALM_SKIN_BONES*12)throw new Error("Creature rig exceeds palette limit");entries.push({...realmSkinnedEntry(gpu,mesh),model:m,palette,...style});};
 return painter;
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
