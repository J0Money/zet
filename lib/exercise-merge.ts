// Lægger en øvelse (kilden) ind i en anden (målet). Alt, der peger på kilden,
// flyttes til målet, og kilden slettes. Trinene skal køres i rækkefølge i ÉN
// transaktion (Neons ikke-interaktive batch, som i lib/account-deletion.ts):
// alle lykkes, eller ingen gør. Delte Community-opslag ændres ikke; kildens
// gamle navn gemmes som alias, så det stadig kan genkendes.

export type MergePair = { sourceId: string; sourceName: string; targetId: string; targetName: string };

export function buildMergeStatements<T>(query: (text: string, params: unknown[]) => T, pair: MergePair): T[] {
  const both = [pair.sourceId, pair.targetId];
  return [
    // Vagt: begge øvelser skal findes med de navne, der blev vist, og have samme
    // type. Ellers stopper division med nul hele transaktionen.
    query(
      `SELECT 1 / (CASE WHEN (
         SELECT count(*) FROM exercise s JOIN exercise t ON t.type = s.type
         WHERE s.id = $1::uuid AND s.name = $2 AND t.id = $3::uuid AND t.name = $4 AND s.id <> t.id
       ) = 1 THEN 1 ELSE 0 END)`,
      [pair.sourceId, pair.sourceName, pair.targetId, pair.targetName],
    ),
    query(`UPDATE workout_set SET exercise_id = $2::uuid WHERE exercise_id = $1::uuid`, both),
    query(`UPDATE workout_cardio SET exercise_id = $2::uuid WHERE exercise_id = $1::uuid`, both),
    // Programmer: står målet allerede i programmet, fjernes kildens linje. Resten flyttes.
    query(
      `DELETE FROM training_program_exercise p WHERE p.exercise_id = $1::uuid AND EXISTS (
         SELECT 1 FROM training_program_exercise t WHERE t.program_id = p.program_id AND t.exercise_id = $2::uuid)`,
      both,
    ),
    query(`UPDATE training_program_exercise SET exercise_id = $2::uuid WHERE exercise_id = $1::uuid`, both),
    // Huskenoter: har en bruger en note på begge, sættes de sammen (højst 500 tegn).
    query(
      `UPDATE exercise_note t SET note = left(t.note || E'\\n' || s.note, 500), updated_at = now()
       FROM exercise_note s
       WHERE s.exercise_id = $1::uuid AND t.exercise_id = $2::uuid AND s.user_id = t.user_id AND s.note <> t.note`,
      both,
    ),
    query(
      `DELETE FROM exercise_note s WHERE s.exercise_id = $1::uuid AND EXISTS (
         SELECT 1 FROM exercise_note t WHERE t.exercise_id = $2::uuid AND t.user_id = s.user_id)`,
      both,
    ),
    query(`UPDATE exercise_note SET exercise_id = $2::uuid WHERE exercise_id = $1::uuid`, both),
    query(
      `INSERT INTO exercise_muscle_group (exercise_id, muscle_group)
       SELECT $2::uuid, muscle_group FROM exercise_muscle_group WHERE exercise_id = $1::uuid
       ON CONFLICT DO NOTHING`,
      both,
    ),
    // Alias for bevægelsens navn, men kun når kilden er den sidste række med det
    // navn. Ellers findes bevægelsen stadig, og navnet må ikke pege et andet sted hen.
    query(
      `INSERT INTO exercise_alias (alias, base_name, type)
       SELECT coalesce(s.group_name, s.name), coalesce(t.group_name, t.name), s.type
       FROM exercise s, exercise t
       WHERE s.id = $1::uuid AND t.id = $2::uuid
         AND lower(coalesce(s.group_name, s.name)) <> lower(coalesce(t.group_name, t.name))
         AND NOT EXISTS (SELECT 1 FROM exercise o WHERE o.id <> s.id AND o.type = s.type
           AND lower(coalesce(o.group_name, o.name)) = lower(coalesce(s.group_name, s.name)))
       ON CONFLICT DO NOTHING`,
      both,
    ),
    query(`DELETE FROM exercise WHERE id = $1::uuid RETURNING id`, [pair.sourceId]),
  ];
}
