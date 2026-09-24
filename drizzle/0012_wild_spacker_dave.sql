CREATE TABLE `archived_characters` (
	`checkpoint_id` text NOT NULL,
	`user_id` text NOT NULL,
	`state` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`checkpoint_id`, `user_id`),
	FOREIGN KEY (`checkpoint_id`) REFERENCES `beta_checkpoints`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `beta_checkpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`restore_from` text,
	FOREIGN KEY (`id`) REFERENCES `global_resets`(`id`) ON UPDATE no action ON DELETE no action
);
