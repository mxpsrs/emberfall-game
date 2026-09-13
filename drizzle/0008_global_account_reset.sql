-- Owner-requested global character reset: Owner requested all accounts start fresh after the Firstlight Isle expansion
-- Preserve login identities and passwords. Audit guards make replay a no-op.
DELETE FROM game_sessions WHERE NOT EXISTS (SELECT 1 FROM game_resets WHERE reset_id = '2026-09-13-002255-all-accounts-7ed28a4c');
--> statement-breakpoint
UPDATE character_saves SET state = '{"freshStart":"2026-09-13-002255-all-accounts-7ed28a4c"}', revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE NOT EXISTS (SELECT 1 FROM game_resets WHERE reset_id = '2026-09-13-002255-all-accounts-7ed28a4c');
--> statement-breakpoint
DELETE FROM player_presence WHERE NOT EXISTS (SELECT 1 FROM game_resets WHERE reset_id = '2026-09-13-002255-all-accounts-7ed28a4c');
--> statement-breakpoint
INSERT INTO game_resets (reset_id,account_count,reset_at) SELECT '2026-09-13-002255-all-accounts-7ed28a4c', count(*), strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM character_saves HAVING NOT EXISTS (SELECT 1 FROM game_resets WHERE reset_id = '2026-09-13-002255-all-accounts-7ed28a4c');
