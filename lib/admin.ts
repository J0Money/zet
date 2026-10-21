import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { getOptionalUser, requireUser } from "@/lib/session";

async function getUserRole(userId: string): Promise<"admin" | "member" | undefined> {
  const [row] = await db.select({ role: user.role }).from(user)
    .where(eq(user.id, userId)).limit(1);
  return row?.role;
}

// Kun brugere med role "admin" i databasen må nå invitationsadministrationen.
// Uden en gyldig sessionsbruger sender requireUser() allerede videre til /login.
export async function requireAdmin() {
  const currentUser = await requireUser();
  if ((await getUserRole(currentUser.id)) !== "admin") {
    redirect("/dashboard");
  }
  return currentUser;
}

// Bruges til at vise/skjule admin-linket i navigationen. Returnerer altid
// false for besøgende uden session, i stedet for at omdirigere dem.
export async function isCurrentUserAdmin(): Promise<boolean> {
  const currentUser = await getOptionalUser();
  if (!currentUser) return false;
  return (await getUserRole(currentUser.id)) === "admin";
}
