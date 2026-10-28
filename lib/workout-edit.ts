import "server-only";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { db } from "./db";
import { getWorkoutById } from "./workout-store";
import { WorkoutEditError, validateWorkoutEdit, type WorkoutEdit } from "./workout-edit-input";
import { equipmentName } from "./exercise-names";

const versionSql = sql`md5(row_to_json(w)::text || coalesce((select jsonb_agg(to_jsonb(s) order by s.id)::text from workout_set s where s.workout_id = w.id), '') || coalesce((select jsonb_agg(to_jsonb(c) order by c.id)::text from workout_cardio c where c.workout_id = w.id), ''))`;
export async function getWorkoutEditVersion(userId: string, id: string): Promise<string> {
  const result = await db.execute(sql`select ${versionSql} as version from workout w where w.id = ${id}::uuid and w.user_id = ${userId}::uuid`);
  return String(result.rows[0]?.version ?? "");
}

export async function saveWorkoutEdit(userId: string, id: string, version: string, input: WorkoutEdit) {
  const original = await getWorkoutById(userId, id);
  if (!original) throw new WorkoutEditError("Træningen findes ikke.");
  const { start, end } = validateWorkoutEdit(input, original);
  const payload = JSON.stringify(input.entries);
  // One SQL statement: validation, metadata, deletions and upserts succeed or roll back together.
  const statement = sql`
    with incoming as (select * from jsonb_to_recordset(${payload}::jsonb) as x(id uuid, exercise_id uuid, kind text, reps integer, weight_kg double precision, distance_km double precision, duration_sec integer, equipment text)),
    allowed as (select w.id from workout w where w.id = ${id}::uuid and w.user_id = ${userId}::uuid and ${versionSql} = ${version}
      and not exists (select 1 from incoming i left join exercise e on e.id = i.exercise_id where e.id is null or e.type::text <> i.kind or not (e.user_id is null or e.user_id = ${userId}::uuid or e.is_shared))
      and not exists (select 1 from incoming i join workout_set s on s.id = i.id where s.workout_id <> w.id or i.kind <> 'strength')
      and not exists (select 1 from incoming i join workout_cardio c on c.id = i.id where c.workout_id <> w.id or i.kind <> 'cardio')
      for update),
    changed as (update workout w set date = ${input.date}::date, notes = ${input.notes}, started_at = ${start}::timestamptz, ended_at = ${end}::timestamptz from allowed a where w.id = a.id returning w.id),
    requested as (
      select distinct on (coalesce(e.group_name, e.name), i.kind, i.equipment)
        coalesce(e.group_name, e.name) as group_name, i.kind, nullif(i.equipment, 'none') as equipment, e.id as source_id
      from incoming i join exercise e on e.id = i.exercise_id cross join changed w where i.equipment is not null
      order by coalesce(e.group_name, e.name), i.kind, i.equipment, e.id
    ),
    matched as (
      select r.*, (select e.id from exercise e where e.type::text = r.kind
        and coalesce(e.group_name, e.name) = r.group_name and e.equipment::text is not distinct from r.equipment
        and (e.user_id is null or e.user_id = ${userId}::uuid or e.is_shared) order by e.id limit 1) as existing_id
      from requested r
    ),
    created_variants as (
      insert into exercise (user_id, name, type, group_name, equipment, is_shared)
      select ${userId}::uuid, case when m.equipment is null then m.group_name else m.group_name || ' (' || (${JSON.stringify(equipmentName)}::jsonb ->> m.equipment) || ')' end,
        m.kind::exercise_type, m.group_name, m.equipment::equipment, true from matched m where m.existing_id is null
      returning id, group_name, type, equipment
    ),
    copied_muscles as (
      insert into exercise_muscle_group (exercise_id, muscle_group)
      select v.id, g.muscle_group from created_variants v join matched m on m.group_name = v.group_name
        and m.kind = v.type::text and m.equipment is not distinct from v.equipment::text
      join exercise_muscle_group g on g.exercise_id = m.source_id returning exercise_id
    ),
    resolved as (
      select i.*, case when i.equipment is null then i.exercise_id else coalesce(m.existing_id, v.id) end as resolved_id
      from incoming i join exercise e on e.id = i.exercise_id
      left join matched m on m.group_name = coalesce(e.group_name, e.name) and m.kind = i.kind
        and m.equipment is not distinct from nullif(i.equipment, 'none')
      left join created_variants v on v.group_name = m.group_name and v.type::text = m.kind and v.equipment::text is not distinct from m.equipment
    ),
    removed_strength as (delete from workout_set s using changed w where s.workout_id = w.id and not exists (select 1 from incoming i where i.id = s.id) returning s.id),
    removed_cardio as (delete from workout_cardio c using changed w where c.workout_id = w.id and not exists (select 1 from incoming i where i.id = c.id) returning c.id),
    saved_strength as (insert into workout_set (id, workout_id, exercise_id, reps, weight_kg) select i.id, w.id, i.resolved_id, i.reps, i.weight_kg from resolved i cross join changed w where i.kind = 'strength'
      on conflict (id) do update set exercise_id = excluded.exercise_id, reps = excluded.reps, weight_kg = excluded.weight_kg where workout_set.workout_id = excluded.workout_id returning id),
    saved_cardio as (insert into workout_cardio (id, workout_id, exercise_id, distance_km, duration_sec) select i.id, w.id, i.resolved_id, i.distance_km, i.duration_sec from resolved i cross join changed w where i.kind = 'cardio'
      on conflict (id) do update set exercise_id = excluded.exercise_id, distance_km = excluded.distance_km, duration_sec = excluded.duration_sec where workout_cardio.workout_id = excluded.workout_id returning id)
    select id from changed`;
  const query = new PgDialect().sqlToQuery(statement);
  // Neon's non-interactive transaction API supports serializable isolation.
  const [result] = await db.$client.transaction([db.$client.query(query.sql, query.params)], { isolationLevel: "Serializable" });
  if ((Array.isArray(result) ? result.length : result.rows.length) !== 1) throw new WorkoutEditError("Træningen er ændret siden du åbnede den, eller en øvelse er ikke tilgængelig. Genindlæs og prøv igen.");
}
