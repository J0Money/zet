import Link from "next/link";
import { connection } from "next/server";
import { ShieldCheck, SignOut } from "@phosphor-icons/react/dist/ssr";
import { logout } from "@/app/components/logout-action";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { isCurrentUserAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/session";
import { PushSettings } from "@/app/components/push-settings";
import { pushConfigured } from "@/lib/push";
import { getProfileImage } from "@/lib/avatars";
import { ProfileImageSettings } from "@/app/components/profile-image-settings";

// Siden afhænger af den aktuelle bruger (admin-status), så den kan ikke
// forhåndsgenereres statisk.
export const instant = false;

export default async function SettingsPage() {
  await connection();
  const currentUser = await requireUser();
  const image = await getProfileImage(currentUser.id);
  const isAdmin = await isCurrentUserAdmin();

  return (
    <div className="zet-page flex flex-col gap-6">
      <header className="zet-pageHeader">
        <p className="zet-brand">ZET</p>
        <h1>Indstillinger</h1>
      </header>

      <ProfileImageSettings userId={currentUser.id} name={currentUser.name} image={image} configured={Boolean(process.env.BLOB_READ_WRITE_TOKEN)} />
      <section className="flex flex-col gap-3">
        <h2 className="zet-sectionTitle">Udseende</h2>
        <ThemeToggle />
      </section>

      <PushSettings configured={pushConfigured()} />

      {isAdmin && (
        <section className="flex flex-col gap-3">
          <h2 className="zet-sectionTitle">Administration</h2>
          <Link
            href="/admin/invitations"
            className="zet-panel flex items-center justify-between gap-3 transition-colors hover:border-indigo-200 dark:hover:border-indigo-800"
          >
            <span className="flex items-center gap-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              <ShieldCheck aria-hidden="true" size={20} />
              Administrer invitationer
            </span>
            <span aria-hidden="true" className="text-zinc-400 dark:text-zinc-500">→</span>
          </Link>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="zet-sectionTitle">Konto</h2>
        <form action={logout}>
          <button
            type="submit"
            className="zet-panel flex w-full items-center gap-3 text-left text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:border-red-200 dark:hover:border-red-800"
          >
            <SignOut aria-hidden="true" size={20} />
            Log ud
          </button>
        </form>
      </section>
    </div>
  );
}
