CREATE TABLE `friendships` (
	`pair` text PRIMARY KEY NOT NULL,
	`a` text NOT NULL,
	`b` text NOT NULL,
	`requester` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_trades` (
	`id` text PRIMARY KEY NOT NULL,
	`a` text NOT NULL,
	`b` text NOT NULL,
	`status` text NOT NULL,
	`revision` integer NOT NULL,
	`payload` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_trade_a` ON `player_trades` (`a`,`status`);--> statement-breakpoint
CREATE INDEX `idx_trade_b` ON `player_trades` (`b`,`status`);--> statement-breakpoint
CREATE TABLE `social_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author` text NOT NULL,
	`recipient` text,
	`scene` text NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_messages_time` ON `social_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_messages_recipient` ON `social_messages` (`recipient`,`id`);