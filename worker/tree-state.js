import catalog from './shared-catalog.json' with {type:'json'};
export function treeRegion(input) {
  return { scene: input.scene, x: Math.floor(input.x / 32) * 32 + 16, y: Math.floor(input.y / 32) * 32 + 16, radius: 160 };
}
export function treeView(rows, input, now) {
  const region = treeRegion(input), states = [];
  for (const row of rows) {
    const e = catalog.entities[input.scene + ":" + row.entity_id];
    if (e?.type !== "tree" || Math.abs(e.x - region.x) > region.radius || Math.abs(e.y - region.y) > region.radius) continue;
    const v = JSON.parse(row.state), moved = v.x !== e.x || v.y !== e.y, expired = !!v.deadUntil && v.deadUntil <= now, dead = moved || expired ? 0 : v.deadUntil || 0;
    states.push([e.id, v.generation + (moved || expired ? 1 : 0), dead, dead ? dead - Math.min(2e3, e.respawn * 0.2) : 0, row.revision + (moved || expired ? 1 : 0)]);
  }
  states.sort((a, b) => a[0].localeCompare(b[0]));
  let hash2 = 2166136261;
  for (const c of JSON.stringify(states)) hash2 = Math.imul(hash2 ^ c.charCodeAt(0), 16777619);
  const key = region.scene + ":" + region.x + ":" + region.y + ":" + (hash2 >>> 0);
  return input.world?.treeKey === key ? null : { ...region, key, at: now, states };
}
