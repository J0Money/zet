import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { randomInt } from "node:crypto";
config({ path: ".env.local", quiet: true });
const marker = "[ZET skivestang-demo 2026-10-28]%";
function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`select w.id, w.date::text, date_trunc('week', w.date)::date::text as week
    from workout w join "user" u on u.id=w.user_id
    where u.email='admin@123.dk' and u.role='admin' and w.notes like ${marker} order by w.date`;
  if (rows.length !== 131) throw new Error("Uventet antal demo-pas.");
  const groups = new Map<string, typeof rows>();
  for (const row of rows) groups.set(row.week, [...(groups.get(row.week) ?? []), row]);
  if (groups.size !== 38) throw new Error("Uventet antal demo-uger.");
  const weeks = shuffle([...groups.keys()]);
  // Sammen med de to oprindelige skiver: 7 Bronze, 14 Sølv, 14 Guld, 5 Diamant.
  const counts = shuffle([...Array<number>(6).fill(2), ...Array<number>(14).fill(3), ...Array<number>(13).fill(4), ...Array<number>(5).fill(5)]);
  const pool = shuffle(rows);
  let cursor = 0;
  const updates = counts.flatMap((count, index) => {
    const group = pool.slice(cursor, cursor + count);
    cursor += count;
    const offsets = shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, group.length);
    return group.map((row, i) => {
      const date = new Date(weeks[index]);
      date.setUTCDate(date.getUTCDate() + offsets[i]);
      return { id: row.id, old_date: row.date, date: date.toISOString().slice(0, 10), hour: randomInt(7, 20) };
    });
  });
  const [changed] = await sql.transaction([
    sql`with changes as (select * from jsonb_to_recordset(${JSON.stringify(updates)}::jsonb) as c(id uuid, old_date date, date date, hour int)),
      ready as (select count(*)=131 as ok from changes c join workout w on w.id=c.id and w.date=c.old_date
        join "user" u on u.id=w.user_id where u.email='admin@123.dk' and u.role='admin' and w.notes like ${marker}),
      updated as (update workout w set date=c.date,
        started_at=(c.date + make_time(c.hour,0,0)) at time zone 'Europe/Copenhagen',
        ended_at=(c.date + make_time(c.hour,20,0)) at time zone 'Europe/Copenhagen'
        from changes c, ready r where r.ok and w.id=c.id returning w.id,w.started_at),
      activities as (update workout_cardio a set created_at=u.started_at at time zone 'UTC' from updated u where a.workout_id=u.id returning a.id)
      select (select count(*)::int from updated) as workouts, (select count(*)::int from activities) as activities`,
  ], { isolationLevel: "Serializable" });
  if (changed[0].workouts !== 131 || changed[0].activities !== 131) throw new Error("Opdateringen kunne ikke bekræftes.");
  const verified = await sql`select date_trunc('week',w.date)::date::text as week,count(distinct w.date)::int as days
    from workout w join "user" u on u.id=w.user_id where u.email='admin@123.dk' and w.notes like ${marker}
    group by 1 order by 1`;
  const expected = new Map<string, number>();
  for (const update of updates) {
    const d = new Date(update.date);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
    const week = d.toISOString().slice(0,10);expected.set(week,(expected.get(week)??0)+1);
  }
  if (verified.length!==38 || verified.some(row=>expected.get(row.week)!==row.days)) throw new Error("Kontrol af fordelingen fejlede.");
  console.log(JSON.stringify({ verifiedWorkouts: changed[0].workouts, weeks: verified.length, daysPerWeek: verified.map(row=>row.days) }));
}
main().catch(()=>{console.error("Blandingen af demo-data kunne ikke bekræftes.");process.exitCode=1;});
