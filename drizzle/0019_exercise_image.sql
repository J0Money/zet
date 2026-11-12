CREATE TABLE "exercise_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_name" text NOT NULL,
	"type" "exercise_type" NOT NULL,
	"image_key" text NOT NULL,
	"author" text,
	"license" text,
	"source_url" text,
	"is_ai_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_image_unique" ON "exercise_image" USING btree (lower("base_name"),"type");