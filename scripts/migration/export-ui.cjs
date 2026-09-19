const {ctx,vm,fs}=require('./content-fixture.cjs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'assets/ui/icons');fs.mkdirSync(out,{recursive:true});
const records=[];ctx.saveIcon=(id,svg)=>{const file=path.join(out,id+'.svg');fs.writeFileSync(file,svg+'\n');records.push({id:'veldren:ui:'+id,path:path.relative(root,file).split(path.sep).join('/'),sha256:crypto.createHash('sha256').update(svg+'\n').digest('hex'),source:'dist/game-icons.js',licenseEvidence:'art/ui-icons/manifest.json'});};
vm.runInContext("for(const name of Object.keys(GAME_ICON_DEFS))saveIcon(name,gameIcon(name));for(const [id,spell]of Object.entries(SPELLS))saveIcon('spell-'+id,gameSpellIcon(spell));",ctx);
for(const file of ['music-sources.json','sound-sources.json'])fs.copyFileSync(path.join(root,'docs',file),path.join(root,'assets/licenses',file));
fs.copyFileSync(path.join(root,'art/ui-icons/manifest.json'),path.join(root,'assets/licenses/ui-icons-manifest.json'));
fs.writeFileSync(path.join(root,'migration/reports/ui-art.json'),JSON.stringify({assets:records,nativeUIImplemented:false},null,2)+'\n');console.log('Exported '+records.length+' standalone SVG icons');
