const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('client/world.js','utf8'),helpers=source.slice(source.indexOf('function worldCycleSeconds('),source.indexOf('function livingWorld('));
function client(skew,saved){const ctx=vm.createContext({localNow:120000+skew,sharedOffset:-skew,s:{worldClock:saved}});vm.runInContext('Date.now=()=>localNow;function sharedNow(){return Date.now()+sharedOffset;}'+helpers,ctx);return ctx;}
const a=client(3600000,10),b=client(-7200000,400);
for(const offset of [0,260000,480000,86400000]){a.localNow=120000+3600000+offset;b.localNow=120000-7200000+offset;assert.equal(vm.runInContext('worldHour()',a),vm.runInContext('worldHour()',b));}
a.localNow=120000+3600000;assert.equal(vm.runInContext('worldHour()',a),10);a.localNow+=260000;assert.equal(vm.runInContext('worldHour()',a),23);vm.runInContext('s.worldClock=0',a);assert.equal(vm.runInContext('worldHour()',a),23,'reloading an old save cannot change the sky');
for(const file of ['client/world.js','client/view3d.js','client/renderer-gl.js','client/world-lighting.js'])assert(!fs.readFileSync(file,'utf8').includes('s.worldClock/480'),'every sky, light and ambient sound reads shared time');
console.log('PASS: identical day/night phase across different device clocks and saved playtimes, continued time during paused play, and consistent lighting/rendering sources.');
