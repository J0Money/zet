import Link from "next/link";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { isCurrentUserAdmin } from "@/lib/admin";

// Server-komponent med sin egen databaseopslag, pakket ind i Suspense fra
// layout.tsx, så resten af bundnavigationen kan forblive statisk, mens kun
// dette admin-tjek er "live" pr. besøg.
export async function AdminNavLink() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return null;

  return (
    <li className="flex-1">
      <Link
        href="/admin/invitations"
        className="flex flex-col items-center gap-1 border-t-2 border-transparent py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-indigo-600"
      >
        <ShieldCheck aria-hidden="true" size={22} weight="regular" />
        Admin
      </Link>
    </li>
  );
}
