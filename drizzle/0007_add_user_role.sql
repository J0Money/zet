CREATE TYPE "public"."user_role" AS ENUM('admin', 'member');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" "user_role" DEFAULT 'member' NOT NULL;--> statement-breakpoint
-- Joes seedede bruger bliver den eneste admin. Alle andre brugere (inklusive
-- fremtidige venner oprettet via invitationslinks) forbliver "member".
UPDATE "user" SET "role" = 'admin' WHERE "id" = '11111111-1111-1111-1111-111111111111';