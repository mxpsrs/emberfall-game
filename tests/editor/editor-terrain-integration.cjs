// The editor now requires canonical C++ ownership. The former native-disabled
// v1 mock cannot exercise its command history or v2 persistence contract.
// Actual pointer/UI, scene selection and Worker save/reload are covered by
// scripts/qa/phase3-terrain-play-browser.mjs against the populated built editor.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const result=spawnSync(process.execPath,[path.join(__dirname,'editor-terrain-history.mjs')],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
