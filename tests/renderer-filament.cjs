'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'dist/renderer-filament.js'),'utf8');
const context={console,Math,Float32Array,Uint8Array,Map,Set,WeakMap,Promise,Error,Number,Array,window:{},painter3(){},canvasPainterRealm(){return {};},project3(){},realmIdentityModel:new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),realmGroundedMatrix:model=>Array.from(model)};
vm.createContext(context);vm.runInContext(source,context,{filename:'renderer-filament.js'});

const arrays=context.realmFilamentArrays(new Float32Array([
 1,2,3, 0,1,0, .2,.4,.6, 23, .25,.75,
 -1,-2,-3, 1,0,0, 1,0,.5, 4, 0,1
]));
assert.deepEqual(Array.from(arrays.positions),[1,2,3,-1,-2,-3]);
assert.deepEqual(Array.from(arrays.normals),[0,1,0,1,0,0]);
assert.deepEqual(JSON.parse(JSON.stringify(arrays.bounds)),JSON.parse(JSON.stringify(context.realmFilamentBounds(arrays.positions))),'fused bounds match the original geometry bounds');
assert.deepEqual(JSON.parse(JSON.stringify(context.realmFilamentArrays(new Float32Array()).bounds)),{center:[0,0,0],halfExtent:[1,1,1]});
assert.match(source,/SurfaceOrientation\$Builder\(\)\.vertexCount\(arrays\.count\)/,'terrain and world normals are converted into Filament tangent frames for lit shading');
assert.deepEqual(Array.from(arrays.colors),Array.from(new Float32Array([.2,.4,.6,23,1,0,.5,4])));
assert.deepEqual(Array.from(arrays.uvs),[.25,.75,0,1]);
const identityColors=context.realmFilamentArrays(new Float32Array([0,0,0,0,1,0,1.67,1.48,1.23,19.25,0,0]));
assert.deepEqual(Array.from(identityColors.colors),Array.from(new Float32Array([1.67,1.48,1.23,19.25])),'Filament keeps authored skin range and fractional material slots');

const affine=[1,2,3,4,5,6,7,8,9,10,11,12];
assert.deepEqual(Array.from(context.realmFilamentMatrix(affine)),[1,5,9,0,2,6,10,0,3,7,11,0,4,8,12,1]);
for(const sample of [[10.123,2.4,20.456,-.55,.8,34,3],[-42.73,8.1,611.29,1.2,.55,24.2,2]]){
 const [x,y,z,yaw,pitch,zoom,dpr]=sample,[sx,sy,sz]=context.realmFilamentCameraCenter(...sample),c=Math.cos(yaw),s=Math.sin(yaw),st=Math.sin(pitch),ct=Math.cos(pitch),scale=zoom*dpr;
 assert(Math.abs((sx*c-sz*s)*scale-Math.round((sx*c-sz*s)*scale))<1e-8,'camera right axis lands on a backing pixel');
 assert(Math.abs(((sx*s+sz*c)*st-sy*ct)*scale-Math.round(((sx*s+sz*c)*st-sy*ct)*scale))<1e-8,'camera up axis lands on a backing pixel');
 assert(Math.abs((sx*s*ct+sy*st+sz*c*ct)-(x*s*ct+y*st+z*c*ct))<1e-10,'camera snapping preserves view depth');
}
assert.equal(context.realmFilamentStyle({bossColor:2,dissolve:.126}).key,'t0:b20:d3');
assert.equal(context.realmFilamentStyle({terrain:true}).key,'t1:b0:d0');
const daylight=JSON.parse(JSON.stringify(context.realmFilamentLightingProfile({night:0,cave:0,house:0}))),nightlight=JSON.parse(JSON.stringify(context.realmFilamentLightingProfile({night:1,cave:0,house:0})));
assert.deepEqual([daylight.sun,daylight.ambient,daylight.aperture,daylight.speed],[57500,19000,12.8,125],'daylight exposure and energy remain consistent');
const exposure=p=>1/(p.aperture*p.aperture*p.speed);
const sourceLight={intensity:1.7,radius:19};
const dayPower=context.realmFilamentPointLightPower(sourceLight,daylight),nightPower=context.realmFilamentPointLightPower(sourceLight,nightlight);
assert(Math.abs(dayPower*exposure(daylight)-nightPower*exposure(nightlight))<1e-9,'local illumination keeps its strength through camera exposure changes');
assert.equal(context.realmFilamentPointLightPower({...sourceLight,intensity:0},nightlight),0,'disabled emitters have no minimum brightness floor');
for(const invalid of [{intensity:NaN,radius:19},{intensity:Infinity,radius:19},{intensity:-1,radius:19},{intensity:1,radius:0},{intensity:1,radius:Infinity}])assert.equal(context.realmFilamentPointLightPower(invalid,nightlight),0,'invalid emitters cannot reach native lighting');
assert(exposure(nightlight)/exposure(daylight)<2.1,'night adaptation stays within about one stop');
for(const light of ['sun','ambient'])assert(nightlight[light]*exposure(nightlight)<daylight[light]*exposure(daylight)*.25,'night illumination stays darker after actual camera exposure: '+light);
let previousSun=Infinity,previousAmbient=Infinity;
for(let step=0;step<=20;step++){const p=context.realmFilamentLightingProfile({night:step/20});const sun=p.sun*exposure(p),ambient=p.ambient*exposure(p);assert(sun<=previousSun&&ambient<=previousAmbient,'dusk changes illumination continuously and monotonically');previousSun=sun;previousAmbient=ambient;}
const retainedProfile=context.realmFilamentLightingProfile({night:0}),retainedColor=retainedProfile.color;assert.equal(context.realmFilamentLightingProfile({night:1}),retainedProfile);assert.equal(retainedProfile.color,retainedColor,'lighting updates reuse their bounded color storage');
const caveProfile=context.realmFilamentLightingProfile({night:0,cave:1});assert(caveProfile.sun<daylight.sun*.13&&caveProfile.ambient<daylight.ambient*.41,'cave lighting stays bounded independently of night exposure');
assert.deepEqual(JSON.parse(JSON.stringify(context.realmFilamentQualityProfile())),{anisotropy:16,glbBytes:96*1024*1024,ao:false,dithering:false,lightLimit:12});
assert.deepEqual(JSON.parse(JSON.stringify(context.realmFilamentShadowOptions())),{mapSize:2048,shadowCascades:2,stable:true,normalBias:.6,constantBias:.001,maxShadowDistance:95},'desktop uses sharper two-cascade shadows');
context.window.matchMedia=()=>({matches:true});assert.deepEqual(JSON.parse(JSON.stringify(context.realmFilamentShadowOptions())),{mapSize:1024,shadowCascades:1,stable:true,normalBias:.6,constantBias:.001,maxShadowDistance:80},'coarse-pointer devices use the mobile-safe shadow allocation');assert.deepEqual(JSON.parse(JSON.stringify(context.realmFilamentQualityProfile())),{anisotropy:8,glbBytes:32*1024*1024,ao:false,dithering:false,lightLimit:8});delete context.window.matchMedia;

const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
for(const file of ['startup.js','vendor/filament/filament.js','filament-bootstrap.js','renderer-gl.js','renderer-filament.js'])assert.ok(html.includes('src="'+file+'"'),'Missing '+file);
assert.ok(html.indexOf('startup.js')<html.indexOf('vendor/filament/filament.js'));
assert.ok(html.indexOf('filament-bootstrap.js')<html.indexOf('game.js'));
assert.ok(html.indexOf('renderer-gl.js')<html.indexOf('renderer-filament.js'));
assert.match(source,/Engine\.create\(surface/);assert.match(source,/createVeldrenTextureResources/);assert.doesNotMatch(source,/createTextureFromKtx2/,'terrain no longer depends on a stale prebuilt KTX2');assert.match(source,/createAssetLoader/);assert.match(source,/Camera\$Projection\.PERSPECTIVE/);assert.match(source,/kind:'filament'/);
assert.match(source,/dynamicResources=\[null,null,null\]/,'dynamic geometry uses persistent triple buffering');
assert.doesNotMatch(source,/if\(dynamicResource\)\{destroyResource\(dynamicResource\)/,'dynamic geometry is not destroyed every frame');
assert.match(source,/MinFilter\.LINEAR_MIPMAP_LINEAR/);assert.match(source,/anisotropy:16/);assert.match(source,/attribute\(A\.COLOR,2,T\.FLOAT4/);
assert.match(source,/terrainMaterial=engine\.createMaterial/,'legacy terrain material remains loadable during the transition');
assert.match(source,/shadowOptions\(realmFilamentShadowOptions\(\)\)/,'the sun selects mobile or desktop shadow resources before first draw');
assert.ok(source.indexOf('surface.width=initialWidth;surface.height=initialHeight')<source.indexOf('Filament.Engine.create(surface'),'the iOS backing store exists before Filament binds its WebGL swap chain');
assert.match(source,/view\.setViewport\(\[0,0,initialWidth,initialHeight\]\)/,'the first Filament frame uses the pre-sized backing viewport');
assert.match(source,/setAntiAliasing\(Filament\.View\$AntiAliasing\.FXAA\)/,'non-temporal edge smoothing remains enabled');
assert.doesNotMatch(source,/setTemporalAntiAliasingOptions/,'temporal history cannot smear or lag the moving world');
assert.match(source,/return cameraPose3\(\)/,'Filament consumes the canonical camera without independent framing');
const canonicalPose={eye:[12,9,36],center:[12.5,8.12,34.5],yaw:-.5,pitch:.8,distance:6,near:.12,far:320,left:-.1,right:.1,bottom:-.05,top:.08};
context.cameraPose3=()=>canonicalPose;assert.equal(context.realmFilamentCameraState(),canonicalPose,'rendering and native culling receive the same pose object');
assert.match(source,/setProjection\(Filament.Camera\$Projection.PERSPECTIVE,left,right,bottom,top,near,far\)/,'Filament consumes the shared projection');
assert.match(source,/instance\.setTextureParameter\('atlas',atlas,sampler\)/,'lit terrain shares the stable world material atlas binding');
assert.match(source,/groundSampler\.setAnisotropy\(quality\.anisotropy\)/,'quality profile controls oblique terrain filtering');
assert.match(source,/setFloatParameter\('terrainSurface',0\)/,'world objects select the world material branch');
assert.match(source,/ColorGrading\$ToneMapping\.ACES/,'the browser uses filmic tone mapping');assert.match(source,/IndirectLight\.Builder\(\)\.irradianceSh/,'lit assets receive bounded ambient light');assert.match(source,/glbBytes:32\*1024\*1024/,'mobile GLB residency has an explicit budget');
assert.match(source,/receiveShadows\(!resource\.terrain\)/,'terrain avoids camera-relative cascaded shadow bands while retaining normal-based sun lighting');
assert.match(source,/if\(style\.terrain\)\{instance=terrainMaterial\.createInstance/,'terrain uses its dedicated stable surface material');assert.match(source,/worldMaterialInstances\.add\(instance\)/,'world objects participate in normal lighting updates');
assert.match(source,/textureResources.acquire\(assets.atlasBytes,textureSettings\)/);
assert.match(source,/textureResources.acquire\(assets.groundSurfacesBytes,textureSettings\)/);
assert.doesNotMatch(source,/realmFilamentMipLevels/,'mipmap decisions remain native');
const filamentBootstrap=fs.readFileSync(path.join(root,'dist/filament-bootstrap.js'),'utf8');
assert.match(filamentBootstrap,/initialization timed out'\)\);}},120000\)/,'slow mobile Filament startup receives the full two-minute window');
assert.match(filamentBootstrap,/veldren-terrain\.filamat/,'startup fetches the dedicated terrain material');
assert.match(filamentBootstrap,/atlas-filament'\+\(mobile\?'-mobile':''\)\+'\.png'/,'mobile fetches its bounded character and prop atlas');
assert.match(filamentBootstrap,/groundSurfacesType=mobile\?'mobile-png':'png'/,'startup selects browser-decodable terrain PNGs on mobile and desktop');
assert.match(filamentBootstrap,/ground-surfaces'\+\(mobile\?'-mobile\.png':'\.png'\)/,'startup fetches the selected grass, dirt, stone and water atlas');
assert.match(filamentBootstrap,/Promise.all\(\[encodedImage\(atlas\),encodedImage\(groundSurfaces\),window.realmNativeReady\]/);
const rebuiltSource=fs.readFileSync(path.join(root,'dist/realms-rebuilt.js'),'utf8');
assert.match(rebuiltSource,/mobile\?'assets\/realms\/atlas-filament-mobile\.png':'assets\/realms\/atlas\.png'/,'mobile UI rendering decodes the bounded atlas directly');
assert.doesNotMatch(rebuiltSource,/small\.width=small\.height=2048/,'mobile never decodes the full atlas just to create another downscaled copy');

const materialSource=fs.readFileSync(path.join(root,'dist/materials/veldren-world.mat'),'utf8');
assert.match(materialSource,/veldrenSrgbToLinear/);assert.match(materialSource,/veldrenLinearToSrgb/);assert.match(materialSource,/textureGrad\(materialParams_atlas/);assert.match(materialSource,/veldrenDetailVisibility/);assert.match(materialSource,/baseColor = vec4\(linearColor \* alpha, alpha\)/);
assert.doesNotMatch(materialSource,/world\.yy\) \* 24\.0/,'plain character and prop colors remain authored instead of receiving moving procedural detail');
assert.doesNotMatch(materialSource,/veldrenNoise\(p \* 0\.75\)/,'terrain does not retain screen-crawling mid-frequency grain');
assert.match(materialSource,/vec3 paving = mix\(vec3\(0\.46/,'paved roads have a distinct sampler-free stone color');
assert.doesNotMatch(materialSource,/groundSurfaces|veldrenGround/,'terrain material has no texture-sampling path');
const atlasFunction=materialSource.match(/vec4 veldrenAtlas\([\s\S]+?\n    }/)[0];
assert.match(atlasFunction,/512\.0 \/ max\(rho, 1\.0\)/,'the unrelated character atlas keeps its existing mip footprint');
assert.match(materialSource,/float roadMask = smoothstep\(0\.05, 0\.90, clamp\(vertex\.r/,'terrain road coverage reaches the Filament material');
assert.match(materialSource,/float pavingMask = smoothstep\(0\.05, 0\.90, clamp\(vertex\.g/,'terrain paving coverage is independent of the road mask');
assert.match(materialSource,/float quarryMask = smoothstep\(0\.05, 0\.90, clamp\(vertex\.b/,'terrain quarry coverage is independent of the road mask');
assert.match(materialSource,/color = mix\(color, paving, pavingMask\)/,'paving cannot be hidden by dirt coverage');
assert.match(materialSource,/color = mix\(color, cutRock, quarryMask\)/,'quarry rock cannot be hidden by dirt coverage');
assert.match(materialSource,/mix\(ambient, terrainAmbient, materialParams\.terrainSurface\)/,'terrain remains readable at night without changing other materials');

const terrainSource=fs.readFileSync(path.join(root,'dist/materials/veldren-terrain.mat'),'utf8');
assert.match(terrainSource,/shadingModel : lit/,'terrain normals receive actual sun and sky lighting');
assert.equal((terrainSource.match(/type : sampler2d/g)||[]).length,1,'terrain material has exactly one sampler');
assert.match(terrainSource,/textureGrad\(materialParams_groundSurfaces/,'ground textures use an explicit stable mip footprint');
assert.match(terrainSource,/vec2 p = getUV0\(\)/,'terrain samples stable mesh-authored world coordinates');
assert.doesNotMatch(terrainSource,/vec3 world = getWorldPosition\(\)/,'camera-relative fragment positions cannot move terrain texture coordinates');
assert.match(terrainSource,/dFdx\(uv\) \* 0\.5/,'terrain uses its real screen footprint instead of destroying distant detail with a mip bias');
assert.doesNotMatch(terrainSource,/dFdx\(uv\) \* 16\.0/,'terrain no longer forces a four-mip blur');
assert.match(terrainSource,/128\.0 \/ max\(rho, 1\.0\)/,'ground sampling stops before atlas surfaces share a mip');
assert.match(terrainSource,/terrainTexture\(p \* 0\.105, vec2\(0\.0, 0\.0\)\)/,'grass selects the grass atlas tile');
assert.match(terrainSource,/terrainTexture\(p \* 0\.115, vec2\(1\.0, 0\.0\)\)/,'roads select the dirt atlas tile');
assert.match(terrainSource,/terrainTexture\(p \* 0\.115, vec2\(0\.0, 1\.0\)\)/,'paving selects the stone atlas tile');
assert.match(terrainSource,/float roadMask = smoothstep\(0\.05, 0\.90, clamp\(masks\.r/);
assert.match(terrainSource,/float pavingMask = smoothstep\(0\.05, 0\.90, clamp\(masks\.g/);
assert.match(terrainSource,/color = mix\(color, stone[^\n]+pavingMask\)/,'paving is applied independently');
assert.match(terrainSource,/float bank = 1\.0 - smoothstep\(0\.10, 0\.95, clamp\(masks\.b/,'shoreline distance remains available after UV0 is dedicated to stable terrain coordinates');
assert.match(terrainSource,/id > 4\.5 && id < 5\.5/,'explicit road geometry selects the dirt surface');

const terrainPacking=fs.readFileSync(path.join(root,'dist/renderer-gl.js'),'utf8');
assert.match(terrainPacking,/ceiling=mobile\?1\.5:2/,'Filament caps coarse-pointer backing pixels below the desktop ceiling');
assert.match(terrainPacking,/uv:\[a,b\]/,'terrain vertices store absolute world X\/Z in UV0');
assert.match(terrainPacking,/vertices\.map\(v=>v\.uv\)/,'terrain UV0 reaches the packed mesh');
assert.match(terrainPacking,/points\.map\(p=>\[p\[0\],p\[2\]\]\)/,'water and non-overworld terrain also receive stable coordinates');
assert.match(terrainPacking,/budget=\(mobile\?24:48\)\*1024\*1024/,'mobile mesh residency stays below the desktop GPU budget');
assert.match(terrainPacking,/terrainBudget=mobile\?160:384/,'mobile terrain cache is bounded independently from desktop');

const boot=fs.readFileSync(path.join(root,'dist/game.js'),'utf8');
assert.match(boot,/await Promise\.all\(\[realmStartupTask\('auth',\(\)=>ensureGameLogin\(\)\),realmStartupTask\('native-init',\(\)=>window\.realmNativeReady[^\]]+realmStartupTask\('filament-init',\(\)=>window\.filamentReady/);
assert(html.indexOf('src="startup.js"')<html.indexOf('src="native-runtime.js"')&&html.indexOf('src="native-runtime.js"')<html.indexOf('src="vendor/filament/filament.js"'),'native core starts alongside the renderer before gameplay scripts');
const build=fs.readFileSync(path.join(root,'scripts/build.mjs'),'utf8');
assert.match(build,/'\.wasm':'application\/wasm'/);assert.match(build,/'\.ktx2':'image\/ktx2'/);assert.match(build,/wasm\|filamat/);
const filamentAssetBuild=fs.readFileSync(path.join(root,'scripts/build-filament-assets.mjs'),'utf8');
assert.match(filamentAssetBuild,/\['grass',0,0\].+\['dirt',1,0\].+\['stone',0,1\].+\['water',1,1\]/s,'ground atlas keeps four distinct surfaces');
for(const surface of ['grass','dirt','stone','water'])assert.ok(fs.existsSync(path.join(root,`dist/assets/realms/ground-${surface}.png`)),`ground atlas source ${surface} is local`);
assert.match(filamentAssetBuild,/'-mip_smallest','8'/,'ground atlas keeps independent mip texels for all four surfaces');

const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
assert.equal(hash('dist/vendor/filament/filament.js'),'cabd5933390705060715c2ad7adb9975aa21315b3a910139d7401e0359ceb509');
assert.equal(hash('dist/vendor/filament/filament.wasm'),'c8938bdd991389df764deab9235b7d6e7748290d4b89fcc63f6dfa7c7f6ba4d7');
assert.equal(fs.readFileSync(path.join(root,'dist/assets/realms/atlas-filament.png')).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
const mobileAtlas=fs.readFileSync(path.join(root,'dist/assets/realms/atlas-filament-mobile.png')),mobileGround=fs.readFileSync(path.join(root,'dist/assets/realms/ground-surfaces-mobile.png'));
assert.equal(mobileAtlas.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.deepEqual([mobileAtlas.readUInt32BE(16),mobileAtlas.readUInt32BE(20)],[1024,1024]);
assert.equal(mobileGround.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.deepEqual([mobileGround.readUInt32BE(16),mobileGround.readUInt32BE(20)],[512,512]);
const materialBinary=fs.readFileSync(path.join(root,'dist/materials/veldren-world.filamat')).toString('latin1');
for(const surface of ['groundSurfaces','groundGrass','groundDirt','groundStone'])assert.doesNotMatch(materialBinary,new RegExp(surface),'compiled material has no terrain sampler');
assert.ok(fs.statSync(path.join(root,'dist/materials/veldren-world.filamat')).size>10000);
const terrainBinary=fs.readFileSync(path.join(root,'dist/materials/veldren-terrain.filamat')).toString('latin1');
assert.match(terrainBinary,/groundSurfaces/,'compiled terrain material retains its single atlas binding');
for(const surface of ['groundGrass','groundDirt','groundStone','atlas'])assert.doesNotMatch(terrainBinary,new RegExp(surface),'compiled terrain material has no competing sampler');
assert.ok(fs.statSync(path.join(root,'dist/materials/veldren-terrain.filamat')).size>5000);
console.log('Filament renderer contract passed');
