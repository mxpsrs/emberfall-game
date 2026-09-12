CREATE TABLE `auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`attempts` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `game_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`normalized_username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_accounts_normalized_username_unique` ON `game_accounts` (`normalized_username`);--> statement-breakpoint
CREATE TABLE `game_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `game_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
