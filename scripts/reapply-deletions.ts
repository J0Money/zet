// Sletter konti igen efter genindlæsning af en backup (procedure i backup/GENDANNELSE.md).
// Kør med:
//   node --conditions=react-server --import tsx scripts/reapply-deletions.ts           (viser kun)
//   node --conditions=react-server --import tsx scripts/reapply-deletions.ts --apply   (sletter)
// DATABASE_URL skal pege på den GENINDLÆSTE database. DELETION_LOG_* skal pege på
// backup-bucketten, og S3_* på billedlageret, så profilbilleder også slettes igen.
// Bruger-id'er udskrives ikke; kun antal og tidspunkter.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

async function main() {
  const apply = process.argv.includes("--apply");
  const { deletionLogConfigured, listDeletions } = await import("../lib/deletion-log");
  if (!deletionLogConfigured()) throw new Error("DELETION_LOG_* mangler. Se backup/GENDANNELSE.md.");
  const { avatarStorageConfigured } = await import("../lib/avatar-storage");
  if (apply && !avatarStorageConfigured()) throw new Error("S3_* mangler, så profilbilleder kan ikke slettes igen.");

  const { sqlClient } = await import("../lib/db");
  const { deleteAccountData } = await import("../lib/account-deletion");
  try {
    const entries = await listDeletions();
    const rows = entries.length
      ? await sqlClient.query<{ id: string; image: string | null }>(`SELECT id::text, image FROM "user" WHERE id = ANY($1::uuid[])`, [entries.map((e) => e.userId)])
      : [];
    const present = new Map(rows.map((row) => [row.id, row.image]));
    const toDelete = entries.filter((entry) => present.has(entry.userId));

    console.log(`Slettelisten har ${entries.length} konti. ${toDelete.length} findes i databasen og skal slettes igen.`);
    for (const entry of toDelete) console.log(`  slettet ${entry.deletedAt.toISOString()}`);
    if (!apply) {
      console.log("Intet er ændret. Kør med --apply for at slette.");
      return;
    }

    let ok = 0;
    for (const entry of toDelete) {
      const result = await deleteAccountData(entry.userId, present.get(entry.userId) ?? null);
      if (result.success) ok++;
      else console.error(`  fejl (${result.code}) for konto slettet ${entry.deletedAt.toISOString()}`);
    }
    console.log(`${ok} af ${toDelete.length} konti slettet igen.`);
    if (ok !== toDelete.length) process.exitCode = 1;
  } finally {
    await sqlClient.pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Fejl.");
  process.exitCode = 1;
});
