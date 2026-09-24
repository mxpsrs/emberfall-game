import {rollRareBossLoot} from './boss-loot.js';
import {questFightVisible} from './quest-fights.js';
import {readWorldSnapshot} from './world-snapshot.js';
import {advanceNpc,npcLineOfSight} from './npc-simulation.js';
import catalog from './shared-catalog.json' with {type:'json'};
import {cleanupSharedHistory} from './shared-cleanup.js';
import {fieldEquipmentEffects,fieldSpellFailure,relicOperation} from './field-rules.js';
import {treeRegion,treeView} from './tree-state.js';
var enc = JSON.stringify;
var parse = JSON.parse;
var sceneEntities = /* @__PURE__ */ new Map();
for (const e of Object.values(catalog.entities)) {
  if (!sceneEntities.has(e.scene)) sceneEntities.set(e.scene, []);
  sceneEntities.get(e.scene).push(e);
}
var point = (x, y) => Number.isFinite(x) && Number.isFinite(y);
var near = (a, b, r) => point(a.x, a.y) && Math.hypot(a.x - b.x, a.y - b.y) <= r;
var token = (v) => typeof v === "string" && /^[a-zA-Z0-9_:-]{1,100}$/.test(v);
var styles = ["melee", "ranged", "magic"];
function level(s2, k) {
  const xp = Math.max(0, Number(s2.xp?.[k]) || 0);
  if (k === "Worship") return Math.min(99, 1 + Math.floor(Math.sqrt(xp / 35)));
  let n = 1;
  while (n < 99 && xp >= catalog.xp[n + 1]) n++;
  return n;
}
function gear(s2) {
  return Object.values(s2.equipment || {}).map((id) => catalog.items[id]).filter(Boolean);
}
function bonus(s2, key) {
  return gear(s2).reduce((n, item) => n + (item[key] || 0), 0) + (fieldEquipmentEffects(s2)[key] || 0);
}
function chance(attack, defense) {
  return attack > defense ? 1 - (defense + 2) / (2 * (attack + 1)) : attack / (2 * (defense + 1));
}
function rollHit(s2, e, style, event = {}, now = Date.now()) {
  const focus = s2[style + "Training"] || "balanced", skill = style === "melee" ? "Attack" : style === "ranged" ? "Ranged" : "Magic";
  const aim = style === "magic" ? bonus(s2, "magicAccuracy") + (s2.equipment?.weapon === "veyrOrb" && e.memoryFrayUntil > now ? catalog.items.veyrOrb.memoryFray : 0) : style === "ranged" ? (catalog.items[s2.equipment?.weapon]?.attackBonus || 0) + bonus(s2, "rangedAccuracy") : bonus(s2, "attackBonus");
  const a = (level(s2, skill) + 8 + (focus === "accurate" ? 3 : focus === "balanced" ? 1 : 0)) * (64 + aim), d = (e.defenseLevel + 9) * 64 * (e.weak === style ? 0.8 : 1);
  let max;
  if (style === "magic") {
    const spell = catalog.spells[s2.spell] || catalog.spells.windStrike || Object.values(catalog.spells)[0];
    if (level(s2, "Magic") < spell.level) return 0;
    max = spell.power;
  } else {
    const effective = level(s2, style === "ranged" ? "Ranged" : "Strength") + 8 + (focus === "aggressive" || focus === "focused" ? 3 : focus === "balanced" ? 1 : 0), strength = style === "ranged" ? catalog.items[s2.equipment?.ammo]?.rangedStrength || 7 : bonus(s2, "strengthBonus");
    max = Math.max(style === "ranged" ? 2 : 1, Math.floor(0.5 + effective * (strength + 64) / 640));
  }
  if (e.type === "dummy") return Math.max(1, Math.floor(Math.random() * (max + 1)));
  if (Math.random() >= chance(a, d)) return 0;
  return Math.max(style === "ranged" ? 1 : 0, Math.floor(Math.random() * (max + 1)));
}
function rollEnemy(s2, e, style) {
  const skill = style === "magic" ? level(s2, "Magic") * 0.7 + level(s2, "Defense") * 0.3 : level(s2, "Defense"), a = (e.attackLevel + 8) * 64, d = (skill + 8) * (64 + bonus(s2, "armor") + (style === "magic" ? bonus(s2, "magicDefense") : 0));
  const raw = Math.random() < chance(a, d) ? Math.floor(Math.random() * (e.maxHit + 1)) : 0;
  return raw >= 6 ? Math.max(0, raw - fieldEquipmentEffects(s2).guard) : raw;
}
export function publicAction(input, now) {
  const a = input.action;
  if (!a || typeof a !== "object" || !["combat", "gather", "work", "teleport"].includes(a.kind)) return null;
  if (!Number.isFinite(a.started) || a.started < now - 15e3 || a.started > now + 1500) return null;
  const allowedTools = ["axe", "pickaxe", "fishingRod", "fishingNet", "lobsterPot", "harpoon"];
  return { kind: a.kind, started: Math.min(now, a.started), duration: Math.max(200, Math.min(1e4, Number(a.duration) || 1200)), weapon: catalog.items[a.weapon]?.slot === "weapon" ? a.weapon : null, style: styles.includes(a.style) ? a.style : null, tool: allowedTools.includes(a.tool) ? a.tool : null, work: ["bury", "cook", "firemaking", "investigate", "repair", "ritual"].includes(a.work) ? a.work : null, type: ["tree", "ore", "fish"].includes(a.type) ? a.type : null, color: a.color === "purple" ? "purple" : a.color === "red" ? "red" : "green", target: point(a.target?.x, a.target?.y) && near(input, a.target, 20) ? { x: a.target.x, y: a.target.y, ...token(a.target.entity) && catalog.entities[input.scene + ":" + a.target.entity] ? { entity: a.target.entity } : {} } : null };
}
function initial(e, now, actor) {
  return { entity: e.id, hp: e.hp, maxhp: e.hp, x: e.x, y: e.y, generation: 1, deadUntil: 0, owner: e.hp ? "server" : actor, ownerUntil: now + 5e3, nextMove: now + (3 + Number(e.id) % 5) * 1e3, target: null, pose: null, hazard: null, phase: 0, move: 0, defender: null, returning: false, nextAttack: 0, opened: false, signature: [e.kind, e.hp, e.x, e.y, "server-v1"].join(":") };
}
export function lootFor(e) {
  const common = { ridgewolf: { fang: 2, bones: 1 }, sentinel: { bones: 4, runes: 20, ironSword: 1 }, wolf: { fang: 1, bones: 1 }, goblin: { bones: 1, arrows: 3 }, slime: { herbs: 1, runes: 2 }, skeleton: { bones: 2, runes: 3 }, bandit: { bones: 1, arrows: 5 }, rat: { bones: 1 }, man: { bones: 1 }, king: { bones: 3, runes: 15, ironHelm: 1 }, warden: { bones: 3, runes: 12, ironShield: 1 } };
  const rare = { ...e.rareDrops, ...e.level >= 48 ? { redLeatherCape: 512 } : {} };
  return e.type === "dummy" ? {} : { coins: e.coins, ...e.drops || common[e.kind] || { bones: 1 }, ...e.marks ? { huntersMark: e.marks } : {}, ...rollRareBossLoot(rare) };
}
async function cooldown(db, id, nonce, now, ms) {
  const r = await db.prepare("INSERT INTO shared_clocks (id,ready_at,nonce) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET ready_at=excluded.ready_at,nonce=excluded.nonce WHERE shared_clocks.ready_at<=? OR shared_clocks.nonce=excluded.nonce RETURNING nonce").bind(id, now + ms, nonce, now).first();
  return !!r;
}
async function reserveSwing(db, actor, s2, event, result, now) {
  if (!event.reserve) return true;
  const style = styles.includes(event.style) ? event.style : "melee", weapon = catalog.items[s2.equipment?.weapon];
  const interval = 0.6 * (style === "magic" ? 5 : weapon?.attackTicks || 4) * 1e3 - 150;
  if (!await cooldown(db, actor + ":attack", event.id, now, interval)) {
    const clock = await db.prepare("SELECT ready_at FROM shared_clocks WHERE id=?").bind(actor + ":attack").first();
    result.code = "attack_cooldown";
    result.readyAt = clock?.ready_at || now + interval;
    return false;
  }
  result.reserved = true;
  result.style = style;
  result.readyAt = now + interval;
  return true;
}
async function validSwingImpact(db, actor, event, style, result) {
  if (!token(event.swing) || event.id !== event.swing + "-hit") return false;
  const row = await db.prepare("SELECT result FROM shared_events WHERE id=? AND actor=? AND kind='attack'").bind(actor + ":" + event.swing, actor).first();
  if (!row) return false;
  const swing = parse(row.result);
  if (swing.code === "attack_cooldown") {
    result.code = swing.code;
    result.readyAt = swing.readyAt;
    return false;
  }
  return swing.ok && swing.reserved && swing.scene === event.scene && swing.entity === event.entity && swing.generation === event.generation && swing.style === style;
}
export async function syncSharedWorld(env, actor, s2, input, now, scope) {
  const db = env.DB, w = input.world;
  if (!w || w.protocol !== 1) return null;
  const scene = input.scene, entityKey = (id) => scope + ":" + scene + ":" + id, receiptKey = (id) => actor + ":" + id;
  const watch = [...new Set((Array.isArray(w.watch) ? w.watch : []).filter((id) => token(id)))].slice(0, 64);
  const requested = [...(Array.isArray(w.events) ? w.events : []).slice(0, 12).map((e) => e.entity), input.action?.target?.entity, ...watch].filter(token);
  const nearby2 = (sceneEntities.get(scene) || []).filter((e) => e.hp && near(input, e, 50) || e.door && near(input, e, 8));
  const definitions = [...new Map([...requested.map((id) => catalog.entities[scene + ":" + id]).filter((e) => e && near(input, e, 75)), ...nearby2].map((e) => [e.id, e])).values()].slice(0, 192);
  const activity = publicAction(input, now);
  if (activity) await db.prepare("INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) VALUES (?,?,?,?,?,?,?,1) ON CONFLICT DO NOTHING").bind(actor + ":activity:" + activity.kind + ":" + activity.started, scope, scene, actor, "activity", enc({ ...activity, x: input.x, y: input.y }), now).run();
  if (w.arrival && token(w.arrival)) {
    const permit = await db.prepare("SELECT result FROM shared_events WHERE id=? AND actor=? AND kind='teleport'").bind(receiptKey(w.arrival), actor).first();
    if (permit) {
      const p = parse(permit.result);
      if (p.ok && p.destination === scene && now >= p.arriveAt && near(input, { x: p.entry[0], y: p.entry[1] }, 5)) await db.prepare("INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) VALUES (?,?,?,?,?,?,?,1) ON CONFLICT DO NOTHING").bind(receiptKey(w.arrival) + ":arrival", scope, scene, actor, "arrival", enc({ permit: w.arrival, x: input.x, y: input.y, arrivedAt: now }), now).run();
    }
  }
  const names = definitions.map((e) => entityKey(e.id));
  async function readRows() {
    const rows2 = [];
    for (let i = 0; i < names.length; i += 80) {
      const batch = names.slice(i, i + 80);
      rows2.push(...(await db.prepare("SELECT * FROM shared_entities WHERE id IN (" + batch.map(() => "?").join(",") + ")").bind(...batch).all()).results);
    }
    return rows2;
  }
  let rows = await readRows(), known = new Set(rows.map((r) => r.entity_id));
  const missing = definitions.filter((e) => !known.has(e.id));
  if (missing.length) await db.batch(missing.map((e) => db.prepare("INSERT INTO shared_entities (id,scope,scene,entity_id,state,revision) VALUES (?,?,?,?,?,0) ON CONFLICT DO NOTHING").bind(entityKey(e.id), scope, scene, e.id, enc(initial(e, now, actor)))));
  if (missing.length) rows = await readRows();
  const maintenance = [];
  for (const row of rows) {
    const e = catalog.entities[scene + ":" + row.entity_id], v = parse(row.state), fresh = initial(e, now, actor);
    let change = false;
    if (v.signature !== fresh.signature) {
      Object.assign(v, fresh, { generation: v.generation + 1 });
      change = true;
    } else if (v.deadUntil && v.deadUntil <= now) {
      Object.assign(v, fresh, { generation: v.generation + 1 });
      change = true;
    } else if (e.hp && !v.deadUntil && v.owner !== "server") {
      v.owner = "server";
      v.ownerUntil = now + 5e3;
      if (v.target) {
        v.target = null;
        v.x = e.x;
        v.y = e.y;
        v.hp = e.hp;
        v.pose = null;
      }
      change = true;
    }
    if (!v.deadUntil && !v.target && v.hp < e.hp && now >= (v.recoverAt || 0)) {
      v.hp = Math.min(e.hp, v.hp + 1);
      v.recoverAt = now + 5e3;
      change = true;
    }
    if (change) maintenance.push(db.prepare("UPDATE shared_entities SET state=?,revision=revision+1 WHERE id=? AND revision=?").bind(enc(v), row.id, row.revision));
  }
  if (maintenance.length) await db.batch(maintenance);
  const players = new Map((await db.prepare("SELECT player_id,payload FROM player_presence WHERE scene=? AND seen_at>? ORDER BY seen_at DESC").bind(scene, now - 12e3).all()).results.map((r) => [r.player_id, parse(r.payload)]));
  players.set(actor, { x: input.x, y: input.y });
  if (maintenance.length) rows = await readRows();
  const ticks = [];
  for (const row of rows) {
    const e = catalog.entities[scene + ":" + row.entity_id];
    if (!e.hp) continue;
    const v = parse(row.state), before = enc(v);
    if (v.target === actor && !questFightVisible(e, s2)) {
      v.target = null;
      v.pose = null;
      v.hazard = null;
      v.returning = true;
    }
    if (v.target === actor) v.defender = { xp: s2.xp, equipment: s2.equipment };
    const effects = advanceNpc(e, v, players, now, catalog, rollEnemy);
    if (enc(v) === before) continue;
    ticks.push(db.prepare("UPDATE shared_entities SET state=?,revision=revision+1 WHERE id=? AND revision=?").bind(enc(v), row.id, row.revision));
    for (const effect of effects) {
      const result = { ...effect.result, id: effect.id, scene, kind: effect.kind, revision: row.revision + 1 };
      ticks.push(db.prepare("INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) SELECT ?,?,?,?,?,?,?,? WHERE changes()>0 ON CONFLICT DO NOTHING").bind(effect.actor + ":" + effect.id, scope, scene, effect.actor, effect.kind, enc(result), now, effect.kind === "enemyHit" ? 0 : 1));
    }
  }
  if (ticks.length) await db.batch(ticks);
  const ack = (Array.isArray(w.ack) ? w.ack : []).filter(token).slice(-80);
  if (ack.length) await db.prepare("UPDATE shared_events SET acked=1 WHERE acked=0 AND actor=? AND id IN (" + ack.map(() => "?").join(",") + ")").bind(actor, ...ack.map(receiptKey)).run();
  const events = (Array.isArray(w.events) ? w.events : []).slice(0, 12);
  for (const event of events) {
    if (!token(event.id)) continue;
    const rid = receiptKey(event.id);
    if (await db.prepare("SELECT id FROM shared_events WHERE id=?").bind(rid).first()) continue;
    const result = { id: event.id, kind: event.kind, scene, ok: false };
    const record = () => db.prepare("INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) VALUES (?,?,?,?,?,?,?,0) ON CONFLICT DO NOTHING").bind(rid, scope, scene, actor, String(event.kind).slice(0, 24), enc(result), now);
    if (event.scene !== scene) {
      result.error = "You have left that scene.";
      await record().run();
      continue;
    }
    if (event.kind === "relic") {
      const operation = relicOperation(s2, event.action, event.recipe, input);
      if (!operation.ok) result.error = operation.error;
      else if (!await cooldown(db, actor + ":relic", event.id, now, 900)) result.error = "Your inscription is still settling.";
      else if (operation.stage !== void 0 && !await cooldown(db, actor + ":relic-stage:" + operation.stage, event.id, now, 900719e10 - now)) result.error = "That quest step has already been recorded. Reconnect to recover its receipt.";
      else Object.assign(result, operation);
      await record().run();
      continue;
    }
    if (event.kind === "fieldSpell") {
      const spell = catalog.fieldSpells[event.spell], error = fieldSpellFailure(event.spell, s2, now);
      if (error) result.error = error;
      else if (!await cooldown(db, actor + ":field:" + event.spell, event.id, now, spell.cooldown * 1e3)) result.error = "That spell is recovering.";
      else {
        result.ok = true;
        result.spell = event.spell;
        result.readyAt = now + spell.cooldown * 1e3;
        s2 = { ...s2, bag: { ...s2.bag } };
        for (const [key, n] of Object.entries(spell.ingredients)) s2.bag[key] -= n;
      }
      await record().run();
      continue;
    }
    const e = catalog.entities[scene + ":" + event.entity];
    if (["attack", "hit", "enemyHit", "companion", "wardInterrupt", "harvest", "door"].includes(event.kind)) {
      if (!e || !definitions.some((d) => d.id === e.id)) {
        result.error = "Target is outside the shared area.";
        await record().run();
        continue;
      }
      for (let attempt = 0; attempt < 8; attempt++) {
        if (await db.prepare("SELECT id FROM shared_events WHERE id=?").bind(rid).first()) break;
        const row = await db.prepare("SELECT * FROM shared_entities WHERE id=?").bind(entityKey(e.id)).first();
        if (!row) break;
        const v = parse(row.state);
        let loot = null;
        result.ok = false;
        delete result.error;
        result.entity = e.id;
        result.generation = v.generation;
        const fail2 = (message) => {
          result.ok = false;
          result.error = message;
        };
        if (event.kind === "door") {
          if (!e.door || !near(input, e, 3)) fail2("Stand beside the door.");
          else {
            v.opened = event.open === true;
            result.ok = true;
            result.opened = v.opened;
          }
        } else if (!questFightVisible(e, s2)) fail2("That quest fight is already complete.");
        else if (["attack", "hit", "companion", "wardInterrupt"].includes(event.kind) && e.level < 27 && v.target && v.target !== actor) fail2("Someone else is fighting that.");
        else if (v.deadUntil > now) fail2("That target is not available until it returns.");
        else if (!e.hp && event.kind !== "harvest") fail2("That target cannot fight.");
        else if (event.generation !== v.generation) fail2("That encounter has already ended.");
        else if (event.kind === "harvest") {
          const d = e.resource;
          if (!d || !near(input, v, 2)) fail2("Stand beside the resource.");
          else if (level(s2, d.skill) < d.level) fail2("Your skill level is too low.");
          else if (!await cooldown(db, actor + ":gather", event.id, now, 1800)) fail2("You are still gathering.");
          else if (Math.random() > Math.min(0.95, 0.425 + (level(s2, d.skill) - d.level) * 9e-3 + (d.skill === "Mining" ? bonus(s2, "miningSuccess") : 0))) {
            result.ok = true;
            result.missed = true;
          } else {
            result.ok = true;
            result.item = d.item || d.raw;
            result.xp = d.xp;
            result.skill = d.skill;
            result.bait = d.bait || null;
            if (e.type === "ore" || e.type === "tree" && (d.resourceId === "normal" || Math.random() < 0.125)) {
              v.deadUntil = now + e.respawn;
              v.target = null;
            }
          }
        } else if (event.kind === "attack") {
          const range = event.style === "melee" ? 2 + (e.radius || 0) : 10 + (e.radius || 0);
          if (!near(input, v, range) || !npcLineOfSight(e, v, input)) fail2("Target is out of attack range.");
          else if (e.mainStoryStage != null && s2.mainStoryQuest?.stage !== e.mainStoryStage || e.kind === "mountainwatcher" && (s2.mountainQuest?.stage !== 6 || s2.mountainQuest?.version >= 2 && !s2.mountainQuest?.fieldOrders) || e.encounter === "veyr" && !(s2.mountainQuest?.stage === 17 || s2.mountainQuest?.stage === 20 && s2.questRematch === "veyr")) fail2("Complete the story objectives before this fight.");
          else if (s2.equipment?.weapon === "veyrOrb" && level(s2, "Magic") < 20) fail2("Veyr\u2019s Orb requires Magic 20.");
          else if (!await reserveSwing(db, actor, s2, event, result, now)) fail2("Your next attack is not ready.");
          else {
            result.ok = true;
            if (!v.target) {
              v.owner = "server";
              v.target = actor;
              v.pose = null;
              v.hazard = null;
              v.nextAttack = now + (e.encounter ? 2500 : e.interval * 1e3);
              v.defender = { xp: s2.xp, equipment: s2.equipment };
              v.assisted = s2.mountainQuest?.stage === 17;
            }
          }
        } else if (event.kind === "hit") {
          const style = styles.includes(event.style) ? event.style : "melee", weapon = catalog.items[s2.equipment?.weapon], range = style === "melee" ? 2 + (e.radius || 0) : 10 + (e.radius || 0);
          if (!near(input, v, range) || !npcLineOfSight(e, v, input)) fail2("Target is out of attack range.");
          else if (e.mainStoryStage != null && s2.mainStoryQuest?.stage !== e.mainStoryStage || e.kind === "mountainwatcher" && (s2.mountainQuest?.stage !== 6 || s2.mountainQuest?.version >= 2 && !s2.mountainQuest?.fieldOrders) || e.encounter === "veyr" && !(s2.mountainQuest?.stage === 17 || s2.mountainQuest?.stage === 20 && s2.questRematch === "veyr")) fail2("Complete the story objectives before this fight.");
          else if (s2.equipment?.weapon === "veyrOrb" && level(s2, "Magic") < 20) fail2("Veyr\u2019s Orb requires Magic 20.");
          else if (event.swing && !await validSwingImpact(db, actor, event, style, result)) fail2("That attack has no valid swing.");
          else if (!event.swing && !await cooldown(db, actor + ":attack", event.id, now, 0.6 * (style === "magic" ? 5 : weapon?.attackTicks || 4) * 1e3 - 150)) fail2("Your next attack is not ready.");
          else {
            const rolled = rollHit(s2, { ...e, memoryFrayUntil: v.memoryFray?.[actor] || 0 }, style, { ...event, distance: Math.hypot(input.x - v.x, input.y - v.y) }, now), damage = Math.min(v.hp, rolled);
            const spellSlow = style === "magic" ? catalog.spells[s2.spell]?.slow || 0 : 0;
            if (spellSlow && damage > 0) v.slowUntil = now + spellSlow * 1e3;
            v.hp -= damage;
            if (style === "magic" && s2.equipment?.weapon === "veyrOrb" && damage > 0) {
              v.memoryFray = Object.fromEntries(Object.entries(v.memoryFray || {}).filter(([, until]) => until > now));
              v.memoryFray[actor] = now + 4e3;
              result.memoryFrayUntil = now + 4e3;
            }
            if (!v.target) {
              v.owner = "server";
              v.target = actor;
              v.nextAttack = now + (e.encounter ? 2500 : e.interval * 1e3);
              v.defender = { xp: s2.xp, equipment: s2.equipment };
              v.assisted = s2.mountainQuest?.stage === 17;
            }
            result.ok = true;
            result.damage = damage;
            result.style = style;
            result.focus = s2[style + "Training"] || "balanced";
            result.defeat = v.hp <= 0;
            if (v.hp <= 0) {
              v.deadUntil = now + e.respawn;
              v.target = null;
              v.pose = null;
              loot = { id: entityKey(e.id) + ":loot:" + v.generation, scope, scene, kind: "loot", payload: { items: lootFor(e), x: v.x, y: v.y, owner: actor, publicAt: now + 3e4 }, expires: now + 12e4 };
            }
          }
        } else if (event.kind === "wardInterrupt") {
          if (e.encounter !== "veyr" || s2.mountainQuest?.stage !== 17 || v.target !== actor || !v.hazard) fail2("No counter-ward can break that hazard.");
          else if (!await cooldown(db, actor + ":wardInterrupt", event.id, now, 1e4)) fail2("The counter-ward is recovering.");
          else {
            v.hazard = null;
            v.pose = null;
            v.nextAttack = Math.max(v.nextAttack || 0, now + 1500);
            result.ok = true;
          }
        } else if (event.kind === "companion") {
          if (e.encounter !== "veyr" || s2.mountainQuest?.stage !== 17 || v.target !== actor) fail2("No companion is assisting this encounter.");
          else if (!await cooldown(db, actor + ":companion", event.id, now, 3900)) fail2("Companion spell is recovering.");
          else {
            result.ok = true;
            result.damage = Math.min(2, Math.max(0, v.hp - 1));
            v.hp -= result.damage;
          }
        } else {
          fail2("Enemy attacks are resolved by the world server.");
        }
        if (!result.ok) {
          if (result.error === "Your next attack is not ready." && !result.code) {
            const clock = await db.prepare("SELECT ready_at FROM shared_clocks WHERE id=?").bind(actor + ":attack").first();
            result.code = "attack_cooldown";
            result.readyAt = clock?.ready_at || now;
          }
          await record().run();
          break;
        }
        result.revision = row.revision + 1;
        result.x = v.x;
        result.y = v.y;
        result.hp = v.hp;
        result.maxhp = v.maxhp;
        const statements = [db.prepare("UPDATE shared_entities SET state=?,revision=revision+1 WHERE id=? AND revision=? AND NOT EXISTS (SELECT 1 FROM shared_events WHERE id=?)").bind(enc(v), row.id, row.revision, rid), db.prepare("INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) SELECT ?,?,?,?,?,?,?,0 WHERE changes()>0 ON CONFLICT DO NOTHING").bind(rid, scope, scene, actor, event.kind, enc(result), now)];
        if (loot) statements.push(db.prepare("INSERT INTO shared_objects (id,scope,scene,kind,payload,expires_at,revision) SELECT ?,?,?,?,?,?,0 WHERE EXISTS (SELECT 1 FROM shared_events WHERE id=?) ON CONFLICT DO NOTHING").bind(loot.id, scope, scene, loot.kind, enc(loot.payload), loot.expires, rid));
        await db.batch(statements);
        if (await db.prepare("SELECT id FROM shared_events WHERE id=?").bind(rid).first()) break;
      }
      continue;
    }
    if (event.kind === "fire" || event.kind === "drop") {
      if (!point(event.x, event.y) || !near(input, event, event.kind === "fire" ? 2 : 12)) {
        result.error = "That location is out of reach.";
        await record().run();
        continue;
      }
      if (event.kind === "fire") {
        const tree = catalog.trees[event.log];
        if (!tree || level(s2, "Firemaking") < tree.level) {
          result.error = "Invalid fire.";
          await record().run();
          continue;
        }
        const existing = await db.prepare("SELECT id FROM shared_objects WHERE scope=? AND scene=? AND kind='fire' AND expires_at>? AND json_extract(payload,'$.x')=? AND json_extract(payload,'$.y')=?").bind(scope, scene, now, event.x, event.y).first();
        if (existing) {
          result.error = "Someone already lit a fire here.";
          await record().run();
          continue;
        }
        if (!await cooldown(db, actor + ":fire", event.id, now, 1800)) {
          result.error = "Wait before lighting another fire.";
          await record().run();
          continue;
        }
        if (!await cooldown(db, scope + ":" + scene + ":fire:" + event.x + ":" + event.y, rid, now, 15e4)) {
          result.error = "Someone already lit a fire here.";
          await record().run();
          continue;
        }
        result.ok = true;
        result.xp = tree.fire;
        result.object = { id: rid, kind: "fire", x: event.x, y: event.y, owner: actor, logType: event.log, expiresAt: now + 15e4 };
      } else {
        const items = Object.fromEntries(Object.entries(event.items || {}).filter(([id, n]) => catalog.items[id] && catalog.items[id].tradeable !== false && Number.isSafeInteger(n) && n > 0 && n <= 1e9).slice(0, 25));
        if (!Object.keys(items).length) {
          result.error = "Nothing to drop.";
          await record().run();
          continue;
        }
        result.ok = true;
        result.object = { id: rid, kind: "loot", items, x: Math.round(event.x), y: Math.round(event.y), owner: actor, publicAt: now + 3e4, expiresAt: now + 12e4 };
      }
      const o = result.object;
      await db.batch([db.prepare("INSERT INTO shared_objects (id,scope,scene,kind,payload,expires_at,revision) VALUES (?,?,?,?,?,?,0) ON CONFLICT DO NOTHING").bind(o.id, scope, scene, o.kind, enc(o), o.expiresAt), record()]);
      continue;
    }
    if (event.kind === "pickup") {
      for (let attempt = 0; attempt < 8; attempt++) {
        result.ok = false;
        delete result.error;
        if (await db.prepare("SELECT id FROM shared_events WHERE id=?").bind(rid).first()) break;
        const row = await db.prepare("SELECT * FROM shared_objects WHERE id=? AND scope=? AND scene=? AND kind='loot' AND expires_at>?").bind(String(event.object), scope, scene, now).first();
        if (!row) {
          result.error = "That drop has already gone.";
          await record().run();
          break;
        }
        const o = parse(row.payload), n = Math.min(o.items?.[event.item] || 0, Math.max(0, Number.isSafeInteger(event.count) ? event.count : 0));
        if (!near(input, o, 1) || o.owner !== actor && o.publicAt > now || !n) {
          result.error = "That item is not available to collect.";
          await record().run();
          break;
        }
        o.items[event.item] -= n;
        if (!o.items[event.item]) delete o.items[event.item];
        result.ok = true;
        result.item = event.item;
        result.count = n;
        result.object = row.id;
        await db.batch([db.prepare("UPDATE shared_objects SET payload=?,revision=revision+1 WHERE id=? AND revision=? AND NOT EXISTS (SELECT 1 FROM shared_events WHERE id=?)").bind(enc(o), row.id, row.revision, rid), db.prepare("INSERT INTO shared_events (id,scope,scene,actor,kind,result,created_at,acked) SELECT ?,?,?,?,?,?,?,0 WHERE changes()>0 ON CONFLICT DO NOTHING").bind(rid, scope, scene, actor, "pickup", enc(result), now)]);
      }
      continue;
    }
    if (event.kind === "teleport") {
      const destination = String(event.destination), lairs = ["lair_veyr", "lair_varkesh", "lair_colossus", "lair_xalith"], entry = { ...catalog.entries, overworld: [42, 51] };
      const clock = await db.prepare("SELECT ready_at FROM shared_clocks WHERE id=?").bind(actor + ":attack").first();
      const finishStage = catalog.tutorial.finishStages[s2.tutorialVersion] ?? catalog.tutorial.finishStage;
      const completed = s2.tutorialReward === true || Number(s2.tutorial) > finishStage;
      const relicAnchor = catalog.relicAnchors[scene === "fairy_between" ? "return" : "crossing"];
      const relicAllowed = completed && (s2.relicQuest?.stage || 0) >= 4 && relicAnchor?.scene === scene && near(input, relicAnchor, 2) && destination === (scene === "fairy_between" ? "overworld" : "fairy_between");
      const safeTravel = ["home", "relic"].includes(event.mode);
      if (!["rowan", "hunt", "home", "relic"].includes(event.mode) || (event.mode === "relic" ? !relicAllowed : event.mode === "home" ? scene === "tutorial" || !completed || destination !== catalog.homeTeleport.scene : event.mode === "rowan" ? scene !== "tutorial" || (s2.tutorial || 0) < finishStage : scene === "tutorial" || !lairs.includes(destination) || destination === "lair_veyr" && (s2.mountainQuest?.stage || 0) < 20)) {
        result.error = "That crossing is not unlocked.";
        await record().run();
        continue;
      }
      if (event.mode === "rowan" && destination !== "overworld") {
        result.error = "Invalid island crossing.";
        await record().run();
        continue;
      }
      const engaged = safeTravel && (await readRows()).some((row) => {
        const v = parse(row.state);
        return v.target === actor && v.hp > 0 && !v.deadUntil;
      });
      const recentCombat = safeTravel && await db.prepare("SELECT id FROM shared_events WHERE actor=? AND created_at>? AND (kind='enemyHit' OR kind IN ('attack','hit','companion') AND json_extract(result,'$.ok')=1) LIMIT 1").bind(actor, now - 5e3).first();
      if (safeTravel ? engaged || recentCombat : clock && clock.ready_at + 6e3 > now) {
        result.error = event.mode === "home" ? "Leave combat and wait five seconds before teleporting." : "Leave combat before teleporting.";
        await record().run();
        continue;
      }
      if (!await cooldown(db, actor + ":teleport", event.id, now, 4e3)) {
        result.error = "A crossing is already forming.";
        await record().run();
        continue;
      }
      result.ok = true;
      result.destination = destination;
      result.entry = event.mode === "home" ? catalog.homeTeleport.entry : event.mode === "relic" ? destination === "fairy_between" ? [20, 49] : [catalog.relicAnchors.crossing.x, catalog.relicAnchors.crossing.y + 1] : entry[destination];
      result.departure = { scene, x: input.x, y: input.y };
      result.startedAt = now;
      result.arriveAt = now + 2600;
      result.color = event.mode === "home" ? "purple" : ["rowan", "relic"].includes(event.mode) ? "green" : "red";
      await record().run();
      continue;
    }
    result.error = "Unknown world action.";
    await record().run();
  }
  const burned = (await db.prepare("SELECT * FROM shared_objects fire WHERE scope=? AND scene=? AND kind='fire' AND expires_at<=? AND expires_at>? AND NOT EXISTS (SELECT 1 FROM shared_objects ash WHERE ash.id=fire.id||':ashes') LIMIT 64").bind(scope, scene, now, now - 12e4).all()).results;
  if (burned.length) await db.batch(burned.map((row) => {
    const o = parse(row.payload);
    return db.prepare("INSERT INTO shared_objects (id,scope,scene,kind,payload,expires_at,revision) VALUES (?,?,?,'loot',?,?,0) ON CONFLICT DO NOTHING").bind(row.id + ":ashes", scope, scene, enc({ x: o.x, y: o.y, owner: o.owner, items: { ashes: 1 }, publicAt: row.expires_at + 3e4 }), row.expires_at + 12e4);
  }));
  const snapshot = await readWorldSnapshot(db, names, scope, scene, actor, now, treeRegion(input));
  rows = snapshot.entities;
  const objects = snapshot.objects.flatMap((row) => {
    const o = parse(row.payload);
    return near(input, o, 75) && (row.kind === "fire" || o.owner === actor || o.publicAt <= now) ? [{ ...o, id: row.id, kind: row.kind, expiresAt: row.expires_at, revision: row.revision }] : [];
  });
  const receipts = snapshot.receipts.map(parse);
  await cleanupSharedHistory(db, now);
  const world = { protocol: 1, scope, actor, treeView: treeView(snapshot.treeRows, input, now), serverTime: Date.now(), effects: publicSharedEffects(snapshot.effects, actor, input, s2, scene), entities: rows.filter((row) => questFightVisible(catalog.entities[scene + ":" + row.entity_id], s2) && (!w.revisions || w.revisions[row.entity_id] !== row.revision)).map((row) => ({ ...parse(row.state), revision: row.revision })).map(({ defender, assisted, resonance, ...v }) => ({ ...v, hazard: v.hazard ? (({ damage, ...h }) => h)(v.hazard) : null })), objects, receipts, acked: ack };
  Object.defineProperty(world, "_peers", { value: [...players].filter(([id]) => id !== actor).slice(0, 60).map(([, p]) => p) });
  return world;
}
export async function readSharedEffects(db, scope, scene, actor, position, since, state) {
  const rows = (await db.prepare("SELECT id,actor,kind,result,created_at FROM shared_events WHERE scope=? AND scene=? AND created_at>=? AND kind IN ('activity','enemyAction','hit','enemyHit','companion') ORDER BY created_at DESC LIMIT 128").bind(scope, scene, since).all()).results;
  return publicSharedEffects(rows, actor, position, state, scene);
}
function publicSharedEffects(rows, actor, position, state, scene) {
  return rows.reverse().flatMap((row) => {
    if (row.actor === actor && row.kind !== "enemyAction") return [];
    const r = parse(row.result), e = catalog.entities[scene + ":" + (r.entity || r.target?.entity)], hidden = !["activity", "enemyHit"].includes(row.kind) && state && e && !questFightVisible(e, state);
    if (hidden) return [];
    if (!near(position, r, 75)) return [];
    const base = { id: row.id, actor: row.actor, kind: row.kind, at: row.created_at, x: r.x, y: r.y };
    if (row.kind === "activity") return [{ ...base, action: r }];
    if (row.kind === "enemyAction") return [{ ...base, entity: r.entity, generation: r.generation, pose: r.pose, hazard: r.hazard ? (({ damage, ...h }) => h)(r.hazard) : null }];
    return r.ok ? [{ ...base, entity: r.entity, generation: r.generation, revision: r.revision, damage: r.damage, dodged: !!r.dodged, hp: r.hp, maxhp: r.maxhp, defeat: !!r.defeat }] : [];
  });
}
