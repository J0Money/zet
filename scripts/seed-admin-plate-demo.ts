import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
const marker = "[ZET skivestang-demo 2026-10-28]";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const accounts = await sql`select id, email, name from "user" where email = 'admin@123.dk' and role = 'admin'`;
  if (accounts.length !== 1) throw new Error("Den forventede admin-konto blev ikke fundet.");
  const owner = accounts[0].id;
  const exercises = await sql`select id, name from exercise where type = 'cardio' and (user_id is null or user_id = ${owner}::uuid) order by case when lower(name) like '%walk%' then 0 else 1 end, name limit 1`;
  if (exercises.length !== 1) throw new Error("Ingen egnet cardioøvelse fundet.");
  const dates: string[] = [];
  for (let week = 0; week < 38; week++) {
    for (let day = 0; day < 2 + week % 4; day++) {
      const date = new Date("2026-01-05T00:00:00Z");
      date.setUTCDate(date.getUTCDate() + week * 7 + day);
      dates.push(date.toISOString().slice(0, 10));
    }
  }
  console.log(JSON.stringify({ account: accounts[0].email, exampleWorkouts: dates.length, weeks: 38, from: dates[0], to: dates.at(-1), exercise: exercises[0].name, marker }));
  if (!process.argv.includes("--apply")) return;
  const existing = await sql`select count(*)::int as count from workout where user_id=${owner}::uuid and notes like ${marker + '%'}`;
  if (existing[0].count > 0) {
    console.log("Demo-data findes allerede. Ingen nye pas tilføjet; datoerne kan være blandet efter oprettelsen.");
    return;
  }
  const [result] = await sql.transaction([
    sql`with inserted as (
      insert into workout(user_id, date, notes, started_at, ended_at)
      select u.id, d.value::date, ${marker} || ' Eksempeltræning til visning af skivesamlingen.',
        (d.value::date + time '12:00') at time zone 'Europe/Copenhagen',
        (d.value::date + time '12:20') at time zone 'Europe/Copenhagen'
      from "user" u cross join jsonb_array_elements_text(${JSON.stringify(dates)}::jsonb) d
      where u.id = ${owner}::uuid and u.email = 'admin@123.dk' and u.role = 'admin'
      and not exists (select 1 from workout w where w.user_id = u.id and w.date = d.value::date and w.notes like ${marker + '%'})
      returning id, started_at
    ), activities as (
      insert into workout_cardio(workout_id, exercise_id, distance_km, duration_sec, created_at)
      select id, ${exercises[0].id}::uuid, 2, 1200, started_at at time zone 'UTC' from inserted returning id
    ) select (select count(*) from inserted)::int as workouts, (select count(*) from activities)::int as activities`,
  ], { isolationLevel: "Serializable" });
  const verify = await sql`select count(*)::int as workouts, count(c.id)::int as activities,
    count(p.id)::int as shared_posts
    from workout w left join workout_cardio c on c.workout_id=w.id
    left join community_post p on p.workout_id=w.id
    where w.user_id=${owner}::uuid and w.notes like ${marker + '%'}`;
  if (verify[0].workouts !== dates.length || verify[0].activities !== dates.length || verify[0].shared_posts !== 0) throw new Error("Verifikationen af demo-data fejlede.");
  const medals = await sql`with weeks as (
    select date_trunc('week', w.date)::date as week, count(distinct w.date)::int as days
    from workout w where w.user_id=${owner}::uuid and w.date >= '2025-12-29' and w.date < '2026-10-26'
    and (w.started_at is null or w.ended_at is not null)
    and (exists(select 1 from workout_set s where s.workout_id=w.id) or exists(select 1 from workout_cardio c where c.workout_id=w.id))
    group by 1
  ) select case when days >= 5 then 'Diamant' when days = 4 then 'Guld' when days = 3 then 'Sølv' else 'Bronze' end as level, count(*)::int as plates
    from weeks where days >= 2 group by 1 order by 1`;
  console.log(JSON.stringify({ inserted: result[0], verified: verify[0], collection: medals }));
}
main().catch(() => { console.error("Demo-data kunne ikke bekræftes. Kontrollér konto og database før et nyt forsøg."); process.exitCode = 1; });
