import {maintenanceState} from './maintenance.js';

// Match the multiplayer presence window; one row represents one character,
// regardless of scene or number of browser tabs. Never expose player details.
export async function handleStatus(request,env){
 const headers={'Cache-Control':'no-store','Allow':'GET, HEAD'};
 const reply=(data,status=200)=>new Response(request.method==='HEAD'?null:JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json'}});
 if(!['GET','HEAD'].includes(request.method))return reply({error:'Method not allowed'},405);
 try{
  const maintenance=await maintenanceState(env);
  const row=await env.DB.prepare('SELECT COUNT(*) AS count FROM player_presence WHERE seen_at > ?').bind(maintenance.serverTime-12000).first();
  return reply({status:maintenance.status==='locked'?'maintenance':'online',players:maintenance.status==='locked'?0:Number(row.count),maintenanceAt:maintenance.status==='countdown'?maintenance.kickAt:null,checkedAt:maintenance.serverTime});
 }catch{return reply({status:'offline',players:null,maintenanceAt:null,checkedAt:Date.now()},503);}
}
