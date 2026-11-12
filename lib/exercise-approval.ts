import "server-only";
import { db } from "@/lib/db";
import { buildMergeStatements } from "@/lib/exercise-merge";
import { displayExerciseName, variantName } from "@/lib/exercise-names";
import type { CableGrip, ExerciseSide } from "@/lib/exercise-side";
import { matchKey } from "@/lib/exercise-match";
import type { Equipment, ExerciseType, MuscleGroup } from "@/lib/types";

// Godkendelse af øvelser, brugere har oprettet. En ny øvelse er privat
// (is_shared = false), og ejeren kan bruge den med det samme. En admin vælger
// på /admin/exercises: godkend (deles med alle), læg sammen med en eksisterende
// øvelse (ejerens sæt flyttes med), eller slet (kun hvis den ikke er brugt).
// Ændringer sker i ÉN transaktion, som i lib/exercise-merge.ts.

export type ApprovalError = "exists" | "changed" | "used" | "invalid";
export type ApprovalResult = { ok: true } | { ok: false; error: ApprovalError };

type PendingRow = {
  id: string; user_id: string; user_name: string; name: string; type: ExerciseType; group_name: string | null;
  equipment: Equipment | null; side: string; sets: number; cardio: number; programs: number; muscles: MuscleGroup[];
};

export type PendingExercise = {
  ownerId: string;
  ownerName: string;
  type: ExerciseType;
  base: string;
  label: string;
  muscles: MuscleGroup[];
  variants: { id: string; label: string; uses: number }[];
  uses: number;
};

const baseOf = (row: { group_name: string | null; name: string }) => row.group_name ?? row.name;
const query = (text: string, params: unknown[] = []) => db.$client.query(text, params);
const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const isExerciseType = (value: unknown): value is ExerciseType => value === "strength" || value === "cardio";

async function pendingRows(): Promise<PendingRow[]> {
  return (await query(
    `SELECT e.id, e.user_id, u.name AS user_name, e.name, e.type, e.group_name, e.equipment, e.side,
       (SELECT count(*) FROM workout_set s WHERE s.exercise_id = e.id)::int AS sets,
       (SELECT count(*) FROM workout_cardio c WHERE c.exercise_id = e.id)::int AS cardio,
       (SELECT count(*) FROM training_program_exercise p WHERE p.exercise_id = e.id)::int AS programs,
       coalesce((SELECT json_agg(g.muscle_group) FROM exercise_muscle_group g WHERE g.exercise_id = e.id), '[]'::json) AS muscles
     FROM exercise e JOIN "user" u ON u.id = e.user_id
     WHERE e.is_shared = false AND e.user_id IS NOT NULL
     ORDER BY lower(e.name)`,
  )) as PendingRow[];
}

// Én post pr. ejer og bevægelse, med de varianter ejeren har oprettet (udstyr).
export async function listPendingExercises(): Promise<PendingExercise[]> {
  const groups = new Map<string, PendingExercise>();
  for (const row of await pendingRows()) {
    const key = `${row.user_id}|${row.type}|${baseOf(row)}`;
    const group = groups.get(key) ?? {
      ownerId: row.user_id, ownerName: row.user_name, type: row.type, base: baseOf(row),
      label: displayExerciseName(baseOf(row)), muscles: [], variants: [], uses: 0,
    };
    const uses = row.sets + row.cardio + row.programs;
    group.muscles = [...new Set([...group.muscles, ...row.muscles])];
    group.variants.push({ id: row.id, label: displayExerciseName(row.name), uses: row.sets + row.cardio });
    group.uses += uses;
    groups.set(key, group);
  }
  return [...groups.values()];
}

export async function countPendingExercises(): Promise<number> {
  const rows = (await query(
    `SELECT count(*)::int AS n FROM (SELECT DISTINCT user_id, type, coalesce(group_name, name)
       FROM exercise WHERE is_shared = false AND user_id IS NOT NULL) x`,
  )) as { n: number }[];
  return rows[0].n;
}

// Delte bevægelser, en afventende øvelse kan lægges ind i.
export async function listShareTargets(): Promise<{ type: ExerciseType; base: string; label: string }[]> {
  const rows = (await query(
    `SELECT DISTINCT type, coalesce(group_name, name) AS base FROM exercise
     WHERE user_id IS NULL OR is_shared ORDER BY 2`,
  )) as { type: ExerciseType; base: string }[];
  return rows.map((row) => ({ ...row, label: displayExerciseName(row.base) }));
}

type Variant = { id: string; name: string; equipment: Equipment | null; side: string; grip: CableGrip | null };

async function pendingVariants(ownerId: string, type: ExerciseType, base: string): Promise<Variant[]> {
  return (await query(
    `SELECT id, name, equipment, side, grip FROM exercise
     WHERE user_id = $1::uuid AND is_shared = false AND type = $2::exercise_type AND coalesce(group_name, name) = $3
     ORDER BY id`,
    [ownerId, type, base],
  )) as Variant[];
}

async function run(statements: unknown[]): Promise<ApprovalResult> {
  try {
    await db.$client.transaction(statements as never);
    return { ok: true };
  } catch {
    // Vagterne i sammenlægningen stopper hele transaktionen, hvis noget er ændret.
    console.error("Godkendelse af øvelse mislykkedes og er rullet tilbage.");
    return { ok: false, error: "changed" };
  }
}

// Deler hele ejerens bevægelse med alle. Afvises, hvis en delt øvelse allerede
// er den samme bevægelse: så skal den lægges sammen i stedet.
export async function approvePendingExercise(ownerId: unknown, type: unknown, base: unknown): Promise<ApprovalResult> {
  if (!isUuid(ownerId) || !isExerciseType(type) || typeof base !== "string" || !base) return { ok: false, error: "invalid" };
  const targets = await listShareTargets();
  if (targets.some((target) => target.type === type && matchKey(target.base) === matchKey(base))) {
    return { ok: false, error: "exists" };
  }
  const variants = await pendingVariants(ownerId, type, base);
  if (!variants.length) return { ok: false, error: "changed" };
  return run([
    query(
      `UPDATE exercise SET is_shared = true
       WHERE id = ANY($1::uuid[]) AND user_id = $2::uuid AND is_shared = false RETURNING id`,
      [variants.map((variant) => variant.id), ownerId],
    ),
  ]);
}

// Lægger ejerens bevægelse ind i en delt bevægelse. En variant med samme udstyr
// og side lægges ind i varianten (sæt, programmer og noter flyttes). En variant
// uden match bliver en ny, delt variant af målet.
export async function mergePendingExercise(
  ownerId: unknown, type: unknown, base: unknown, targetBase: unknown,
): Promise<ApprovalResult> {
  if (!isUuid(ownerId) || !isExerciseType(type) || typeof base !== "string" || !base
    || typeof targetBase !== "string" || !targetBase) return { ok: false, error: "invalid" };
  const sources = await pendingVariants(ownerId, type, base);
  const targets = (await query(
    `SELECT id, name, equipment, side, grip FROM exercise
     WHERE (user_id IS NULL OR is_shared) AND type = $1::exercise_type AND coalesce(group_name, name) = $2 ORDER BY id`,
    [type, targetBase],
  )) as Variant[];
  if (!sources.length || !targets.length) return { ok: false, error: "changed" };

  const statements: unknown[] = [
    query(
      `SELECT 1 / (CASE WHEN (SELECT count(*) FROM exercise WHERE id = ANY($1::uuid[]) AND user_id = $2::uuid AND is_shared = false) = $3
         AND (SELECT count(*) FROM exercise WHERE id = ANY($4::uuid[]) AND (user_id IS NULL OR is_shared)) = $5 THEN 1 ELSE 0 END)`,
      [sources.map((s) => s.id), ownerId, sources.length, targets.map((t) => t.id), targets.length],
    ),
  ];
  for (const source of sources) {
    const match = targets.find((target) => target.equipment === source.equipment && target.side === source.side && target.grip === source.grip);
    if (match) {
      statements.push(...buildMergeStatements(query, {
        sourceId: source.id, sourceName: source.name, targetId: match.id, targetName: match.name,
      }));
    } else {
      const name = variantName(targetBase, source.equipment, source.side as ExerciseSide, source.grip);
      statements.push(query(
        `UPDATE exercise SET group_name = $2, name = $3, is_shared = true WHERE id = $1::uuid`,
        [source.id, targetBase, name],
      ));
    }
  }
  // Det gamle navn gemmes, så søgning og Ranked kan genkende det.
  statements.push(query(
    `INSERT INTO exercise_alias (alias, base_name, type)
     SELECT $1, $2, $3::exercise_type
     WHERE lower($1) <> lower($2) AND NOT EXISTS (
       SELECT 1 FROM exercise o WHERE o.type = $3::exercise_type AND lower(coalesce(o.group_name, o.name)) = lower($1))
     ON CONFLICT DO NOTHING`,
    [base, targetBase, type],
  ));
  return run(statements);
}

// Sletter en bevægelse, som ingen har brugt. En brugt øvelse skal lægges sammen.
export async function deletePendingExercise(ownerId: unknown, type: unknown, base: unknown): Promise<ApprovalResult> {
  if (!isUuid(ownerId) || !isExerciseType(type) || typeof base !== "string" || !base) return { ok: false, error: "invalid" };
  const rows = (await pendingRows()).filter((row) => row.user_id === ownerId && row.type === type && baseOf(row) === base);
  if (!rows.length) return { ok: false, error: "changed" };
  if (rows.some((row) => row.sets + row.cardio + row.programs > 0)) return { ok: false, error: "used" };
  // Muskelgrupper og huskenoter følger med via cascade.
  return run([
    query(
      `DELETE FROM exercise WHERE id = ANY($1::uuid[]) AND user_id = $2::uuid AND is_shared = false RETURNING id`,
      [rows.map((row) => row.id), ownerId],
    ),
  ]);
}
