import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
execFileSync('python3',['scripts/build-asset-registry.py'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/export-shared-world.cjs'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/export-trade-items.cjs'],{stdio:'inherit'});
import {build} from 'esbuild';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import './build-icons.mjs';
// Preserve the authored browser game and bundle its assets with the API Worker.
const assets={};
async function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(['server','.openai'].includes(ent.name))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())await walk(p);else{const ext=path.extname(p),relative=path.relative('dist',p).split(path.sep).join('/');let bytes=fs.readFileSync(p),mime=({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.xml':'application/xml; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.txt':'text/plain; charset=utf-8','.wasm':'application/wasm','.filamat':'application/octet-stream','.ktx2':'image/ktx2','.glb':'model/gltf-binary','.gltf':'model/gltf+json'})[ext]||'application/octet-stream';
 // Filament's createTextureFromPng consumes the file bytes directly. Keep
 // this renderer atlas as PNG instead of applying the site's WebP delivery
 // optimization, which otherwise makes the first authenticated draw throw.
 if(ext==='.png'&&!['assets/realms/atlas-filament.png','assets/realms/atlas-filament-mobile.png','assets/realms/ground-surfaces.png','assets/realms/ground-surfaces-mobile.png'].includes(relative)){const img=await loadImage(bytes),c=createCanvas(img.width,img.height);c.getContext('2d').drawImage(img,0,0);bytes=await c.encode('webp',88);mime='image/webp';}assets['/'+relative]={data:bytes.toString('base64'),mime,length:bytes.length};}}}
await walk('dist');
// Versioned assets can be reused across visits. The document and account API
// remain fresh, so new publications never depend on clearing a phone's cache.
const versions={};
// Change the cache namespace so browsers cannot reuse the broken compressed
// responses from the previous publication under their immutable asset URLs.
for(const [url,asset]of Object.entries(assets)){asset.version=createHash('sha256').update('identity-v1\0').update(Buffer.from(asset.data,'base64')).digest('hex').slice(0,16);if(url!=='/index.html')versions[url.slice(1)]=url.slice(1)+'?v='+asset.version;}
const release='realm-'+createHash('sha256').update(Object.entries(assets).filter(([url])=>url!=='/index.html').sort(([a],[b])=>a.localeCompare(b)).map(([url,asset])=>url+':'+asset.version).join('\n')).digest('hex').slice(0,16);
let html=Buffer.from(assets['/index.html'].data,'base64').toString('utf8');
if(!html.includes('world-edits-runtime.js'))html=html.replace('<script src="character-creation.js"','<script src="world-edits-runtime.js"></script><script src="character-creation.js"');
html=html.replace(/(src|href)="([^"?]+)"/g,(all,attribute,url)=>versions[url]?attribute+'="'+versions[url]+'"':all);
html=html.replace('<script src="startup.js','<script>window.REALM_RELEASE='+JSON.stringify(release)+';window.REALM_ASSET_VERSIONS='+JSON.stringify(versions)+';</script><script src="startup.js');
assets['/index.html'].data=Buffer.from(html).toString('base64');
assets['/index.html'].version=createHash('sha256').update(html).digest('hex').slice(0,16);
// Return ordinary bodies. Cloudflare owns transport compression; pre-gzipping
// here with an automatic Response caused a second compression pass, leaving
// gzip bytes on screen after the browser decoded the outer response.
const bundled=await build({entryPoints:['worker/api.js'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['node:crypto']});const api=bundled.outputFiles[0].text;
// Store large text assets compressed inside the Worker. Decompress their
// response streams before delivery, so Cloudflare still owns HTTP compression.
// Versions and lengths above describe the original response bytes.
for(const [url,asset]of Object.entries(assets)){
 if(!/\.(js|json|css|txt|wasm|filamat)$/.test(url)||asset.length<65536)continue;
 const raw=Buffer.from(asset.data,'base64'),compressed=gzipSync(raw,{level:9});
 if(compressed.length<raw.length*.90){asset.data=compressed.toString('base64');asset.storageEncoding='gzip';}
}
const server=api+'\nconst assets='+JSON.stringify(assets)+';\n'+`const release=${JSON.stringify(release)};export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname==='/api/editor/edits')return handleEditorEdits(request,env);if(url.pathname==='/api/editor/access')return editorAccess(request,env);if(url.pathname==='/api/release')return Response.json({release},{headers:{'Cache-Control':'no-store'}});if(url.pathname==='/api/maintenance'||url.pathname==='/api/admin/maintenance')return handleMaintenance(request,env);if(url.pathname==='/api/admin/global-reset')return handleGlobalReset(request,env);if(url.pathname==='/api/admin/grant-capes')return handleCapeGrant(request,env);if(url.pathname==='/api/status')return handleStatus(request,env);if(url.pathname==='/api/client-error')return handleClientError(request,env);if(url.pathname.startsWith('/api/')){const paused=await maintenanceGate(request,env);if(paused)return paused;}if(url.pathname.startsWith('/api/auth/'))return handleAuth(request,env);if(url.pathname==='/api/social')return handleSocial(request,env);if(url.pathname==='/api/activity')return handleActivity(request,env);if(url.pathname==='/api/players')return handlePlayers(request,env);if(url.pathname==='/api/character')return handleSave(request,env);if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const editorPage=['/editor','/editor/','/editor/index.html'].includes(url.pathname);const editorViewport=url.pathname==='/editor/viewport.html';let editorAllowed=false;if(editorPage||editorViewport||['/editor/editor.js','/editor/editor-runtime.js','/editor/editor-startup.js','/editor/editor-entry.js'].includes(url.pathname)){const access=await editorAccess(request,env);editorAllowed=access.status===200;if(!editorPage&&!editorAllowed)return access;}const asset=assets[editorPage?(editorAllowed?'/editor/index.html':'/editor/login.html'):editorViewport?(editorAllowed?'/editor/viewport.html':'/editor/login.html'):url.pathname==='/'?'/landing.html':['/donate','/donate/'].includes(url.pathname)?'/donate.html':['/play','/play/'].includes(url.pathname)?'/index.html':url.pathname];if(!asset)return new Response('Not found',{status:404});const version=url.searchParams.get('v');if(version&&version!==asset.version)return new Response('Game updated. Reload to continue.',{status:409,headers:{'Cache-Control':'no-store'}});const headers={'Content-Type':asset.mime,'Cache-Control':url.pathname.startsWith('/editor')?'private, no-store':version?'public, max-age=31536000, immutable':'no-cache','ETag':'"'+asset.version+'"','X-Content-Type-Options':'nosniff'};if(request.headers.get('If-None-Match')===headers.ETag)return new Response(null,{status:304,headers});let data=null;if(request.method!=='HEAD'){const binary=atob(asset.data);data=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)data[i]=binary.charCodeAt(i);if(asset.storageEncoding==='gzip')data=new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'));}let status=200;if(asset.mime==='audio/mpeg'){headers['Accept-Ranges']='bytes';const range=request.headers.get('Range');if(range){const match=range.match(/^bytes=(\\d*)-(\\d*)$/);if(!match||!match[1]&&!match[2])return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+asset.length}});let start=match[1]?Number(match[1]):Math.max(0,asset.length-Number(match[2])),end=match[1]&&match[2]?Number(match[2]):asset.length-1;end=Math.min(end,asset.length-1);if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=asset.length)return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+asset.length}});if(data)data=data.slice(start,end+1);status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+asset.length;headers['Content-Length']=String(end-start+1);}}return new Response(data,{status,headers});}};`;
if(Buffer.byteLength(server)>64*1024*1024)throw new Error('The built Worker is '+Math.round(Buffer.byteLength(server)/1024/1024)+' MiB and exceeds the 64 MiB hosting limit. Reduce embedded asset data before publication.');
fs.mkdirSync('dist/server',{recursive:true});fs.writeFileSync('dist/server/index.js',server);fs.mkdirSync('dist/.openai',{recursive:true});fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');fs.rmSync('dist/.openai/drizzle',{recursive:true,force:true});fs.cpSync('drizzle','dist/.openai/drizzle',{recursive:true});console.log('Built character-save Worker and '+Object.keys(assets).length+' game assets; '+Math.round(server.length/1024)+' KiB module.');
