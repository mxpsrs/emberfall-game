import assert from 'node:assert/strict';
import {questFightVisible} from '../worker/quest-fights.js';
import fs from 'node:fs';
import vm from 'node:vm';
// Load the exact browser definition, not a test copy.
const source=fs.readFileSync('dist/world.js','utf8');
const browser=vm.runInNewContext(source.slice(source.indexOf('function questFightVisible'),source.indexOf("let currentScene="))+';questFightVisible');
const cases=[
 [{mainStoryStage:4},{mainStoryQuest:{stage:4}},true],
 [{mainStoryStage:4},{mainStoryQuest:{stage:5}},false],
 [{mainStoryStage:22},{mainStoryQuest:{stage:22}},true],
 [{mainStoryStage:22},{mainStoryQuest:{stage:23}},false],
 [{kind:'mountainwatcher'},{mountainQuest:{stage:6}},true],
 [{kind:'mountainwatcher'},{mountainQuest:{stage:7}},false],
 [{encounter:'veyr'},{mountainQuest:{stage:17}},true],
 [{encounter:'veyr'},{mountainQuest:{stage:18}},false],
 [{encounter:'veyr'},{mountainQuest:{stage:20},questRematch:'veyr'},true],
 [{kind:'king'},{boss:false},true],[{kind:'king'},{boss:true},false],
 [{kind:'sentinel'},{frontier:{quest:3,accepted:true,kills:0}},true],
 [{kind:'sentinel'},{frontier:{quest:3,accepted:true,kills:1}},false],
 [{kind:'sentinel'},{frontier:{quest:4}},false],
 [{kind:'ridgewolf'},{frontier:{quest:4}},true],
 [{type:'questgiver'},{mainStoryQuest:{stage:25},mountainQuest:{stage:20}},true],
];
for(const [o,s,expected]of cases){assert.equal(questFightVisible(o,s),expected,JSON.stringify([o,s]));assert.equal(browser(o,s),expected);}
console.log('PASS: identical server/browser phase rules for every quest fight, opt-in Veyr rematch, ordinary wildlife and questgivers retained.');
