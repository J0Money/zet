import type { Metadata } from "next";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { getInvitationDetails } from "@/lib/invitations";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Opret bruger | ZET",
  description: "Opret din ZET-konto med en personlig invitation.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// Invitationens gyldighed skal kontrolleres ved hvert besøg.
export const instant = false;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  await connection();
  const { token } = await searchParams;
  const details = await getInvitationDetails(token);

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-8 pt-10 sm:pt-16">
      <p className="mb-8 text-sm font-bold tracking-[0.22em] text-indigo-600">ZET</p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Opret bruger</h1>
      {details.status === "valid" && typeof token === "string" ? (
        <>
          <p className="mb-8 mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Du er inviteret til ZET. Vælg navn og adgangskode for at komme i gang.
          </p>
          <SignupForm
            token={token}
            email={details.email}
            minPasswordLength={auth.options.emailAndPassword.minPasswordLength}
            maxPasswordLength={auth.options.emailAndPassword.maxPasswordLength}
          />
        </>
      ) : (
        <div role="status" className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
            {details.status === "unavailable"
              ? "Vi kan ikke kontrollere invitationen lige nu"
              : token ? "Invitationen kan ikke bruges" : "Du skal bruge en invitation"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {details.status === "unavailable"
              ? "Prøv at genindlæse siden om lidt."
              : token
                ? "Linket er ugyldigt, udløbet eller allerede brugt. Bed den, der inviterede dig, om et nyt link."
                : "Åbn det personlige link, du har fået tilsendt, for at oprette din konto."}
          </p>
        </div>
      )}
    </div>
  );
}
