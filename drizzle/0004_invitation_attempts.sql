CREATE TABLE "invitation_attempt" (
	"invitation_id" uuid PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
	"window_ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invitation_attempt" ADD CONSTRAINT "invitation_attempt_invitation_id_invitation_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitation"("id") ON DELETE cascade ON UPDATE no action;