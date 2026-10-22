import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listInvitations } from "@/lib/invitations";
import { InvitationForm } from "./invitation-form";
import { InvitationList } from "./invitation-list";

export const metadata: Metadata = {
  title: "Invitationer | ZET",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function InvitationsAdminPage() {
  // Listen og adgangstjekket skal altid være friske, siden må ikke forhåndsgenereres.
  await connection();
  await requireAdmin();
  const invitations = await listInvitations();

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-8 pt-10 sm:pt-16">
      <p className="mb-8 text-sm font-bold tracking-[0.22em] text-indigo-600">ZET</p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Invitationer</h1>
      <p className="mb-8 mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Opret et invitationslink til en ven. Linket gælder i syv dage og kan kun bruges én gang.
      </p>
      <InvitationForm />
      <h2 className="mb-3 mt-10 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Tidligere invitationer</h2>
      <InvitationList invitations={invitations} />
    </div>
  );
}
