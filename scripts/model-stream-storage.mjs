import {compressAsset,encodeAsset} from './asset-delivery.mjs';

// Storage-only packing. The response keeps its original bytes, hash and URL;
// neither the canonical importer nor the browser mesh format changes.
export function packAssetStreams(assets){
 const marker='@veldren-stream:',parts=[],chunks=[],lookup=new Map();let buffers=[],chunkBytes=0,originalBytes=0,packetBytes=0,packedAssets=0;
 function finish(){if(!chunkBytes)return;const raw=Buffer.concat(buffers),compressed=compressAsset(raw);chunks.push({data:encodeAsset(compressed),storageLength:compressed.length,length:raw.length});buffers=[];chunkBytes=0;}
 for(const [path,asset]of Object.entries(assets)){
  if(!/^\/assets\/(?:canonical\/models\/.*\.json|(?:realms|briarhaven)\/(?:models|monsters|approved-creatures)\.js)$/.test(path))continue;
  const original=Buffer.from(asset.data,'base64'),text=original.toString('utf8');if(text.includes(marker))throw Error('Reserved stream marker in '+path);
  let replacements=0;
  const packet=text.replace(/("(?:data|p|n|uv|t|i|c|f|j|w)"\s*:\s*")([A-Za-z0-9+/=]{1024,})(")/g,(_match,prefix,value,suffix)=>{
   let id=lookup.get(value);
   if(id===undefined){const raw=Buffer.from(value,'base64');if(raw.toString('base64')!==value)throw Error('Noncanonical binary stream in '+path);
    if(chunkBytes&&chunkBytes+raw.length>2*1024*1024)finish();id=parts.length;lookup.set(value,id);parts.push([chunks.length,chunkBytes,raw.length]);buffers.push(raw);chunkBytes+=raw.length;
   }
   replacements++;return prefix+marker+id+'@'+suffix;
  });
  if(!replacements)continue;
  asset.data=Buffer.from(packet).toString('base64');asset.packedStreams=true;packedAssets++;originalBytes+=original.length;packetBytes+=Buffer.byteLength(packet);
 }
 finish();return {parts,chunks,stats:{assets:packedAssets,parts:parts.length,chunks:chunks.length,originalBytes,packetBytes,compressedStreamBytes:chunks.reduce((n,c)=>n+c.storageLength,0)}};
}

// Emit one original prefix and one binary field at a time. Only four decoded
// chunks are retained; a 30 MiB catalog never needs a second full text buffer.
export function createStreamExpander(parts,chunks,decodeAsset,inflate,BufferType){
 const cache=new Map(),decoder=new TextDecoder(),encoder=new TextEncoder();
 function chunk(index){
  if(cache.has(index)){const value=cache.get(index);cache.delete(index);cache.set(index,value);return value;}
  const record=chunks[index];if(!record)throw Error('Missing asset stream chunk');
  const value=inflate(decodeAsset(record.data,record.storageLength),{maxOutputLength:record.length});if(value.length!==record.length)throw Error('Invalid asset stream chunk');
  cache.set(index,value);if(cache.size>4)cache.delete(cache.keys().next().value);return value;
 }
 return function expand(asset){
  let packet=decodeAsset(asset.data,asset.storageLength);if(asset.storageEncoding==='brotli')packet=inflate(packet,{maxOutputLength:asset.length});
  const text=decoder.decode(packet),pattern=/@veldren-stream:(\d+)@/g;let cursor=0;
  return new ReadableStream({pull(controller){
   const match=pattern.exec(text);
   if(!match){if(cursor<text.length)controller.enqueue(encoder.encode(text.slice(cursor)));controller.close();return;}
   if(match.index>cursor)controller.enqueue(encoder.encode(text.slice(cursor,match.index)));
   const part=parts[Number(match[1])];if(!part)throw Error('Missing binary asset stream');const raw=chunk(part[0]);
   if(part[1]+part[2]>raw.length)throw Error('Invalid binary asset stream range');
   controller.enqueue(encoder.encode(BufferType.from(raw.buffer,raw.byteOffset+part[1],part[2]).toString('base64')));cursor=match.index+match[0].length;
  }});
 };
}
