CREATE TYPE "public"."equipment" AS ENUM('barbell', 'dumbbells', 'machine', 'cable', 'bodyweight', 'other');--> statement-breakpoint
ALTER TABLE "exercise" ADD COLUMN "group_name" text;--> statement-breakpoint
ALTER TABLE "exercise" ADD COLUMN "equipment" "equipment";--> statement-breakpoint
UPDATE "exercise" AS e
SET "name" = v.new_name, "group_name" = v.group_name, "equipment" = v.equipment::"equipment"
FROM (VALUES
  ('Bænkpres', 'Bænkpres (Stang)', 'Bænkpres', 'barbell'),
  ('Brystpres i maskine', 'Bænkpres (Maskine)', 'Bænkpres', 'machine'),
  ('Skråbænkpres', 'Skråbænkpres (Stang)', 'Skråbænkpres', 'barbell'),
  ('Skrå bænk (dumbells)', 'Skråbænkpres (Dumbbells)', 'Skråbænkpres', 'dumbbells'),
  ('Flyes (kabel)', 'Flyes (Kabel)', 'Flyes', 'cable'),
  ('Ro i maskine', 'Ro (Maskine)', 'Ro', 'machine'),
  ('Stående ro i kabel', 'Ro (Kabel)', 'Ro', 'cable')
) AS v(old_name, new_name, group_name, equipment)
WHERE e."name" = v.old_name AND e."type" = 'strength';
