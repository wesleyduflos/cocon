"use client";

import {
  Calendar,
  House,
  ListChecks,
  MoreHorizontal,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavTab {
  href: string;
  icon: typeof House;
  label: string;
}

const TABS: NavTab[] = [
  { href: "/", icon: House, label: "Accueil" },
  { href: "/tasks", icon: ListChecks, label: "Tâches" },
  { href: "/courses", icon: ShoppingBag, label: "Courses" },
  { href: "/calendar", icon: Calendar, label: "Agenda" },
  { href: "/more", icon: MoreHorizontal, label: "Plus" },
];

function isTabActive(pathname: string, tabHref: string): boolean {
  if (tabHref === "/") return pathname === "/";
  return pathname === tabHref || pathname.startsWith(`${tabHref}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 backdrop-blur-xl bg-background/80 border-t border-border"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      aria-label="Navigation principale"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 px-2 pt-2">
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 py-2"
              aria-current={active ? "page" : undefined}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.2 : 1.8}
                className={
                  active
                    ? "text-primary drop-shadow-[0_0_10px_rgba(255,107,36,0.7)]"
                    : "text-muted-foreground"
                }
              />
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
