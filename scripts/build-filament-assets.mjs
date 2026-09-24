import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createCanvas,loadImage} from '@napi-rs/canvas';

const root=process.env.FILAMENT_ROOT;
if(!root)throw new Error('Set FILAMENT_ROOT to an official Filament 1.77.0 release directory.');
const suffix=process.platform==='win32'?'.exe':'';
const tool=name=>path.join(root,'bin',name+suffix);
for(const name of ['matc','basisu'])if(!fs.existsSync(tool(name)))throw new Error('Missing '+tool(name));

// Keep every terrain surface in one texture. Multiple similarly named sampler
// parameters alias on Safari's WebGL/Filament path, which made every tile use
// the last-bound dirt texture. A power-of-two atlas also gives every surface a
// complete, deterministic mip chain.
const groundSurfaces=[['grass',0,0],['dirt',1,0],['stone',0,1],['water',1,1]];
const groundCanvas=createCanvas(1024,1024),groundContext=groundCanvas.getContext('2d');
for(const [name,targetX,targetY] of groundSurfaces){
 const surface=await loadImage(`dist/assets/realms/ground-${name}.png`);
 groundContext.drawImage(surface,0,0,surface.width,surface.height,targetX*512,targetY*512,512,512);
}
fs.writeFileSync('dist/assets/terrain.png',groundCanvas.toBuffer('image/png'));
fs.writeFileSync('dist/assets/realms/ground-surfaces.png',groundCanvas.toBuffer('image/png'));
const atlasSource=await loadImage('dist/assets/realms/atlas.png');
const filamentAtlas=createCanvas(2048,2048),filamentAtlasContext=filamentAtlas.getContext('2d');
for(let row=0;row<8;row++)for(let column=0;column<8;column++)filamentAtlasContext.drawImage(atlasSource,column*512,row*512,512,512,column*256,row*256,256,256);
fs.writeFileSync('dist/assets/realms/atlas-filament.png',filamentAtlas.toBuffer('image/png'));
const mobileAtlas=createCanvas(1024,1024),mobileAtlasContext=mobileAtlas.getContext('2d');
for(let row=0;row<8;row++)for(let column=0;column<8;column++)mobileAtlasContext.drawImage(atlasSource,column*512,row*512,512,512,column*128,row*128,128,128);
fs.writeFileSync('dist/assets/realms/atlas-filament-mobile.png',mobileAtlas.toBuffer('image/png'));
const mobileGround=createCanvas(512,512);mobileGround.getContext('2d').drawImage(groundCanvas,0,0,512,512);
fs.writeFileSync('dist/assets/realms/ground-surfaces-mobile.png',mobileGround.toBuffer('image/png'));
execFileSync(tool('matc'),['-p','mobile','-a','opengl','-l','1','-Os','-o','dist/materials/veldren-world.filamat','dist/materials/veldren-world.mat'],{stdio:'inherit'});
execFileSync(tool('matc'),['-p','mobile','-a','opengl','-l','1','-Os','-o','dist/materials/veldren-terrain.filamat','dist/materials/veldren-terrain.mat'],{stdio:'inherit'});
execFileSync(tool('basisu'),['-file','dist/assets/realms/atlas.png','-output_file','dist/assets/realms/atlas.ktx2','-ktx2','-etc1s','-quality','255','-effort','5','-mipmap','-mip_srgb','-mip_clamp','-mip_smallest','32'],{stdio:'inherit'});
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'veldren-ground-'));
const groundSource=path.join(temporary,'ground-surfaces.png');
try{
 fs.writeFileSync(groundSource,groundCanvas.toBuffer('image/png'));
 execFileSync(tool('basisu'),['-file',groundSource,'-output_file',path.resolve('dist/assets/realms/ground-surfaces.ktx2'),'-ktx2','-etc1s','-quality','128','-effort','5','-mipmap','-mip_srgb','-mip_smallest','8'],{stdio:'inherit'});
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
