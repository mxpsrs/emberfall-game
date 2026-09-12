import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createCanvas,loadImage} from '@napi-rs/canvas';
// Preserve the authored browser game and bundle its assets with the API Worker.
const assets={};
async function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(['server','.openai'].includes(ent.name))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())await walk(p);else{const ext=path.extname(p);let bytes=fs.readFileSync(p),mime=({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'})[ext]||'application/octet-stream';if(ext==='.png'){const img=await loadImage(bytes),c=createCanvas(img.width,img.height);c.getContext('2d').drawImage(img,0,0);bytes=await c.encode('webp',88);mime='image/webp';}assets['/'+path.relative('dist',p)]={data:bytes.toString('base64'),mime};}}}
await walk('dist');
// Versioned assets can be reused across visits. The document and account API
// remain fresh, so new publications never depend on clearing a phone's cache.
const versions={};
// Change the cache namespace so browsers cannot reuse the broken compressed
// responses from the previous publication under their immutable asset URLs.
for(const [url,asset]of Object.entries(assets)){asset.version=createHash('sha256').update('identity-v1\0').update(Buffer.from(asset.data,'base64')).digest('hex').slice(0,16);if(url!=='/index.html')versions[url.slice(1)]=url.slice(1)+'?v='+asset.version;}
let html=Buffer.from(assets['/index.html'].data,'base64').toString('utf8');
html=html.replace(/(src|href)="([^"?]+)"/g,(all,attribute,url)=>versions[url]?attribute+'="'+versions[url]+'"':all);
html=html.replace('<script src="startup.js','<script>window.REALM_ASSET_VERSIONS='+JSON.stringify(versions)+';</script><script src="startup.js');
assets['/index.html'].data=Buffer.from(html).toString('base64');
assets['/index.html'].version=createHash('sha256').update(html).digest('hex').slice(0,16);
// Return ordinary bodies. Cloudflare owns transport compression; pre-gzipping
// here with an automatic Response caused a second compression pass, leaving
// gzip bytes on screen after the browser decoded the outer response.
const api=fs.readFileSync('worker/api.js','utf8');
const server=api+'\nconst assets='+JSON.stringify(assets)+';\n'+`export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname==='/api/players')return handlePlayers(request,env);if(url.pathname==='/api/character')return handleSave(request,env);if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const asset=assets[url.pathname==='/'?'/index.html':url.pathname];if(!asset)return new Response('Not found',{status:404});const version=url.searchParams.get('v');if(version&&version!==asset.version)return new Response('Game updated. Reload to continue.',{status:409,headers:{'Cache-Control':'no-store'}});const headers={'Content-Type':asset.mime,'Cache-Control':version?'public, max-age=31536000, immutable':'no-cache','ETag':'"'+asset.version+'"','X-Content-Type-Options':'nosniff'};if(request.headers.get('If-None-Match')===headers.ETag)return new Response(null,{status:304,headers});let data=null;if(request.method!=='HEAD'){const binary=atob(asset.data);data=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)data[i]=binary.charCodeAt(i);}return new Response(data,{headers});}};`;
fs.mkdirSync('dist/server',{recursive:true});fs.writeFileSync('dist/server/index.js',server);fs.mkdirSync('dist/.openai',{recursive:true});fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');fs.cpSync('drizzle','dist/.openai/drizzle',{recursive:true});console.log('Built character-save Worker and '+Object.keys(assets).length+' game assets; '+Math.round(server.length/1024)+' KiB module.');
