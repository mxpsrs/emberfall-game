// Check the new GPU route, real driver probe, graceful fallbacks and VRAM lifecycle.
const vm=require('vm'),{spawnSync}=require('child_process');
const {ctx,gl}=require('../scripts/benchmark-desktop.cjs');ctx.checkGL=gl;ctx.mode='texture';
vm.runInContext(`{
 const gl=checkGL,read=gl.readPixels,extension=gl.getExtension,parameter=gl.getParameter;
 assert(realmTestTextureSkinning(gl));
 gl.readPixels=(...args)=>args.at(-1).fill(0);assert(!createRealmGPU().skinning,'broken device transforms keep the complete CPU model');gl.readPixels=read;
 gl.getExtension=n=>n==='OES_texture_float'?null:extension(n);assert(!createRealmGPU().skinning,'float textures are optional');gl.getExtension=extension;
 gl.getParameter=n=>n===gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS?0:parameter(n);assert(!createRealmGPU().skinning,'devices without vertex texture fetch retain CPU poses');gl.getParameter=parameter;
 const shaderCheck=gl.getShaderParameter;let first=true;gl.getShaderParameter=()=>{if(first){first=false;return false;}return true;};assert(!createRealmGPU().skinning,'main shader compilation failure also falls back');gl.getShaderParameter=shaderCheck;
 mode='gpu';const desktop=createRealmGPU();assert(desktop.skinning&&!desktop.textureSkinning,'the established desktop uniform path is retained');
 mode='texture';const gpu=createRealmGPU();assert(gpu.skinning&&gpu.textureSkinning);
 const material=avatarMaterial('male',{_appearance:{topStyle:5,bottomStyle:4,hair:4},weapon:'shortbow'},0),mesh=realmSkinnedEntry(gpu,material),identity=[1,0,0,0,0,1,0,0,0,0,1,0];
 const palettes=[new Float32Array(80*12).fill(.1),new Float32Array(80*12).fill(.2),new Float32Array(80*12).fill(.3)];
 const entries=[0,1,2,1].map(n=>({...mesh,model:identity,palette:palettes[n]})),uploads=[],rows=[];
 const image=gl.texImage2D,sub=gl.texSubImage2D,one=gl.uniform1f;
 gl.texImage2D=(...args)=>{uploads.push({kind:'create',width:args[3],height:args[4],data:Array.from(args.at(-1))});image(...args);};
 gl.texSubImage2D=(...args)=>{uploads.push({kind:'update',width:args[4],height:args[5],data:Array.from(args.at(-1))});sub(...args);};
 gl.uniform1f=(name,value)=>{if(name==='uBoneRow')rows.push(value);one(name,value);};
 gpu.render(entries,[],ctx);assert.equal(uploads.length,1,'upload each palette once across both passes');assert.equal(uploads[0].width,240);assert.equal(uploads[0].height,4);
 for(let i=0;i<3;i++)assert(Math.abs(uploads[0].data[i*960]-(i+1)/10)<1e-6);
 assert.deepEqual(rows,[.125,.375,.625,.375,.125,.375,.625,.375],'each actor and shadow selects its own palette row');
 uploads.length=0;rows.length=0;gpu.render(entries.slice(0,2),[],ctx);assert.equal(uploads.length,1);assert.equal(uploads[0].kind,'update');assert.equal(uploads[0].height,2,'only used rows are uploaded without reallocating the texture');
 assert.deepEqual(rows,[.125,.375,.125,.375]);
 gl.texImage2D=image;gl.texSubImage2D=sub;gl.uniform1f=one;
 // Old and current poses share an index buffer. Eviction must preserve the
 // live pose's index until its final reference is released.
 const secondMaterial={...material},second=realmSkinnedEntry(gpu,secondMaterial);assert.strictEqual(mesh.index,second.index);
 const actualBytes=gpu.meshBytes;gpu.frameId=1;realmSkinnedEntry(gpu,secondMaterial);mesh.bytes+=49*1024*1024;gpu.meshBytes+=49*1024*1024;
 trimRealmMeshes(gpu);assert(!gpu.skinnedMeshes.has(material));assert(gpu.skinnedMeshes.has(secondMaterial));assert.equal(second.index.refs,1);assert(gpu.meshBytes<actualBytes);
 const deleted=[],remove=gl.deleteBuffer;gl.deleteBuffer=b=>{deleted.push(b);remove(b);};second.bytes+=49*1024*1024;gpu.meshBytes+=49*1024*1024;
 trimRealmMeshes(gpu);assert(gpu.skinnedMeshes.has(secondMaterial),'never evict a model used by the current frame');gpu.frameId=2;trimRealmMeshes(gpu);assert.equal(gpu.meshBytes,0);assert(deleted.includes(second.index.buffer));gl.deleteBuffer=remove;
 realmResolution.scale=1;for(const [w,h,dpr]of [[1920,1080,1],[1112,512,3],[800,390,3],[3840,2160,2]]){screen={w,h};window.devicePixelRatio=dpr;const scale=realmPixelScale(),pixels=Math.floor(w*scale)*Math.floor(h*scale);assert(pixels<=2073600);assert(pixels>=2070000,'phone and desktop use the full HD pixel budget when available');}
 console.log('PASS: correct device probe, corrupted-output/capability/compiler fallbacks, desktop path, palette rows and upload reuse, shared-index eviction, current-frame protection and full-HD pixel budget.');
}`,ctx);
const probe=vm.runInContext(`(()=>{const data=realmSkinProbeData();return {vertex:realmSkinProbeVertex,fragment:realmSkinProbeFragment,bones:Array.from(data.bones),vertices:Array.from(data.vertices),expected:Array.from(data.expected)};})()`,ctx);
const native=spawnSync('python',[__dirname+'/../scripts/check-skin-probe.py'],{input:JSON.stringify(probe),encoding:'utf8'});process.stdout.write(native.stdout||'');process.stderr.write(native.stderr||'');if(native.status!==0)process.exit(native.status||1);
