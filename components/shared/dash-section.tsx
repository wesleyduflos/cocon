"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { DashCardTone } from "@/components/shared/dash-card";

/* =========================================================================
   <DashSection> — container unifié pour toutes les sections du dashboard.

   Toutes les sections (tâches, alertes, stocks détail, agenda, courses,
   préparations) partagent le même fond gradient subtil et la même
   bordure que la carte hero, pour une harmonie visuelle totale.

   Hiérarchie : la position verticale et la taille du contenu portent
   l'importance, pas le style du container.

   Header : [icône cercle coloré 28x28] [titre + count] [lien "Tout voir"]
   Body : children (liste, item unique, etc).
   ========================================================================= */

const TONE_STYLES: Record<
  DashCardTone,
  { bg: string; border: string; color: string }
> = {
  primary: {
    bg: "rgba(255,107,36,0.14)",
    border: "rgba(255,107,36,0.26)",
    color: "text-primary",
  },
  secondary: {
    bg: "rgba(255,200,69,0.16)",
    border: "rgba(255,200,69,0.3)",
    color: "text-[#FFC845]",
  },
  success: {
    bg: "rgba(76,175,80,0.16)",
    border: "rgba(76,175,80,0.3)",
    color: "text-[#4CAF50]",
  },
  info: {
    bg: "rgba(100,160,255,0.16)",
    border: "rgba(100,160,255,0.3)",
    color: "text-[#64A0FF]",
  },
  destructive: {
    bg: "rgba(229,55,77,0.16)",
    border: "rgba(229,55,77,0.3)",
    color: "text-destructive",
  },
  neutral: {
    bg: "var(--surface-elevated)",
    border: "var(--border)",
    color: "text-foreground",
  },
};

interface DashSectionProps {
  icon?: LucideIcon;
  iconTone?: DashCardTone;
  title: string;
  count?: number;
  /** Si fourni, ajoute un lien "Tout voir →" dans le header. */
  href?: string;
  /** Si fourni, rend toute la section cliquable (au lieu du seul lien). */
  fullHref?: string;
  children: ReactNode;
}

export function DashSection({
  icon: Icon,
  iconTone = "primary",
  title,
  count,
  href,
  fullHref,
  children,
}: DashSectionProps) {
  const iconStyle = Icon ? TONE_STYLES[iconTone] : null;
  const containerClass =
    "rounded-[14px] px-4 py-3.5 border flex flex-col gap-2.5";
  const containerStyle = {
    background:
      "linear-gradient(135deg, rgba(255,107,36,0.08), rgba(255,200,69,0.02))",
    borderColor: "rgba(255,107,36,0.18)",
  };

  const header = (
    <header className="flex items-center gap-2.5">
      {Icon && iconStyle ? (
        <div
          className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 border"
          style={{
            background: iconStyle.bg,
            borderColor: iconStyle.border,
          }}
        >
          <Icon size={14} className={iconStyle.color} strokeWidth={2.2} />
        </div>
      ) : null}
      <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground font-medium flex-1 truncate">
        {title}
        {typeof count === "number" ? (
          <span className="ml-1.5 text-foreground/60">· {count}</span>
        ) : null}
      </h2>
      {href ? (
        <Link
          href={href}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 shrink-0"
        >
          Tout voir
          <ChevronRight size={11} />
        </Link>
      ) : null}
    </header>
  );

  if (fullHref) {
    return (
      <Link href={fullHref} className={`${containerClass} hover:brightness-105 transition-all`} style={containerStyle}>
        {header}
        <div>{children}</div>
      </Link>
    );
  }

  return (
    <section className={containerClass} style={containerStyle}>
      {header}
      <div>{children}</div>
    </section>
  );
}
