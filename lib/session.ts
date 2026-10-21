import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Reacts cache gælder kun den aktuelle rendering, aldrig på tværs af brugere.
// Server Actions kontrollerer sessionen på ny ved hvert kald.
export const requireUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return { id: session.user.id, name: session.user.name };
});

// Som requireUser(), men omdirigerer ikke, returnerer null i stedet. Bruges
// hvor noget (fx bundnavigationen) skal virke ens for alle, uanset om man er
// logget ind, i stedet for at sende besøgende videre til /login.
export const getOptionalUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ? { id: session.user.id, name: session.user.name } : null;
});
