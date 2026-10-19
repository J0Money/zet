// lib/db/constants.ts
//
// Fixed id for Joe's seeded user row, shared between lib/db/seed.ts and
// lib/workout-store.ts's CURRENT_USER_ID. A hand-picked constant (not a
// random default) means the database can be reseeded from scratch without
// this id ever changing, so nothing referencing it needs updating.
export const SEEDED_USER_ID = "11111111-1111-1111-1111-111111111111";
