import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

// Kun én bruger (Joe) må nå invitationsadministrationen. ADMIN_EMAIL sættes i
// .env.local (og senere i Vercel) og sammenlignes med sessionens e-mail.
// Uden en gyldig sessionsbruger sender requireUser() allerede videre til /login.
export async function requireAdmin() {
  const currentUser = await requireUser();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || currentUser.email.toLowerCase() !== adminEmail) {
    redirect("/dashboard");
  }
  return currentUser;
}
