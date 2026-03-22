CREATE TABLE `known_tracks` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `external_id` text NOT NULL,
  `source_platform` text NOT NULL,
  `title` text NOT NULL,
  `artist` text NOT NULL,
  `fuzzy_key` text NOT NULL,
  `source` text NOT NULL,
  `synced_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `known_tracks_ext_idx` ON `known_tracks` (`external_id`, `source_platform`);
--> statement-breakpoint
CREATE INDEX `known_tracks_fuzzy_idx` ON `known_tracks` (`fuzzy_key`);
--> statement-breakpoint
CREATE INDEX `known_tracks_source_idx` ON `known_tracks` (`source`);
