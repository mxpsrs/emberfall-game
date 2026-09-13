CREATE TABLE `global_resets` (
	`id` text PRIMARY KEY NOT NULL,
	`reason` text NOT NULL,
	`character_count` integer NOT NULL,
	`session_count` integer NOT NULL,
	`presence_count` integer NOT NULL,
	`reset_at` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL
);
