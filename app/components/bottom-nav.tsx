"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartBar, ClockCounterClockwise, GearSix, PlusCircle, UsersThree } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

type NavItem = {
  href: string;
  label: string;
  icon: Icon;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overblik", icon: ChartBar },
  { href: "/log", label: "Log", icon: PlusCircle },
  { href: "/history", label: "Historik", icon: ClockCounterClockwise },
  { href: "/community", label: "Community", icon: UsersThree },
  { href: "/settings", label: "Indstillinger", icon: GearSix },
];

export function BottomNav() {
  const pathname = usePathname();

  // Oprettelsessiden har sit eget forløb uden træningsnavigation.
  if (pathname === "/signup" || pathname === "/login") return null;

  return (
    <nav aria-label="Hovednavigation" className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg justify-around gap-1 px-2 py-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center gap-1 border-t-2 py-3 text-[10px] min-[390px]:text-xs font-medium ${
                  isActive ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-indigo-600"
                }`}
              >
                <Icon aria-hidden="true" size={22} weight={isActive ? "fill" : "regular"} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
