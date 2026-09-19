// Recover genuine current meshes, rigs, fitted equipment and animation data.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {ctx,vm}=require('./content-fixture.cjs');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'.qa/migration/capture'),entries=[];
function encode(_,v){return ArrayBuffer.isView(v)?{typed:v.constructor.name,base64:Buffer.from(v.buffer,v.byteOffset,v.byteLength).toString('base64')}:v;}
ctx.captureAsset=(group,name,value,source)=>{
 const id='veldren:'+group+':'+name,file=group+'/'+name.replace(/[^a-zA-Z0-9_.-]/g,'_')+'.json';
 if(entries.some(e=>e.id===id||e.file===file))throw Error('Asset ID collision '+id);
 const bytes=JSON.stringify({id,name,group,...value,source},encode)+'\n',target=path.join(out,file);
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
 entries.push({id,name,group,file,source,captureSha256:crypto.createHash('sha256').update(bytes).digest('hex')});
};
vm.runInContext(`
for(const [name,mesh]of Object.entries(rebuiltModels))captureAsset('environment',name,{mesh},{file:'dist/assets/realms/models.js',key:'models.'+name});
for(const [name]of Object.entries(briarModels))for(const race of ['human','elf','dwarf'])captureAsset('kaykit-adapted',name+'-'+race,{mesh:realmArtMesh(name,race)},{file:'dist/assets/briarhaven/models.js',key:name,adaptation:race});
for(const [sex,asset]of Object.entries(rebuiltAvatars)){
 const clips={...asset.clips};
 for(const name of ['staffIdle','idle','walk','run']){
  const original=asset.clips[name],m=new Float32Array(original.frames*asset.count*12);
  for(let f=0;f<original.frames;f++)m.set(realmSkeletonPose(asset,name,f,1,'idle',0,true),f*asset.count*12);
  clips[name==='staffIdle'?name:name+'_staff']={...original,trs:null,m,adaptation:'realmSkeletonPose holdStaff=true'};
 }
 captureAsset('characters',sex,{...asset,clips},{file:'dist/assets/realms/models.js',key:'avatars.'+sex});
 for(const name of Object.keys(REALM_MODELS.armor[sex])){
  captureAsset('equipment-authored-'+sex,name,{mesh:rebuiltMesh(REALM_MODELS.armor[sex][name]),rigAsset:'veldren:characters:'+sex},{file:'dist/assets/realms/models.js',key:'armor.'+sex+'.'+name});
  const mesh=modularMesh(sex,name);if(mesh)captureAsset('equipment-fitted-'+sex,name,{mesh,rigAsset:'veldren:characters:'+sex},{file:'dist/realms-rebuilt.js',key:'modularMesh',sourceKey:name});
 }
 for(const [id,item]of Object.entries(ITEMS)){
  const model=modularModel(id);if(!model)continue;
  const mesh=wornModularMesh(sex,id);if(!mesh)continue;
  captureAsset('items-'+sex,id,{mesh,rigAsset:'veldren:characters:'+sex,itemId:id,slot:item.slot,attachment:['weapon','shield'].includes(item.slot)?item.slot==='weapon'?'right':'left':null},{file:'dist/realms-rebuilt.js',key:'wornModularMesh',model,itemId:id});
 }
}
for(const [name,asset]of Object.entries(creatureAssets))captureAsset('creatures',name,asset,{file:name in REALM_CREATURES?'dist/assets/realms/monsters.js':'dist/assets/realms/approved-creatures.js',key:name,provenance:asset.source});
for(const [name,asset]of Object.entries(briarRigs))captureAsset('kaykit-legacy-rigs',name,asset,{file:'dist/assets/briarhaven/models.js',key:'rigs.'+name,limitation:'Flat pose palettes; original hierarchy is absent from this bundle.'});
for(const id of new Set([...Object.keys(ITEMS),'coins'])){
 const visual=itemVisual(id);if(!visual)continue;
 const data=visual.mesh.packed,count=data.length/12,p=new Float32Array(count*3),n=new Float32Array(count*3),c=new Float32Array(count*3);
 for(let v=0;v<count;v++){p.set(data.subarray(v*12,v*12+3),v*3);n.set(data.subarray(v*12+3,v*12+6),v*3);c.set(data.subarray(v*12+6,v*12+9),v*3);}
 captureAsset('item-display',id,{mesh:{p,n,c,f:c,t:new Uint8Array(count).fill(12),i:Uint32Array.from({length:count},(_,i)=>i)},itemId:id,displayOnly:true,worldDisplaySize:visual.size,lie:visual.lie},{file:'dist/item-models.js',key:'itemVisual',itemId:id});
}
for(const sex of ['male','female'])for(let skin=0;skin<APPEARANCE_SKINS.length;skin++){
 const appearance={frame:sex==='female'?1:0,skin,topColor:skin%APPEARANCE_COLORS.length,bottomColor:5,topStyle:skin%3,bottomStyle:skin%2};
 captureAsset('appearance-presets',sex+'-skin-'+skin,{mesh:avatarMaterial(sex,{_appearance:appearance},0),rigAsset:'veldren:characters:'+sex,appearance},{file:'dist/realms-rebuilt.js',key:'avatarMaterial',note:'Representative presets; not all possible character appearances.'});
}
`,ctx,{timeout:180000});
fs.writeFileSync(path.join(out,'index.json'),JSON.stringify({entries},null,2)+'\n');
console.log('Captured '+entries.length+' individual assets');
