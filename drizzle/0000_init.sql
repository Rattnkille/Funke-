CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `activity` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`actor_id` text,
	`type` text NOT NULL,
	`mission_id` text,
	`subject` text,
	`target_user_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activity_project_time_idx` ON `activity` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `invite` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_by_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`use_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invite_token_hash_unique` ON `invite` (`token_hash`);--> statement-breakpoint
CREATE INDEX `invite_project_idx` ON `invite` (`project_id`);--> statement-breakpoint
CREATE TABLE `membership` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`project_id`, `user_id`),
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `membership_user_idx` ON `membership` (`user_id`);--> statement-breakpoint
CREATE TABLE `mission` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`energy` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`assignee_id` text,
	`completed_at` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `mission_project_idx` ON `mission` (`project_id`);--> statement-breakpoint
CREATE INDEX `mission_assignee_idx` ON `mission` (`assignee_id`);--> statement-breakpoint
CREATE TABLE `mission_dependency` (
	`mission_id` text NOT NULL,
	`depends_on_id` text NOT NULL,
	PRIMARY KEY(`mission_id`, `depends_on_id`),
	FOREIGN KEY (`mission_id`) REFERENCES `mission`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`depends_on_id`) REFERENCES `mission`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`goal` text NOT NULL,
	`event_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`completed_at` integer,
	`created_by_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project_visit` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`last_seen_at` integer NOT NULL,
	PRIMARY KEY(`project_id`, `user_id`),
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `template` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`goal` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `template_dependency` (
	`template_mission_id` text NOT NULL,
	`depends_on_id` text NOT NULL,
	PRIMARY KEY(`template_mission_id`, `depends_on_id`),
	FOREIGN KEY (`template_mission_id`) REFERENCES `template_mission`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`depends_on_id`) REFERENCES `template_mission`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `template_mission` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`energy` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `template`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `template_mission_template_idx` ON `template_mission` (`template_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`adult_confirmed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
