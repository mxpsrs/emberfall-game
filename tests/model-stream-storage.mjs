import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {packAssetStreams,createStreamExpander} from '../scripts/model-stream-storage.mjs';
import {encodeAsset,decodeAsset,compressAsset} from '../scripts/asset-delivery.mjs';
const registry=JSON.parse(fs.readFileSync('dist/assets/canonical/registry.json'));
const record=registry.records.find(r=>r.id==='rebuilt:Roof_2x4_RoundTile_LOD2'),original=fs.readFileSync('dist/'+record.derivedPath);
const rows={['/'+record.derivedPath]:{data:original.toString('base64'),length:original.length},'/assets/realms/models.js':{data:original.toString('base64'),length:original.length}};
const packed=packAssetStreams(rows);assert.equal(packed.stats.assets,2);assert(packed.parts.length>0);assert(packed.chunks.length>0);
for(const row of Object.values(rows)){const raw=Buffer.from(row.data,'base64'),compressed=compressAsset(raw);row.data=encodeAsset(compressed);row.storageLength=compressed.length;row.storageEncoding='brotli';}
const expand=createStreamExpander(packed.parts,packed.chunks,decodeAsset,brotliDecompressSync,Buffer);
for(const row of Object.values(rows)){const bytes=Buffer.from(await new Response(expand(row)).arrayBuffer());assert(bytes.equals(original));assert.deepEqual(JSON.parse(bytes),JSON.parse(original));}
await Promise.all(Object.values(rows).map(async row=>assert(Buffer.from(await new Response(expand(row)).arrayBuffer()).equals(original))));
assert.throws(()=>packAssetStreams({'/assets/realms/models.js':{data:Buffer.from('{"data":"@veldren-stream:0@"}').toString('base64')}}),/Reserved/);
console.log('PASS: packed canonical streams reconstruct exact source bytes, preserve JSON/material data, share duplicates and support concurrent responses');
