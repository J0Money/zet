"use server";

import { headers } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pushSubscription } from "@/lib/db/schema";
import { validPushSubscription } from "@/lib/community-input";
import { pushConfigured } from "@/lib/push";

async function currentSession() {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) throw new Error("Log ind igen for at ændre notifikationer.");
  return result;
}

export async function enablePush(value: unknown) {
  const current = await currentSession();
  if (!pushConfigured()) return { error: "Push er ikke klar endnu." };
  if (!validPushSubscription(value)) return { error: "Browserens push-tilmelding kunne ikke godkendes." };
  const rows = await db.insert(pushSubscription).values({ user_id: current.user.id, session_id: current.session.id,
    endpoint: value.endpoint, p256dh: value.keys.p256dh, auth: value.keys.auth })
    .onConflictDoUpdate({ target: pushSubscription.endpoint,
      set: { session_id: current.session.id, p256dh: value.keys.p256dh, auth: value.keys.auth },
      setWhere: eq(pushSubscription.user_id, current.user.id) }).returning({ id: pushSubscription.id });
  return rows.length ? { success: true } : { error: "Denne browser er tilmeldt en anden konto. Slå push fra på den konto først." };
}

export async function disablePush(endpoint: string) {
  const current = await currentSession();
  await db.delete(pushSubscription).where(and(eq(pushSubscription.user_id, current.user.id), eq(pushSubscription.endpoint, endpoint)));
  return { success: true };
}

export async function pushStatus(endpoint: string) {
  const current = await currentSession();
  const [row] = await db.select({ found: sql<boolean>`true` }).from(pushSubscription)
    .where(and(eq(pushSubscription.user_id, current.user.id), eq(pushSubscription.session_id, current.session.id), eq(pushSubscription.endpoint, endpoint)));
  return Boolean(row);
}
