// lib/auth.ts
//
// Opsætning af Better Auth med samme Postgres-database som resten af appen
// (lib/db/index.ts) via Drizzle-adapteren. Schemaet (ekstra kolonner på `user`
// og nye tabeller til `session`/`account`/`verification`) er genereret med
// `npx auth@latest generate` og migreres med drizzle-kit generate/migrate.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/lib/db";
import { account, rateLimit, session, user, verification } from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, rateLimit },
    // neon-http understøtter ikke de interaktive transaktioner, adapteren
    // ellers bruger til handlinger med flere trin, fx bruger og konto ved
    // tilmelding. Derfor slås adapterens transaktioner fra.
    transaction: false,
  }),
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Samme grænser bruges af invitationsfunktionen.
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Lukket app til 1-3 kendte personer. Konti oprettes via ZETs eget
    // invitationsforløb. Better Auths offentlige tilmelding er slået fra.
    disableSignUp: true,
  },
  // Tabellerne user/workout/exercise bruger allerede UUID som primærnøgler
  // (se lib/db/schema.ts). Indstillingen sikrer, at Better Auth også bruger
  // UUID, så id'erne passer til de eksisterende fremmednøgler.
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
});
