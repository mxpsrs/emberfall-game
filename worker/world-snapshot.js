export async function readWorldSnapshot(db, names, scope, scene, actor, now, treeRegion2) {
  const result = await db.prepare(`SELECT
  (SELECT json_group_array(json_object('entity_id',entity_id,'state',state,'revision',revision)) FROM shared_entities WHERE id IN (SELECT value FROM json_each(?))) AS entities,
  (SELECT json_group_array(json_object('id',id,'kind',kind,'payload',payload,'expires_at',expires_at,'revision',revision)) FROM shared_objects WHERE scope=? AND scene=? AND expires_at>?) AS objects,
  (SELECT json_group_array(result) FROM (SELECT result FROM shared_events WHERE scope=? AND actor=? AND acked=0 ORDER BY created_at LIMIT 128)) AS receipts,
  (SELECT json_group_array(json_object('id',id,'actor',actor,'kind',kind,'result',result,'created_at',created_at)) FROM (SELECT id,actor,kind,result,created_at FROM shared_events WHERE scope=? AND scene=? AND created_at>=? AND kind IN ('activity','enemyAction','hit','enemyHit','companion') ORDER BY created_at DESC LIMIT 128)) AS effects,
  (SELECT json_group_array(json_object('entity_id',entity_id,'state',state,'revision',revision)) FROM shared_entities WHERE scope=? AND scene=? AND json_extract(state,'$.hp')=0 AND (json_extract(state,'$.deadUntil')>0 OR json_extract(state,'$.generation')>1) AND json_extract(state,'$.x') BETWEEN ? AND ? AND json_extract(state,'$.y') BETWEEN ? AND ?) AS treeRows
 `).bind(JSON.stringify(names), scope, scene, now, scope, actor, scope, scene, now - 6e3, scope, scene, treeRegion2.x - treeRegion2.radius, treeRegion2.x + treeRegion2.radius, treeRegion2.y - treeRegion2.radius, treeRegion2.y + treeRegion2.radius).all();
  const row = result.results[0], meta = result.meta;
  if (meta && (meta.duration > 100 || meta.rows_read > 5e3)) console.warn("world_snapshot_database_pressure", { durationMs: meta.duration, rowsRead: meta.rows_read, rowsWritten: meta.rows_written });
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, JSON.parse(value)]));
}
