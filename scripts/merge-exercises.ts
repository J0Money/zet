// Lægger dubletter af øvelser sammen. Brug:
//   npx tsx scripts/merge-exercises.ts <kilde-id>:<mål-id> [<kilde-id>:<mål-id> ...]
// Uden --apply vises kun, hvad der ville ske. Med --apply køres alle par i én
// transaktion, og navnene fra visningen kontrolleres igen inde i transaktionen.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { buildMergeStatements, type MergePair } from "../lib/exercise-merge";
config({ path: ".env.local", quiet: true });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const args = process.argv.slice(2).filter((arg) => arg !== "--apply");
  const ids = args.map((arg) => arg.split(":"));
  if (!ids.length || ids.some((pair) => pair.length !== 2)) throw new Error("Angiv par som kilde-id:mål-id.");

  const pairs: MergePair[] = [];
  for (const [sourceId, targetId] of ids) {
    const rows = await sql`select e.id, e.name, e.type,
      (select count(*) from workout_set s where s.exercise_id = e.id)::int as sets,
      (select count(*) from workout_cardio c where c.exercise_id = e.id)::int as cardio,
      (select count(*) from training_program_exercise p where p.exercise_id = e.id)::int as programs,
      (select count(*) from exercise_note n where n.exercise_id = e.id)::int as notes
      from exercise e where e.id in (${sourceId}::uuid, ${targetId}::uuid)`;
    const source = rows.find((row) => row.id === sourceId);
    const target = rows.find((row) => row.id === targetId);
    if (!source || !target || sourceId === targetId) throw new Error("En øvelse i et par findes ikke.");
    if (source.type !== target.type) throw new Error(`"${source.name}" og "${target.name}" har ikke samme type.`);
    console.log(`"${source.name}" (sæt ${source.sets}, cardio ${source.cardio}, programmer ${source.programs}, noter ${source.notes})`
      + ` -> "${target.name}" (sæt ${target.sets}, cardio ${target.cardio}, programmer ${target.programs}, noter ${target.notes})`);
    pairs.push({ sourceId, sourceName: source.name, targetId, targetName: target.name });
  }

  if (!process.argv.includes("--apply")) {
    console.log(`Prøvekørsel: ${pairs.length} par. Intet er ændret.`);
    return;
  }
  const statements = pairs.flatMap((pair) => buildMergeStatements((text, params) => sql.query(text, params), pair));
  await sql.transaction(statements);
  const left = await sql`select count(*)::int as n from exercise where id = any(${pairs.map((pair) => pair.sourceId)}::uuid[])`;
  if (left[0].n !== 0) throw new Error("Verifikation mislykkedes.");
  console.log(`Lagt sammen og verificeret: ${pairs.length} par.`);
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Sammenlægningen mislykkedes."); process.exitCode = 1; });
