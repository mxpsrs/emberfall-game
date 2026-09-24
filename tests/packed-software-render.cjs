const {ctx,vm}=require('../scripts/game-fixture.cjs');
vm.runInContext(`
const faces=[],r={face:(...args)=>faces.push(args)},matrix=briarTransform(4,2,6,2,Math.PI/2);
const data=[];flatFaceData(data,[[0,0,0],[1,0,0],[0,1,0]],'#804020',[[0,0,1],[0,0,1],[0,0,1]],5);
const packed={packed:new Float32Array(data)};briarEmit(r,packed,matrix);
assert.equal(faces.length,1);assert.equal(faces[0][3],5);
assert.deepEqual(faces[0][0][0],[4,2,6]);assert(Math.abs(faces[0][0][1][2]-4)<.00001);
assert(faces[0][0].flat().every(Number.isFinite));assert(faces[0][2].flat().every(Number.isFinite));
const ordinary={p:new Float32Array([0,0,0,1,0,0,0,1,0]),n:new Float32Array([0,0,1,0,0,1,0,0,1]),c:new Float32Array(9).fill(.5),i:new Uint16Array([0,1,2])};briarEmit(r,ordinary,matrix);assert.equal(faces.length,2);
let uploaded=null;briarEmit({indexed:(mesh,m)=>uploaded=[mesh,m]},packed,matrix);assert.equal(uploaded[0],packed);assert.equal(uploaded[1],matrix);
console.log('PASS: packed procedural triangles render through software/picking painters with transformed positions, normals and material; indexed GPU path preserved.');
`,ctx);
