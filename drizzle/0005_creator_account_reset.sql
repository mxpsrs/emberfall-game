-- Owner requested all characters/progress reset for the new character creator.
-- Preserve account credentials and sessions; increasing revisions rejects old tabs.
INSERT INTO game_resets SELECT '2026-09-12-character-creator-2', count(*), strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM character_saves;
--> statement-breakpoint
UPDATE character_saves SET state = '{"freshStart":"2026-09-12-character-creator-2"}', revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now');
--> statement-breakpoint
DELETE FROM player_presence;
