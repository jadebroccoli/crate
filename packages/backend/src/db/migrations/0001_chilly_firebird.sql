CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY DEFAULT 'spotify' NOT NULL,
	`provider` text DEFAULT 'spotify' NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`expires_at` integer,
	`spotify_user_id` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer
);
