ALTER TABLE "workout" DROP CONSTRAINT "workout_user_id_date_unique";--> statement-breakpoint
ALTER TABLE "workout" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workout" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "workout_one_active_per_user" ON "workout" USING btree ("user_id") WHERE "workout"."started_at" is not null and "workout"."ended_at" is null;