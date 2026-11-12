CREATE TYPE "public"."cable_grip" AS ENUM('rope', 'straight_bar', 'ez_bar', 'wide_bar', 'v_grip', 'single_handle', 'two_handles', 'no_grip');--> statement-breakpoint
ALTER TABLE "exercise" ADD COLUMN "grip" "cable_grip";--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_grip_only_cable" CHECK ("exercise"."grip" IS NULL OR "exercise"."equipment" = 'cable');