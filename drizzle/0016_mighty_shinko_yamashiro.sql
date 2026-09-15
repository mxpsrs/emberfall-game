CREATE INDEX `idx_shared_event_cleanup` ON `shared_events` (`acked`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_shared_object_cleanup` ON `shared_objects` (`expires_at`);