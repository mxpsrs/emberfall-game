CREATE TABLE `shared_clocks` (
	`id` text PRIMARY KEY NOT NULL,
	`ready_at` integer NOT NULL,
	`nonce` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shared_entities` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`scene` text NOT NULL,
	`entity_id` text NOT NULL,
	`state` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_shared_entity_scene` ON `shared_entities` (`scope`,`scene`);--> statement-breakpoint
CREATE TABLE `shared_events` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`scene` text NOT NULL,
	`actor` text NOT NULL,
	`kind` text NOT NULL,
	`result` text NOT NULL,
	`created_at` integer NOT NULL,
	`acked` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_shared_actor_receipts` ON `shared_events` (`actor`,`acked`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_shared_events_scene` ON `shared_events` (`scope`,`scene`,`created_at`);--> statement-breakpoint
CREATE TABLE `shared_objects` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`scene` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_shared_objects_scene` ON `shared_objects` (`scope`,`scene`,`expires_at`);