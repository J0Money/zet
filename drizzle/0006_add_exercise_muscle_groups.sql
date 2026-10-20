CREATE TABLE "exercise_muscle_group" (
	"exercise_id" uuid NOT NULL,
	"muscle_group" "muscle_group" NOT NULL,
	CONSTRAINT "exercise_muscle_group_exercise_id_muscle_group_unique" UNIQUE("exercise_id","muscle_group")
);
--> statement-breakpoint
ALTER TABLE "exercise_muscle_group" ADD CONSTRAINT "exercise_muscle_group_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Flyt eksisterende øvelsers muskelgruppe over i den nye tabel, før kolonnen
-- fjernes nedenfor. Ingen eksisterende øvelse mister sin muskelgruppe.
INSERT INTO "exercise_muscle_group" ("exercise_id", "muscle_group")
SELECT "id", "muscle_group" FROM "exercise" WHERE "muscle_group" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise" DROP COLUMN "muscle_group";