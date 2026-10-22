CREATE TABLE "training_program" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT clock_timestamp() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_program_exercise" (
	"program_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "training_program_exercise_program_id_exercise_id_unique" UNIQUE("program_id","exercise_id")
);
--> statement-breakpoint
ALTER TABLE "training_program" ADD CONSTRAINT "training_program_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_program_exercise" ADD CONSTRAINT "training_program_exercise_program_id_training_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."training_program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_program_exercise" ADD CONSTRAINT "training_program_exercise_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE no action ON UPDATE no action;