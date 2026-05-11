"use client";

import {
  Bell,
  Brush,
  Database,
  House,
  LogOut,
  Plug,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useMembers } from "@/hooks/use-members";

interface SettingsCard {
  href: string;
  icon: typeof House;
  title: string;
  available: boolean;
  variant?: "default" | "warning";
}

const CARDS: SettingsCard[] = [
  { href: "/settings/cocon", icon: House, title: "Mon cocon", available: true },
  {
    href: "/settings/profile",
    icon: UserRound,
    title: "Mon profil",
    available: true,
  },
  {
    href: "/settings/appearance",
    icon: Brush,
    title: "Apparence",
    available: true,
  },
  {
    href: "/settings",
    icon: Bell,
    title: "Notifications",
    available: false,
  },
  {
    href: "/settings",
    icon: Plug,
    title: "Connecteurs",
    available: false,
  },
  {
    href: "/settings",
    icon: Sparkles,
    title: "Assistant IA",
    available: false,
  },
  {
    href: "/settings",
    icon: Database,
    title: "Données",
    available: false,
  },
  {
    href: "/settings/account",
    icon: LogOut,
    title: "Compte",
    available: true,
    variant: "warning",
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { members } = useMembers(household?.memberIds);

  const myDisplayName =
    members.find((m) => m.uid === user?.uid)?.displayName ??
    user?.email?.split("@")[0] ??
    "Membre";
  const otherName = members.find((m) => m.uid !== user?.uid)?.displayName;

  return (
    <main className="flex flex-1 flex-col px-5 py-7">
      <div className="w-full max-w-md mx-auto flex flex-col gap-6">
        <header className="flex flex-col gap-1.5">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Paramètres
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
            Réglages du cocon
          </h1>
        </header>

        {/* Hero profil */}
        <article className="rounded-[16px] bg-gradient-to-br from-[rgba(255,107,36,0.30)] to-[rgba(255,200,69,0.14)] border border-[rgba(255,107,36,0.40)] px-5 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-semibold text-[22px] shadow-[0_0_18px_rgba(255,107,36,0.4)]">
            {myDisplayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 flex flex-col">
            <span className="font-display text-[18px] font-semibold">
              {myDisplayName}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {household
                ? `Membre du ${household.name}${otherName ? ` · avec ${otherName}` : ""}`
                : "Aucun cocon"}
            </span>
          </div>
        </article>

        {/* Grille des cards */}
        <div className="grid grid-cols-2 gap-3">
          {CARDS.map((card) => {
            const Icon = card.icon;
            const isWarning = card.variant === "warning";
            const content = (
              <article
                className={`rounded-[14px] border bg-surface px-4 py-4 flex flex-col gap-2 h-full transition-colors ${
                  card.available
                    ? isWarning
                      ? "border-[rgba(229,55,77,0.4)] hover:bg-[rgba(229,55,77,0.08)]"
                      : "border-border hover:bg-surface-elevated"
                    : "border-border-subtle opacity-60"
                }`}
              >
                <Icon
                  size={20}
                  className={isWarning ? "text-destructive" : "text-primary"}
                />
                <p
                  className={`text-[14px] font-semibold leading-tight ${
                    isWarning ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {card.title}
                </p>
                {!card.available ? (
                  <span className="text-[10px] uppercase tracking-[0.1em] text-foreground-faint">
                    Bientôt
                  </span>
                ) : null}
              </article>
            );
            return card.available ? (
              <Link key={card.title} href={card.href}>
                {content}
              </Link>
            ) : (
              <div key={card.title}>{content}</div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
