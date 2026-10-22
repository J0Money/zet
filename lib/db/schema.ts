// lib/db/schema.ts
//
// Mirrors the data model in CLAUDE.md. uuid primary keys match the existing
// `id: string` TypeScript types and crypto.randomUUID() usage, so nothing in
// lib/types.ts needs to change.

import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const exerciseType = pgEnum("exercise_type", ["strength", "cardio"]);

export const muscleGroup = pgEnum("muscle_group", [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "core",
  "full_body",
]);

export const userRole = pgEnum("user_role", ["admin", "member"]);

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  // Added by Better Auth's generated schema (npx auth generate).
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  // Styrer adgang til /admin/invitations, se lib/admin.ts. Nye brugere
  // (inklusive dem, der oprettes via invitationslinks) får "member" som
  // standard; kun Joes bruger er sat til "admin" direkte i databasen.
  role: userRole("role").notNull().default("member"),
});

// Better Auth's own tables, generated via `npx auth generate` (uuid ids
// configured in lib/auth.ts to match our existing tables).
export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// Invitationer hører til ZET og bruges ikke af Better Auth-adapteren.
// Gem kun et SHA-256-hash af den tilfældige kode fra invitationslinket.
export const invitation = pgTable("invitation", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Adressen normaliseres på serveren og bestemmer den nye brugers e-mail.
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  // Ved accept skal brug af invitationen og kontooprettelse ske samlet.
  usedAt: timestamp("used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

// Én fælles tæller pr. invitation, også når appen kører på flere servere.
// Rækken slettes automatisk sammen med invitationen.
export const invitationAttempt = pgTable("invitation_attempt", {
  invitationId: uuid("invitation_id")
    .primaryKey()
    .references(() => invitation.id, { onDelete: "cascade" }),
  attempts: integer("attempts").notNull(),
  windowEndsAt: timestamp("window_ends_at", { withTimezone: true }).notNull(),
});

// Better Auths egen fælles tæller til HTTP-endpoints, herunder login.
export const rateLimit = pgTable("rate_limit", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const exercise = pgTable("exercise", {
  id: uuid("id").primaryKey().defaultRandom(),
  // null means shared across all users.
  user_id: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: exerciseType("type").notNull(),
});

// En øvelse kan ramme flere muskelgrupper (fx dips: bryst og triceps), derfor
// en separat tabel i stedet for ét fast felt på exercise.
export const exerciseMuscleGroup = pgTable(
  "exercise_muscle_group",
  {
    exercise_id: uuid("exercise_id")
      .notNull()
      .references(() => exercise.id, { onDelete: "cascade" }),
    muscle_group: muscleGroup("muscle_group").notNull(),
  },
  (table) => [
    unique("exercise_muscle_group_exercise_id_muscle_group_unique")
      .on(table.exercise_id, table.muscle_group),
  ],
);

export const workout = pgTable(
  "workout",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // { mode: "string" } keeps this a plain "YYYY-MM-DD" string in
    // TypeScript, matching Workout.date and
    // formatDateDanish()/getTodayInCopenhagen().
    date: date("date", { mode: "string" }).notNull(),
    notes: text("notes").notNull().default(""),
  },
  (table) => [
    // One workout per user per day. Lets getOrCreateWorkoutForDate use a
    // single upsert instead of a check-then-insert that could race.
    unique("workout_user_id_date_unique").on(table.user_id, table.date),
  ],
);

export const workoutSet = pgTable("workout_set", {
  id: uuid("id").primaryKey().defaultRandom(),
  workout_id: uuid("workout_id")
    .notNull()
    .references(() => workout.id, { onDelete: "cascade" }),
  exercise_id: uuid("exercise_id")
    .notNull()
    .references(() => exercise.id),
  reps: integer("reps").notNull(),
  weight_kg: doublePrecision("weight_kg").notNull(),
  // Orders sets within an exercise/workout: "Sæt 1, Sæt 2, ..." by insertion
  // order. A plain SELECT has no guaranteed row order without this.
  // clock_timestamp() (not now()) advances per row even within one
  // transaction/statement, now() is frozen for the whole transaction, which
  // would give identical timestamps when seeding several sets at once.
  created_at: timestamp("created_at")
    .notNull()
    .default(sql`clock_timestamp()`),
});

export const workoutCardio = pgTable("workout_cardio", {
  id: uuid("id").primaryKey().defaultRandom(),
  workout_id: uuid("workout_id")
    .notNull()
    .references(() => workout.id, { onDelete: "cascade" }),
  exercise_id: uuid("exercise_id")
    .notNull()
    .references(() => exercise.id),
  distance_km: doublePrecision("distance_km").notNull(),
  duration_sec: integer("duration_sec").notNull(),
  created_at: timestamp("created_at")
    .notNull()
    .default(sql`clock_timestamp()`),
});

// En navngivet liste af øvelser (fx "Pushdag"), til hurtigt at filtrere
// øvelsesvalget på log-siden. Altid ejet af én bruger; is_published styrer,
// om andre også kan se og bruge den (ikke user_id null som exercise, en
// delt øvelse har ingen ejer, et delt program har stadig en ejer, der kan
// trække det tilbage igen).
export const trainingProgram = pgTable("training_program", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  is_published: boolean("is_published").notNull().default(false),
  created_at: timestamp("created_at")
    .notNull()
    .default(sql`clock_timestamp()`),
});

// Øvelserne i et program, i den rækkefølge de blev valgt (position).
export const trainingProgramExercise = pgTable(
  "training_program_exercise",
  {
    program_id: uuid("program_id")
      .notNull()
      .references(() => trainingProgram.id, { onDelete: "cascade" }),
    exercise_id: uuid("exercise_id")
      .notNull()
      .references(() => exercise.id),
    position: integer("position").notNull(),
  },
  (table) => [
    unique("training_program_exercise_program_id_exercise_id_unique")
      .on(table.program_id, table.exercise_id),
  ],
);
