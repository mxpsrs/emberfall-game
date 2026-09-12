-- Owner-requested global reset. Keep revisions increasing to reject stale tabs.
CREATE TABLE game_resets (reset_id text PRIMARY KEY NOT NULL, account_count integer NOT NULL, reset_at text NOT NULL);
--> statement-breakpoint
INSERT INTO game_resets SELECT '2026-09-12-all-accounts-1', count(*), strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM character_saves;
--> statement-breakpoint
UPDATE character_saves SET state = '{"freshStart":"2026-09-12-all-accounts-1"}', revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now');
--> statement-breakpoint
DELETE FROM player_presence;
