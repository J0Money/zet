# ZET

Personal workout logging web app (mobile friendly) with a dashboard. Primarily for the owner (Joe), but 1-2 friends may use it later, so every user must have their own data.

## About the developer

Joe is an intern learning web development. Always reply in Danish. Code, variable names and code comments are in English.

## How to work with Joe

- Explain why behind technical choices, not only how. Do not assume he knows the concept.
- Work in small, reviewable steps. Stop after each step so he can check the result in the browser.
- Do not hand over finished code blindly. For learning tasks, give structure and hints first and let Joe write the code, then review it together.
- Ask before architecture decisions or changes that touch several files.
- No unused code, dead imports or redundant CSS.
- After each task: list what was created or changed, and suggest what can be removed (scratch files, unused functions).
- Never paste secrets. The database URL lives in `.env.local` (git ignored). Never commit it.
- Do not run `npm audit fix --force`.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- No `src/` directory. Code lives in `app/` and `lib/` in the project root. Import alias `@/*` points to the project root.
- Planned later: Postgres on Neon (EU region), Drizzle ORM, login (Better Auth or Auth.js, decided at the login step), Recharts for dashboard charts.

## Data model (core)

- user: id, email, name
- exercise: id, user_id (null for shared), name, type (strength or cardio), muscle group
- workout: id, user_id, date, notes
- workout_set: id, workout_id, exercise_id, reps, weight_kg (strength)
- workout_cardio: id, workout_id, exercise_id, distance_km, duration_sec (cardio)

Exercises are stored as structured data, not free text. That is what makes records, volume per muscle group and charts possible.

In TypeScript, a workout entry is a discriminated union: `Entry = StrengthEntry | CardioEntry`, separated by a `kind` field (`"strength"` or `"cardio"`).

## Dashboard goals

- Latest workouts
- Chart of weight progression for a chosen exercise
- Weekly total training volume
- Personal records
- Streak: number of weeks in a row with training

## Plan (build order)

0. Done: project created with Next.js, Tailwind v4 and TypeScript.
1. Types and mock data (`lib/types.ts`, `lib/mock-data.ts`).
2. App shell: layout and mobile navigation (bottom bar: Dashboard, Log, History), empty pages.
3. Dashboard with mock data, one card at a time.
4. Log a workout: form for strength and cardio, temporarily in memory.
5. History: list and detail view.
6. Database and Drizzle (Neon): replace mock data with real data.
7. Login: each user gets their own data.
8. Polish and deploy (for example Vercel).

## Verification

- Step 6: migration runs, tables exist in the database.
- Step 7: two test users cannot see each other's data.
- Steps 4 and 5: a logged workout appears in history after reload.
- Step 3 and later: dashboard numbers match manually calculated numbers for test data.
- Test the whole flow on a real phone.

## Naming

The app is called ZET (a play on the Danish word "saet", meaning a set in strength training). Use `zet` in code, repo and domain. Show the brand name as "Zæt" in the UI only if Joe decides so.
