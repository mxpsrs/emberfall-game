import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {once} from 'node:events';

// Serialize local GPU checks so competing browsers do not distort captures.
// flock releases automatically if the parent exits, including an interrupted run.
export async function acquireBriarBrowserLock(){
 mkdirSync('.qa',{recursive:true});
 const child=spawn('flock',['-x',resolve('.qa/briar-browser.lock'),'sh','-c',"printf 'LOCKED\\n'; cat >/dev/null"],{stdio:['pipe','pipe','inherit']});
 await new Promise((ready,fail)=>{child.once('error',fail);child.once('exit',code=>fail(Error('Graphics lock ended before acquisition: '+code)));child.stdout.once('data',ready);});
 let closed=false;
 return async()=>{if(closed)return;closed=true;const exited=once(child,'exit');child.stdin.end();await exited;};
}
