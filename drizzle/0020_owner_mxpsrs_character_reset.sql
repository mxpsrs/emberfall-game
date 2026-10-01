-- Requested reset: login owner, character mxpsrs. The separate Mxpsrs login
-- and every other save remain intact. Keep the revision monotonic for old tabs.
UPDATE character_saves
SET state = '{"freshStart":"2026-09-30-owner-mxpsrs-character-reset"}',
    revision = revision + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE user_id = 'account:2db1d2ba-75e2-4c27-bcdf-94e742f95c86'
  AND EXISTS (SELECT 1 FROM game_accounts WHERE id = '2db1d2ba-75e2-4c27-bcdf-94e742f95c86' AND normalized_username = 'owner')
  AND state <> '{"freshStart":"2026-09-30-owner-mxpsrs-character-reset"}'
  AND NOT EXISTS (SELECT 1 FROM game_resets WHERE reset_id = '2026-09-30-owner-mxpsrs-character-reset');
--> statement-breakpoint
INSERT INTO game_resets (reset_id, account_count, reset_at)
SELECT '2026-09-30-owner-mxpsrs-character-reset', count(*), strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM character_saves
WHERE user_id = 'account:2db1d2ba-75e2-4c27-bcdf-94e742f95c86'
  AND state = '{"freshStart":"2026-09-30-owner-mxpsrs-character-reset"}'
  AND EXISTS (SELECT 1 FROM game_accounts WHERE id = '2db1d2ba-75e2-4c27-bcdf-94e742f95c86' AND normalized_username = 'owner')
  AND NOT EXISTS (SELECT 1 FROM game_resets WHERE reset_id = '2026-09-30-owner-mxpsrs-character-reset')
HAVING count(*) = 1;
--> statement-breakpoint
DELETE FROM player_presence
WHERE player_id = '6590c40f0d30793818730fa7672c2e5ec9348c781ee56ff807e8bae74853f144'
  AND EXISTS (SELECT 1 FROM character_saves WHERE user_id = 'account:2db1d2ba-75e2-4c27-bcdf-94e742f95c86' AND state = '{"freshStart":"2026-09-30-owner-mxpsrs-character-reset"}')
  AND EXISTS (SELECT 1 FROM game_accounts WHERE id = '2db1d2ba-75e2-4c27-bcdf-94e742f95c86' AND normalized_username = 'owner');
