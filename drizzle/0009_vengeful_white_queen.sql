CREATE TABLE `game_maintenance` (
	`id` integer PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`status` text NOT NULL,
	`kick_at` integer NOT NULL
);
