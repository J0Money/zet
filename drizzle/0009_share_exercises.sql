ALTER TABLE "exercise" ADD COLUMN "is_shared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "exercise" SET "is_shared" = true WHERE "user_id" IS NOT NULL;
