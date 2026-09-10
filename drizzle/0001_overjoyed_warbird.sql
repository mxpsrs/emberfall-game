CREATE TABLE `player_presence` (
	`player_id` text PRIMARY KEY NOT NULL,
	`scene` text NOT NULL,
	`payload` text NOT NULL,
	`seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_presence_scene_seen` ON `player_presence` (`scene`,`seen_at`);