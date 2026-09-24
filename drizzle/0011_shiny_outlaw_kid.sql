CREATE TABLE `ignored_players` (
	`owner` text NOT NULL,
	`target` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ignored_owner` ON `ignored_players` (`owner`,`target`);--> statement-breakpoint
CREATE TABLE `social_settings` (
	`account_id` text PRIMARY KEY NOT NULL,
	`public_mode` text DEFAULT 'on' NOT NULL,
	`private_mode` text DEFAULT 'on' NOT NULL,
	`trade_mode` text DEFAULT 'on' NOT NULL
);
