import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { englishExerciseName, englishExerciseNames } from "../lib/exercise-names";
config({ path: ".env.local", quiet: true });
async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`select id, name, group_name from exercise order by name`;
  const updates = rows.map((row) => ({ id: row.id, old_name: row.name, old_group: row.group_name,
    name: englishExerciseName(row.name), group_name: row.group_name === null ? null : englishExerciseNames[row.group_name] ?? row.group_name,
  })).filter((row) => row.name !== row.old_name || row.group_name !== row.old_group);
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify(updates.map(({ old_name, name }) => ({ from: old_name, to: name })), null, 2));
    return;
  }
  const [result] = await sql.transaction([
    sql`with changes as (select * from jsonb_to_recordset(${JSON.stringify(updates)}::jsonb) as x(id uuid, old_name text, old_group text, name text, group_name text)),
    ready as (select count(*) = ${updates.length} as ok from changes c join exercise e on e.id=c.id and e.name=c.old_name and e.group_name is not distinct from c.old_group)
    update exercise e set name=c.name, group_name=c.group_name from changes c, ready r where r.ok and e.id=c.id returning e.id`,
  ], { isolationLevel: "Serializable" });
  if (result.length !== updates.length) throw new Error("Listen ændrede sig. Ingen navne blev rettet.");
  const after = await sql`select id, name, group_name from exercise`;
  for (const update of updates) {
    const row = after.find((item) => item.id === update.id);
    if (!row || row.name !== update.name || row.group_name !== update.group_name) throw new Error("Verifikation mislykkedes.");
  }
  console.log(`Oversat og verificeret: ${result.length} øvelser. Eksisterende ID'er bevaret.`);
}
main().catch(() => { console.error("Oversættelsen kunne ikke bekræftes."); process.exitCode = 1; });
