CREATE TABLE `owner_credential_rotations` (
	`request_id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`normalized_username` text NOT NULL,
	`completed_at` text NOT NULL
);
