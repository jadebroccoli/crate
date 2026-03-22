CREATE TABLE `playlist_tracks` (
	`playlist_id` text,
	`track_id` text,
	`position` integer NOT NULL,
	FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `playlists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `queue_items` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress_pct` integer DEFAULT 0,
	`want_full_track` integer DEFAULT true,
	`want_stem_vocals` integer DEFAULT false,
	`want_stem_instrumental` integer DEFAULT false,
	`want_stem_drums` integer DEFAULT false,
	`want_stem_bass` integer DEFAULT false,
	`error_message` text,
	`added_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `taste_profile` (
	`id` text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	`spotify_user_id` text,
	`raw_listening_data` text,
	`genre_breakdown` text,
	`bpm_min` integer,
	`bpm_max` integer,
	`preferred_keys` text,
	`energy_preference` real,
	`stem_preferences` text,
	`edit_preferences` text,
	`ai_summary` text,
	`last_synced_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`artist` text NOT NULL,
	`remixer` text,
	`label` text,
	`bpm` integer,
	`key` text,
	`energy` real,
	`duration_ms` integer,
	`genre` text,
	`subgenre` text,
	`mood` text,
	`source_url` text,
	`source_platform` text,
	`local_path` text,
	`has_stem_vocals` integer DEFAULT false,
	`has_stem_instrumental` integer DEFAULT false,
	`has_stem_drums` integer DEFAULT false,
	`has_stem_bass` integer DEFAULT false,
	`artwork_url` text,
	`release_date` text,
	`downloaded_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
