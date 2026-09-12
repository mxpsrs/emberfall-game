-- Requested character-only reset for mxpsrs. Other saves and all logins remain intact.
INSERT INTO game_resets SELECT '2026-09-12-mxpsrs-character-4', count(*), strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM character_saves WHERE user_id = 'account:2db1d2ba-75e2-4c27-bcdf-94e742f95c86';
--> statement-breakpoint
UPDATE character_saves SET state = '{"freshStart":"2026-09-12-mxpsrs-character-4"}', revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id = 'account:2db1d2ba-75e2-4c27-bcdf-94e742f95c86';
--> statement-breakpoint
DELETE FROM player_presence WHERE player_id = '6590c40f0d30793818730fa7672c2e5ec9348c781ee56ff807e8bae74853f144';
