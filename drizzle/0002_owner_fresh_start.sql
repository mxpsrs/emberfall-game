-- Owner-requested fresh start. Keep the revision monotonic to reject stale tabs.
UPDATE character_saves SET state = '{"freshStart":"2026-09-11"}', revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id = 'email:682b1ea5d3b9d25569869fe177bfaf248b4414f40e36f42a5eceed6973d5f288';
--> statement-breakpoint
DELETE FROM player_presence WHERE player_id = '7c8c9a19904d5b3eb26ff3e9770aa6cd3b1e4ce31ed4d8b04c06d58f2c7423c8';
