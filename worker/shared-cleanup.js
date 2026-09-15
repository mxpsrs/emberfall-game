// A single bounded sweep per second can retire 256 transient effects and
// 256 durable receipts. Never discard unacknowledged rewards/hits.
// The DB lease coordinates isolates; this local timestamp only avoids lease traffic.
const nextSweep=new WeakMap();
export async function cleanupSharedHistory(db,now){
 if(now<(nextSweep.get(db)||0))return;
 nextSweep.set(db,now+1000);
 const lease=await db.prepare("INSERT INTO shared_clocks (id,ready_at,nonce) VALUES ('history-cleanup',?,'') ON CONFLICT(id) DO UPDATE SET ready_at=excluded.ready_at WHERE shared_clocks.ready_at<=? RETURNING id").bind(now+1000,now).first();
 if(!lease)return;
 await db.batch([
  db.prepare("DELETE FROM shared_events WHERE id IN (SELECT id FROM shared_events WHERE kind IN ('activity','enemyAction') AND acked=1 AND created_at<? LIMIT 256)").bind(now-60000),
  db.prepare('DELETE FROM shared_objects WHERE id IN (SELECT id FROM shared_objects WHERE expires_at<? ORDER BY expires_at LIMIT 256)').bind(now-120000),
  db.prepare('DELETE FROM shared_events WHERE id IN (SELECT id FROM shared_events WHERE acked=1 AND created_at<? ORDER BY created_at LIMIT 256)').bind(now-86400000)
 ]);
}
