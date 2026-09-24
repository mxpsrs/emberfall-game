CREATE TABLE `editor_world` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`document` text NOT NULL,
	`previous_document` text,
	`updated_by` text NOT NULL
);
