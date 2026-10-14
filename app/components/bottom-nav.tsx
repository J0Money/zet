"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartBar, ClockCounterClockwise, PlusCircle } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

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

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <ul className="mx-auto flex max-w-3xl justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2 text-xs ${
                  isActive
                    ? "text-black dark:text-white"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                <Icon size={24} weight={isActive ? "fill" : "regular"} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
