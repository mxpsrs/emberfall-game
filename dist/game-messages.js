'use strict';
const pendingGameMessages=[],gameMessageRows=new Map();
let lastGameMessage='',lastGameMessageAt=0;
function gameMessage(text,{key='',action=null,service=false}={}){
 text=String(text||'').trim();if(!text)return;
 if(typeof addChatLine!=='function'){pendingGameMessages.push([text,{key,action,service}]);return;}
 if(key){const row=gameMessageRows.get(key);if(row?.isConnected){row.textContent=text;return;}}
 const now=Date.now();if(!key&&text===lastGameMessage&&now-lastGameMessageAt<1200)return;lastGameMessage=text;lastGameMessageAt=now;
 const row=addChatLine(text,'game',action);if(service)row.classList.add('service-message');if(key)gameMessageRows.set(key,row);
}
function flushGameMessages(){for(const [text,options]of pendingGameMessages.splice(0))gameMessage(text,options);}
