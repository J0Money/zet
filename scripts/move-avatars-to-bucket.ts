// Engangsflytning af profilbilleder fra Vercel Blob til Railway Bucket.
// Standard er dry-run. Kør med --apply for at kopiere og opdatere user.image.
// De gamle billeder i Vercel Blob slettes ikke af dette script.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { get } from "@vercel/blob";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

config({ path: ".env.local", quiet: true });
const apply = process.argv.includes("--apply");
const keyPattern = /^avatars\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.webp$/i;

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT id, image FROM "user" WHERE image LIKE 'https://%.private.blob.vercel-storage.com/avatars/%'` as { id: string; image: string }[];
  console.log(`${rows.length} profilbillede(r) ligger i Vercel Blob.`);
  if (!apply) { console.log("Dry-run: intet ændret. Kør med --apply for at flytte."); return; }

  const s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } });
  let moved = 0;
  for (const row of rows) {
    const key = new URL(row.image).pathname.slice(1);
    if (!keyPattern.test(key) || !key.startsWith(`avatars/${row.id}/`)) { console.warn("Sprunget over: uventet sti."); continue; }
    const blob = await get(row.image, { access: "private" });
    if (blob?.statusCode !== 200) { console.warn("Sprunget over: billedet kunne ikke hentes."); continue; }
    const body = new Uint8Array(await new Response(blob.stream).arrayBuffer());
    await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: "image/webp" }));
    // Kun hvis brugeren ikke har skiftet billede imens.
    const updated = await sql`UPDATE "user" SET image = ${key} WHERE id = ${row.id} AND image = ${row.image} RETURNING id`;
    if (updated.length) moved++; else console.warn("Sprunget over: profilen blev ændret imens.");
  }
  console.log(`${moved} af ${rows.length} flyttet.`);
}

main().catch(() => { console.error("Flytningen fejlede; detaljer skjult."); process.exitCode = 1; });
