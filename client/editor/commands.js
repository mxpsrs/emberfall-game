'use strict';
// UI command dispatch. Canonical data, mutation, history and rollback stay in C++.
(function(root){
 function createVeldrenEditorCommands(native,currentScene,onChange=()=>{}){
  const dirty=new Map();let transactionScene=null,blocked=false;
  function send(request){if(blocked&&!['status','markSaved'].includes(request.action))throw Error('Wait for Save World verification to finish');const scene=transactionScene||String(currentScene()),result=native.command(scene,request);dirty.set(scene,result.dirty);onChange({scene,...result,dirty:[...dirty.values()].some(Boolean)});return result;}
  function execute(label,operations){return send({action:'execute',label,operations});}
  function begin(label){if(transactionScene)throw Error('Finish the current editor gesture');const scene=String(currentScene());const result=send({action:'begin',label});transactionScene=scene;return result;}
  function finish(action){try{return send({action});}finally{transactionScene=null;}}
  return Object.freeze({execute,begin,block(value){blocked=!!value;},commit:()=>finish('commit'),cancel:()=>finish('cancel'),
   undo:()=>send({action:'undo'}),redo:()=>send({action:'redo'}),status:()=>send({action:'status'}),
   saved(){if(transactionScene)throw Error('Finish the current editor gesture before saving');for(const scene of dirty.keys()){native.command(scene,{action:'markSaved'});dirty.set(scene,false);}return send({action:'markSaved'});},
   transaction(label,callback){begin(label);try{const value=callback();if(value&&typeof value.then==='function')throw Error('Editor transactions must be synchronous');finish('commit');return value;}catch(error){finish('cancel');throw error;}},
   get dirty(){return [...dirty.values()].some(Boolean)},get active(){return !!transactionScene}
  });
 }
 root.createVeldrenEditorCommands=createVeldrenEditorCommands;
})(globalThis);
