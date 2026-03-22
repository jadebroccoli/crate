CREATE TABLE `dismissed_tracks` (
  `id` text PRIMARY KEY NOT NULL,
  `external_id` text NOT NULL,
  `source_platform` text NOT NULL,
  `dismissed_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dismissed_tracks_ext_idx` ON `dismissed_tracks` (`external_id`, `source_platform`);
