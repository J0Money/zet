import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";

// Kun brugere med role "admin" i databasen må nå invitationsadministrationen.
// Uden en gyldig sessionsbruger sender requireUser() allerede videre til /login.
export async function requireAdmin() {
  const currentUser = await requireUser();
  const [row] = await db.select({ role: user.role }).from(user)
    .where(eq(user.id, currentUser.id)).limit(1);
  if (row?.role !== "admin") {
    redirect("/dashboard");
  }
  return currentUser;
}
