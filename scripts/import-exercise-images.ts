// Henter de valgte øvelsesbilleder fra wger.de (fri licens), gemmer dem som
// 512x512 WebP i bucketten og registrerer dem i exercise_image med kreditering.
// Brug: npx tsx scripts/import-exercise-images.ts [--apply]
// Uden --apply vises kun, hvad der ville ske. Billederne er valgt og godkendt
// 12. november 2026. Ændringen (skalering, hvid baggrund) deles under samme
// licens som originalen (CC BY-SA), og licens og ophav vises i appen.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
config({ path: ".env.local", quiet: true });

type Pick = { base: string; url: string; author: string; license: string; source: string; ai?: boolean };

const PICKS: Pick[] = [
  { base: "Back extension", url: "https://wger.de/media/exercise-images/128/Hyperextensions-1.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/301/view-base" },
  { base: "Bench press", url: "https://wger.de/media/exercise-images/192/Bench-press-1.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/73/view-base" },
  { base: "Biceps curl", url: "https://wger.de/media/exercise-images/81/Biceps-curl-1.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/92/view-base" },
  { base: "Bulgarian split squat", url: "https://wger.de/media/exercise-images/1706/0c5243cc-2539-4005-aee0-d3a8c5d3a32c.jfif", author: "AlucardEvil40", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/1706/view-base" },
  { base: "Calf raise", url: "https://wger.de/media/exercise-images/622/9a429bd0-afd3-4ad0-8043-e9beec901c81.jpeg", author: "clafal", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/622/view-base" },
  { base: "Chest flyes", url: "https://wger.de/media/exercise-images/122/Incline-cable-flyes-1.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/237/view-base" },
  { base: "Deadlift", url: "https://wger.de/media/exercise-images/161/Dead-lifts-2.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/484/view-base" },
  { base: "Dips", url: "https://wger.de/media/exercise-images/194/34600351-8b0b-4cb0-8daa-583537be15b0.png", author: "cshep442", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/194/view-base" },
  { base: "French press", url: "https://wger.de/media/exercise-images/84/Lying-close-grip-triceps-press-to-chin-1.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/246/view-base" },
  { base: "Front raise", url: "https://wger.de/media/exercise-images/256/b7def5bc-2352-499b-b9e5-fff741003831.png", author: "philip", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/256/view-base" },
  { base: "Hammer curl", url: "https://wger.de/media/exercise-images/86/Bicep-hammer-curl-1.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/272/view-base" },
  { base: "Hanging leg raise", url: "https://wger.de/media/exercise-images/979/27097a3a-5749-428d-b94c-6082afe390f6.png", author: "clafal", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/979/view-base", ai: true },
  { base: "Incline bench press", url: "https://wger.de/media/exercise-images/41/Incline-bench-press-1.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/538/view-base" },
  { base: "Lat pulldown", url: "https://wger.de/media/exercise-images/158/0d51a0f2-622f-434b-beb8-1a003c54712a.png", author: "Franpol", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/158/view-base" },
  { base: "Lateral raise", url: "https://wger.de/media/exercise-images/148/lateral-dumbbell-raises-large-2.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/348/view-base" },
  { base: "Leg curl", url: "https://wger.de/media/exercise-images/154/lying-leg-curl-machine-large-1.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/365/view-base" },
  { base: "Leg extension", url: "https://wger.de/media/exercise-images/369/78c915d1-e46d-4d30-8124-65d68664c3ef.png", author: "Franpol", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/369/view-base" },
  { base: "Leg press", url: "https://wger.de/media/exercise-images/371/d2136f96-3a43-4d4c-9944-1919c4ca1ce1.webp", author: "BFad07", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/371/view-base" },
  { base: "Lunges", url: "https://wger.de/media/exercise-images/113/Walking-lunges-1.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/206/view-base" },
  { base: "Plank", url: "https://wger.de/media/exercise-images/458/b7bd9c28-9f1d-4647-bd17-ab6a3adf5770.png", author: "utkb", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/458/view-base" },
  { base: "Preacher curl", url: "https://wger.de/media/exercise-images/193/Preacher-curl-3-1.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/465/view-base" },
  { base: "Prone Row", url: "https://wger.de/media/exercise-images/1283/e7262f70-7512-408a-8d00-4c499ef632fc.jpg", author: "carlos3c", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/1283/view-base" },
  { base: "Pull-ups", url: "https://wger.de/media/exercise-images/475/b0554016-16fd-4dbe-be47-a2a17d16ae0e.jpg", author: "Imobard", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/475/view-base" },
  { base: "Reverse fly", url: "https://wger.de/media/exercise-images/487/ad724e5c-b1ed-49e8-9279-a17545b0dd0b.png", author: "cshep442", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/487/view-base" },
  { base: "Row", url: "https://wger.de/media/exercise-images/109/Barbell-rear-delt-row-1.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/83/view-base" },
  { base: "Russian twists", url: "https://wger.de/media/exercise-images/1193/70ca5d80-3847-4a8c-8882-c6e9e485e29e.png", author: "lion", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/1193/view-base" },
  { base: "Seated row", url: "https://wger.de/media/exercise-images/1117/2555c4c3-a84d-47db-b83b-cbf721f12e45.png", author: "Franpol", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/1117/view-base" },
  { base: "Shoulder press", url: "https://wger.de/media/exercise-images/123/dumbbell-shoulder-press-large-1.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/567/view-base" },
  { base: "Shrugs", url: "https://wger.de/media/exercise-images/151/Dumbbell-shrugs-2.png", author: "Everkinetic", license: "CC BY-SA 3", source: "https://wger.de/en/exercise/572/view-base" },
  { base: "Tricep extensions (single arm)", url: "https://wger.de/media/exercise-images/659/a60452f1-e2ea-43fe-baa6-c1a2208d060c.png", author: "Franpol", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/659/view-base" },
  { base: "Triceps pushdown", url: "https://wger.de/media/exercise-images/805/7a437824-e2cc-46e1-804a-674f0ea31d25.png", author: "cshep442", license: "CC BY-SA 4", source: "https://wger.de/en/exercise/805/view-base" },
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  const apply = process.argv.includes("--apply");
  const sql = neon(process.env.DATABASE_URL!);
  const shared = await sql`select distinct coalesce(group_name, name) as base from exercise
    where type = 'strength' and (user_id is null or is_shared)`;
  const known = new Set(shared.map((row) => row.base as string));
  const missing = PICKS.filter((pick) => !known.has(pick.base));
  if (missing.length) throw new Error(`Findes ikke som delt øvelse: ${missing.map((pick) => pick.base).join(", ")}`);

  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });

  for (const pick of PICKS) {
    const key = `exercise-images/${slug(pick.base)}.webp`;
    if (!apply) { console.log(`${pick.base} -> ${key} (${pick.license}, ${pick.author})`); continue; }
    const response = await fetch(pick.url);
    if (!response.ok) throw new Error(`Kunne ikke hente ${pick.url}: ${response.status}`);
    const image = await sharp(Buffer.from(await response.arrayBuffer()))
      .flatten({ background: "#ffffff" })
      .resize(512, 512, { fit: "contain", background: "#ffffff" })
      .webp({ quality: 82 })
      .toBuffer();
    await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: image, ContentType: "image/webp" }));
    await sql`insert into exercise_image (base_name, type, image_key, author, license, source_url, is_ai_generated)
      values (${pick.base}, 'strength', ${key}, ${pick.author}, ${pick.license}, ${pick.source}, ${Boolean(pick.ai)})
      on conflict (lower(base_name), type) do update set image_key = excluded.image_key, author = excluded.author,
        license = excluded.license, source_url = excluded.source_url, is_ai_generated = excluded.is_ai_generated`;
    console.log(`Gemt: ${pick.base} (${Math.round(image.length / 1024)} KB)`);
  }
  console.log(apply ? `Færdig: ${PICKS.length} billeder.` : `Prøvekørsel: ${PICKS.length} billeder. Kør med --apply for at gemme.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
