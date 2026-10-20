# ZET

Personal workout logging web app (mobile friendly) with a dashboard. Primarily for the owner (Joe), but 1-2 friends may use it later, so every user must have their own data.

## About the developer

Joe is an intern learning web development. Always reply in Danish. Code, variable names and code comments are in English.

## How to work with Joe

- Explain why behind technical choices, not only how. Do not assume he knows the concept.
- Work in small, reviewable steps. Stop after each step so he can check the result in the browser.
- Division of roles: Claude writes most of the code. Joe makes architecture and infrastructure decisions (stack, database, hosting, auth, data model, folder structure, third-party services, deployment).
- Implement the code yourself, but stop and ask Joe before any architecture or infrastructure decision, or any change that touches several files. Present 2 to 3 options with trade-offs and a recommendation, and let Joe choose.
- When Joe asks to "see the proposals" or to "wait for his choice", write no code until he answers, not even small choices like date/text formats.
- No unused code, dead imports or redundant CSS.
- After each task: list what was created or changed, and suggest what can be removed (scratch files, unused functions).
- Never paste secrets. The database URL lives in `.env.local` (git ignored). Never commit it.
- Do not run `npm audit fix --force`.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- No `src/` directory. Code lives in `app/` and `lib/` in the project root. Import alias `@/*` points to the project root.
- Planned later: Postgres on Neon (EU region), Drizzle ORM, login (Better Auth or Auth.js, decided at the login step).
- Charts: Recharts (used on the dashboard).
- Icons: Phosphor (`@phosphor-icons/react`).

## Data model (core)

- user: id (uuid), email, name
- exercise: id (uuid), user_id (null for shared), name, type (strength or cardio), muscle group
- workout: id (uuid), user_id, date, notes. Unique on (user_id, date), one workout per user per day.
- workout_set: id (uuid), workout_id, exercise_id, reps, weight_kg (strength)
- workout_cardio: id (uuid), workout_id, exercise_id, distance_km, duration_sec (cardio)

Exercises are stored as structured data, not free text. That is what makes records, volume per muscle group and charts possible.

In TypeScript, a workout entry is a discriminated union: `Entry = StrengthEntry | CardioEntry`, separated by a `kind` field (`"strength"` or `"cardio"`).

Implemented in Postgres (Neon, EU region) via Drizzle. Schema in `lib/db/schema.ts`, migrations in `drizzle/`.

## Conventions introduced while building

- **Rendering:** any page that reads from the store or depends on "now" (today's date, the current user) uses `await connection()` plus `export const instant = false`, with a short comment explaining why. This is required because `cacheComponents` is enabled in `next.config.ts`, which prerenders pages statically by default.
- **Data access:** all reads/writes go through `lib/workout-store.ts`, backed by Postgres (Neon) via Drizzle. Pages `await` the store's functions and pass the data down as props to "dumb" card/list components, the components themselves never import the store or the database client directly.
- **One workout per day:** enforced by a unique constraint on `workout(user_id, date)`. `getOrCreateWorkoutForDate` uses a single upsert (`ON CONFLICT ... DO UPDATE` with a no-op update) instead of a separate check-then-insert, since Neon's HTTP driver doesn't support interactive transactions.
- **Ownership:** ownership checks live in the store (`getWorkoutById`), never in a page. An unknown id and a foreign user's id must behave identically (`notFound()`), so a page can never be used to guess whether an id exists.
- **Current user:** `CURRENT_USER_ID` in `lib/workout-store.ts` points at `SEEDED_USER_ID` (`lib/db/constants.ts`), a fixed id for the one seeded user. Stand-in until step 7 adds real login, only the source of this id changes then, not how the store uses it.
- **Dates:** both helpers live in `lib/dates.ts`. `getTodayInCopenhagen()` answers "what is today" using the real Europe/Copenhagen timezone (the server may run in UTC). `formatDateDanish()` formats an already-stored "YYYY-MM-DD" string, pinned to UTC, since that string has no timezone of its own, pinning it elsewhere could shift the displayed day.
- **Cardio display:** `formatCardio()` in `lib/format.ts`, the one place distance/duration gets turned into text (e.g. "5,2 km på 26 min 30 sek").

## Dashboard goals

- Latest workouts
- Chart of weight progression for a chosen exercise
- Weekly total training volume
- Personal records
- Streak: number of weeks in a row with training

## Plan (build order)

0. Done: project created with Next.js, Tailwind v4 and TypeScript.
1. Done: Types and mock data (`lib/types.ts`, `lib/mock-data.ts`).
2. Done: App shell: layout and mobile navigation (bottom bar: Dashboard, Log, History), empty pages.
3. Done: Dashboard with mock data, one card at a time.
4. Done: Log a workout: form for strength and cardio, temporarily in memory (`lib/workout-store.ts`).
5. Done: History: list and detail view.
6. Done: Database and Drizzle (Neon): `lib/workout-store.ts` reads and writes Postgres, `lib/mock-data.ts` removed.
7. **Next up:** Login: each user gets their own data.
8. Polish and deploy (for example Vercel).

## Verification

- Step 6: migration runs, tables exist in the database.
- Step 7: two test users cannot see each other's data.
- Steps 4 and 5: a logged workout appears in history after reload.
- Step 3 and later: dashboard numbers match manually calculated numbers for test data.
- Test the whole flow on a real phone.

## Naming

The app is called ZET (a play on the Danish word "saet", meaning a set in strength training). Use `zet` in code, repo and domain. Show the brand name as "Zæt" in the UI only if Joe decides so.
