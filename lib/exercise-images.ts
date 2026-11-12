import "server-only";
import { db } from "@/lib/db";
import { exerciseImage } from "@/lib/db/schema";

import { exerciseImageKey, type ExerciseImageInfo } from "@/lib/exercise-groups";

const PREFIX = "exercise-images/";
export const EXERCISE_IMAGE_SLUG = /^[a-z0-9-]{1,100}$/;

export async function getExerciseImages(): Promise<Record<string, ExerciseImageInfo>> {
  const rows = await db.select().from(exerciseImage);
  const result: Record<string, ExerciseImageInfo> = {};
  for (const row of rows) {
    const slug = row.image_key.startsWith(PREFIX) && row.image_key.endsWith(".webp")
      ? row.image_key.slice(PREFIX.length, -".webp".length) : null;
    if (!slug || !EXERCISE_IMAGE_SLUG.test(slug)) continue;
    result[exerciseImageKey(row.type, row.base_name)] = {
      src: `/api/exercise-image/${slug}`,
      author: row.author,
      license: row.license,
      sourceUrl: row.source_url,
      aiGenerated: row.is_ai_generated,
    };
  }
  return result;
}

export const exerciseImageObjectKey = (slug: string) => `${PREFIX}${slug}.webp`;
