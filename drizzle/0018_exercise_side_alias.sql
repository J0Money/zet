CREATE TYPE "public"."exercise_side" AS ENUM('both', 'single_arm', 'single_leg');--> statement-breakpoint
CREATE TABLE "exercise_alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alias" text NOT NULL,
	"base_name" text NOT NULL,
	"type" "exercise_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercise" ADD COLUMN "side" "exercise_side" DEFAULT 'both' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_alias_unique" ON "exercise_alias" USING btree (lower("alias"),"type");