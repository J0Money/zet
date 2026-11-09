import "server-only";
import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Railways Buckets er private og S3-kompatible. Værdierne sættes som Variable References til bucketten.
let client: S3Client | undefined;
function s3() {
  client ??= new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });
  return client;
}

export function avatarStorageConfigured() {
  return Boolean(process.env.S3_ENDPOINT && process.env.S3_REGION && process.env.S3_BUCKET
    && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

export async function putAvatarObject(key: string, body: Uint8Array) {
  await s3().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: "image/webp" }));
}

export async function getAvatarObject(key: string) {
  try {
    const result = await s3().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    return result.Body?.transformToWebStream() ?? null;
  } catch (error) {
    if (error instanceof NoSuchKey) return null;
    throw error;
  }
}

export async function deleteAvatarObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
}

// Sletter alle billeder under brugerens præfiks (ved kontosletning), også rester
// fra tidligere billeder. Højst 1000 pr. omgang; en bruger har normalt ét.
export async function deleteAvatarObjectsFor(userId: string) {
  const listed = await s3().send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET, Prefix: `avatars/${userId}/` }));
  const keys = (listed.Contents ?? []).flatMap((item) => (item.Key ? [{ Key: item.Key }] : []));
  if (keys.length) await s3().send(new DeleteObjectsCommand({ Bucket: process.env.S3_BUCKET, Delete: { Objects: keys } }));
}
