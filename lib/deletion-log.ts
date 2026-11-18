import "server-only";
import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Sletteliste til genindlæsning af backups (backup/GENDANNELSE.md).
// En genindlæst backup kan indeholde konti, der er slettet efter backuppen blev taget.
// Derfor gemmes en tom fil pr. slettet konto i backup-bucketten, UDEN for databasen:
// kun bruger-id'et (filnavnet) og tidspunktet (filens LastModified), aldrig navn eller e-mail.
// Backup-jobbet sletter filer, der er ældre end 15 dage (længere end den ældste backup).
// Efter en genindlæsning sletter scripts/reapply-deletions.ts kontiene på listen igen.

const PREFIX = process.env.DELETION_LOG_PREFIX || "deletions/";

let client: S3Client | undefined;
function s3() {
  client ??= new S3Client({
    endpoint: process.env.DELETION_LOG_S3_ENDPOINT,
    region: process.env.DELETION_LOG_S3_REGION,
    credentials: {
      accessKeyId: process.env.DELETION_LOG_ACCESS_KEY_ID!,
      secretAccessKey: process.env.DELETION_LOG_SECRET_ACCESS_KEY!,
    },
  });
  return client;
}

export function deletionLogConfigured() {
  return Boolean(process.env.DELETION_LOG_BUCKET && process.env.DELETION_LOG_S3_ENDPOINT && process.env.DELETION_LOG_S3_REGION
    && process.env.DELETION_LOG_ACCESS_KEY_ID && process.env.DELETION_LOG_SECRET_ACCESS_KEY);
}

// På Railway SKAL listen virke, ellers må ingen konto slettes. Lokalt (udvikling og tests)
// springes den over, så testerne aldrig skriver i den rigtige bucket ved et uheld.
export function deletionLogRequired() {
  return Boolean(process.env.RAILWAY_ENVIRONMENT_NAME);
}

const keyFor = (userId: string) => `${PREFIX}${userId}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function recordDeletion(userId: string) {
  if (!UUID.test(userId)) throw new Error("Ugyldigt bruger-id.");
  await s3().send(new PutObjectCommand({ Bucket: process.env.DELETION_LOG_BUCKET, Key: keyFor(userId), Body: new Uint8Array() }));
}

export async function forgetDeletion(userId: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: process.env.DELETION_LOG_BUCKET, Key: keyFor(userId) }));
}

export type DeletionEntry = { userId: string; deletedAt: Date };

export async function listDeletions(): Promise<DeletionEntry[]> {
  const entries: DeletionEntry[] = [];
  let token: string | undefined;
  do {
    const page = await s3().send(new ListObjectsV2Command({ Bucket: process.env.DELETION_LOG_BUCKET, Prefix: PREFIX, ContinuationToken: token }));
    for (const item of page.Contents ?? []) {
      const userId = item.Key?.slice(PREFIX.length);
      if (userId && UUID.test(userId) && item.LastModified) entries.push({ userId, deletedAt: item.LastModified });
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return entries.sort((a, b) => a.deletedAt.getTime() - b.deletedAt.getTime());
}
