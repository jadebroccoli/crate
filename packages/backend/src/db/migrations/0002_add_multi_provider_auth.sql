ALTER TABLE `auth_sessions` ADD COLUMN `user_id` text;
--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD COLUMN `display_name` text;
--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD COLUMN `username` text;
--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD COLUMN `encrypted_password` text;
--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD COLUMN `client_id` text;
--> statement-breakpoint
UPDATE `auth_sessions` SET `user_id` = `spotify_user_id` WHERE `spotify_user_id` IS NOT NULL;
