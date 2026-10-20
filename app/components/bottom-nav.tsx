"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartBar, ClockCounterClockwise, PlusCircle, SignOut } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { logout } from "@/app/components/logout-action";

type NavItem = {
  href: string;
  label: string;
  icon: Icon;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: ChartBar },
  { href: "/log", label: "Log", icon: PlusCircle },
  { href: "/history", label: "Historik", icon: ClockCounterClockwise },
];

export function BottomNav() {
  const pathname = usePathname();

  // Oprettelsessiden har sit eget forløb uden træningsnavigation.
  if (pathname === "/signup" || pathname === "/login") return null;

  return (
    <nav aria-label="Hovednavigation" className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg justify-around gap-2 px-4 py-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center gap-1 border-t-2 py-3 text-xs font-medium ${
                  isActive ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-500 hover:text-indigo-600"
                }`}
              >
                <Icon aria-hidden="true" size={22} weight={isActive ? "fill" : "regular"} />
                {label}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full flex-col items-center gap-1 border-t-2 border-transparent py-3 text-xs font-medium text-zinc-500 hover:text-indigo-600"
            >
              <SignOut aria-hidden="true" size={22} weight="regular" />
              Log ud
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
