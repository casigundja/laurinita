CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer NOT NULL,
	`price` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `movements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	`created` text NOT NULL,
	`order_id` text,
	`event_key` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `movements_event_key_unique` ON `movements` (`event_key`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`customer` text NOT NULL,
	`address` text NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'Pendente' NOT NULL,
	`created` text NOT NULL,
	`request_key` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_request_key_unique` ON `orders` (`request_key`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`price` integer NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`minimum` integer DEFAULT 5 NOT NULL,
	`image` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'customer' NOT NULL,
	`created` text NOT NULL
);
