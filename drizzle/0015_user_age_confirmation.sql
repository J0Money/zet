ALTER TABLE "user" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "adult_permission_confirmed" boolean;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "age_confirmation_at" timestamp with time zone;