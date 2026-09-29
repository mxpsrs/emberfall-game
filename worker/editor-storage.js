// Keep the full generated Scene document recoverable without oversized DB rows.
// Two chunk banks retain current and previous revisions inside one transaction.
export const MAX_WORLD_BYTES=32*1024*1024;
const CHUNK_BYTES=256*1024,INLINE_BYTES=512*1024,BANK_SIZE=256,FORMAT='veldren.world.chunks';
const encoder=new TextEncoder(),digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
const error=message=>Object.assign(Error(message),{status:413});
async function bounded(stream,limit){const reader=stream.getReader(),parts=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw error('World document exceeds its storage limit');parts.push(value);}}finally{await reader.cancel();}const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return bytes;}
function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
export async function encodeWorld(world){
 const text=JSON.stringify(world),bytes=encoder.encode(text);if(bytes.length>MAX_WORLD_BYTES)throw error('Editor save exceeds 32 MB');
 if(bytes.length<=INLINE_BYTES)return {document:text,chunks:[]};
 const zipped=await bounded(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip')),MAX_WORLD_BYTES+65536),encoded=base64(zipped),chunks=[];
 const bank=2+(world.revision%2)*BANK_SIZE;for(let i=0;i<encoded.length;i+=CHUNK_BYTES)chunks.push({id:bank+chunks.length,text:encoded.slice(i,i+CHUNK_BYTES)});
 if(chunks.length>BANK_SIZE)throw error('World document exceeds the chunk limit');
 return {document:JSON.stringify({format:FORMAT,version:1,revision:world.revision,updatedAt:world.updatedAt,bytes:bytes.length,sha256:await digest(bytes),chunks:chunks.map(c=>c.id)}),chunks,bank};
}
export async function decodeWorld(document,db){
 const record=typeof document==='string'?JSON.parse(document):document;if(record?.format!==FORMAT)return record;
 if(record.version!==1||!Number.isSafeInteger(record.bytes)||record.bytes<0||record.bytes>MAX_WORLD_BYTES||!Array.isArray(record.chunks)||!record.chunks.length||record.chunks.length>BANK_SIZE)throw Error('Invalid world chunk manifest');
 const bank=2+(record.revision%2)*BANK_SIZE;
 if(record.chunks.some((id,i)=>id!==bank+i))throw Error('Invalid world chunk bank');
 const parts=await Promise.all(record.chunks.map(async id=>{const row=await db.prepare('SELECT revision,document FROM editor_world WHERE id=?').bind(id).first();if(!row||row.revision!==record.revision||typeof row.document!=='string'||row.document.length>CHUNK_BYTES)throw Error('Missing or inconsistent world chunk');return row.document;}));
 const binary=atob(parts.join('')),compressed=Uint8Array.from(binary,c=>c.charCodeAt(0));
 const bytes=await bounded(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')),MAX_WORLD_BYTES);
 if(bytes.length!==record.bytes||await digest(bytes)!==record.sha256)throw Error('World document checksum mismatch');
 const world=JSON.parse(new TextDecoder().decode(bytes));if(world.revision!==record.revision)throw Error('World revision mismatch');return world;
}
export async function saveWorld(db,data,current,owner,expectedRevision){
 const packed=await encodeWorld(data),previous=JSON.stringify(current);
 const statements=[];
 // Each statement is guarded as well as the final CAS, so a losing writer
 // cannot overwrite either referenced bank. DB.batch commits atomically.
 const guard='COALESCE((SELECT revision FROM editor_world WHERE id=1),?)=?';
 for(const chunk of packed.chunks)statements.push(db.prepare(`INSERT INTO editor_world (id,revision,document,previous_document,updated_by) SELECT ?,?,?,NULL,? WHERE ${guard} ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,document=excluded.document,updated_by=excluded.updated_by WHERE ${guard}`).bind(chunk.id,data.revision,chunk.text,owner,current.revision,expectedRevision,current.revision,expectedRevision));
 if(packed.chunks.length)statements.push(db.prepare(`DELETE FROM editor_world WHERE id>=? AND id<? AND ${guard}`).bind(packed.bank+packed.chunks.length,packed.bank+BANK_SIZE,current.revision,expectedRevision));
 // The seed fits inline. Existing snapshots always come from the stored row,
 // retaining a previous chunk manifest without duplicating the document.
 const fallback=encoder.encode(previous).length<=INLINE_BYTES?previous:null;
 const commit=db.prepare('INSERT INTO editor_world (id,revision,document,previous_document,updated_by) VALUES (1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,document=excluded.document,previous_document=editor_world.document,updated_by=excluded.updated_by WHERE editor_world.revision=?').bind(data.revision,packed.document,fallback,owner,expectedRevision);
 if(!statements.length)return commit.run();
 statements.push(commit);const results=await db.batch(statements);return results.at(-1);
}
