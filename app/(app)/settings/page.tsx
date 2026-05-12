"use client";

import { signOut } from "firebase/auth";
import {
  Bell,
  Brush,
  ChevronRight,
  Download,
  House,
  LogOut,
  NotebookPen,
  Plug,
  Scale,
  UserCircle,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppHeader } from "@/components/shared/app-header";
import { auth } from "@/lib/firebase/client";

interface SettingsRow {
  href: string;
  icon: typeof House;
  title: string;
  subtitle: string;
  /** Couleur de l'icône (fond du cercle). */
  iconBg?: string;
  iconColor?: string;
}

interface SettingsGroup {
  label: string;
  rows: SettingsRow[];
}

const GROUPS: SettingsGroup[] = [
  {
    label: "Compte",
    rows: [
      {
        href: "/settings/profile",
        icon: UserRound,
        title: "Mon profil",
        subtitle: "Nom, avatar, passkeys",
        iconBg: "bg-[rgba(255,107,36,0.15)]",
        iconColor: "text-primary",
      },
      {
        href: "/settings/cocon",
        icon: House,
        title: "Mon cocon",
        subtitle: "Nom, emoji, membres, équilibre, journal",
        iconBg: "bg-[rgba(255,200,69,0.15)]",
        iconColor: "text-[#FFC845]",
      },
    ],
  },
  {
    label: "App",
    rows: [
      {
        href: "/settings/appearance",
        icon: Brush,
        title: "Apparence",
        subtitle: "Thème, polices, accents",
        iconBg: "bg-[rgba(180,140,255,0.15)]",
        iconColor: "text-[#B48CFF]",
      },
      {
        href: "/settings/notifications",
        icon: Bell,
        title: "Notifications",
        subtitle: "Push, heures de silence, rappels",
        iconBg: "bg-[rgba(76,175,80,0.15)]",
        iconColor: "text-[#4CAF50]",
      },
      {
        href: "/settings/connectors",
        icon: Plug,
        title: "Connecteurs",
        subtitle: "Google Calendar, intégrations tierces",
        iconBg: "bg-[rgba(100,160,255,0.15)]",
        iconColor: "text-[#64A0FF]",
      },
    ],
  },
  {
    label: "Confidentialité",
    rows: [
      {
        href: "/balance",
        icon: Scale,
        title: "Score d'équilibre",
        subtitle: "Activer ou désactiver dans Mon cocon",
        iconBg: "bg-[rgba(255,200,69,0.15)]",
        iconColor: "text-[#FFC845]",
      },
      {
        href: "/journal",
        icon: NotebookPen,
        title: "Journal du foyer",
        subtitle: "Consulter, exporter, effacer",
        iconBg: "bg-[rgba(255,107,36,0.15)]",
        iconColor: "text-primary",
      },
    ],
  },
  {
    label: "Données",
    rows: [
      {
        href: "/settings/export",
        icon: Download,
        title: "Mes données",
        subtitle: "Exporter, importer, charger une démo, effacer",
        iconBg: "bg-[rgba(100,160,255,0.15)]",
        iconColor: "text-[#64A0FF]",
      },
      {
        href: "/settings/account",
        icon: UserCircle,
        title: "Compte",
        subtitle: "Email, suppression de compte",
        iconBg: "bg-[rgba(229,55,77,0.15)]",
        iconColor: "text-destructive",
      },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (!window.confirm("Te déconnecter du cocon ?")) return;
    setSigningOut(true);
    try {
      await signOut(auth);
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <AppHeader subtitle="Paramètres" />

      <div className="w-full max-w-md mx-auto flex flex-col gap-6 px-5 py-7">
        {GROUPS.map((group) => (
          <section key={group.label} className="flex flex-col gap-2">
            <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground px-1">
              {group.label}
            </h2>
            <div className="rounded-[14px] bg-surface border border-border overflow-hidden">
              {group.rows.map((row, idx) => {
                const Icon = row.icon;
                const isLast = idx === group.rows.length - 1;
                return (
                  <Link
                    key={row.href}
                    href={row.href}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated transition-colors ${
                      isLast ? "" : "border-b border-border-subtle"
                    }`}
                  >
                    <div
                      className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0 ${
                        row.iconBg ?? "bg-surface-elevated"
                      }`}
                    >
                      <Icon
                        size={16}
                        strokeWidth={2.2}
                        className={row.iconColor ?? "text-foreground"}
                      />
                    </div>
                    <div className="flex-1 flex flex-col min-w-0">
                      <span className="text-[14px] font-medium leading-tight">
                        {row.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                        {row.subtitle}
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-foreground-faint shrink-0"
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {/* Bouton Déconnexion */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="rounded-[14px] bg-surface border border-border w-full flex items-center justify-center gap-2 py-3.5 text-[14px] font-medium text-foreground hover:bg-surface-elevated transition-colors disabled:opacity-50"
        >
          <LogOut size={16} className="text-muted-foreground" />
          {signingOut ? "Déconnexion…" : "Se déconnecter"}
        </button>
      </div>
    </main>
  );
}
