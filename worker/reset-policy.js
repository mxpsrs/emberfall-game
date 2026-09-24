// Compatibility version until the first direct reset. Later versions live in D1.
export const SAVE_RESET_VERSION='2026-09-12-character-creator-2';
export const RESET_VERSION_SQL=`COALESCE((SELECT id FROM global_resets WHERE completed = 1 ORDER BY rowid DESC LIMIT 1),'${SAVE_RESET_VERSION}')`;
export async function currentResetVersion(env){
  return (await env.DB.prepare(`SELECT ${RESET_VERSION_SQL} AS version`).bind().first()).version;
}
