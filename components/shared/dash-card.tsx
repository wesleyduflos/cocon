"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/* =========================================================================
   <DashCard> — card standardisée pour les "raccourcis modules" du dashboard.

   Structure : [icône cercle coloré] [titre + sublabel] [accessory ? chevron].
   Sprint 5 polish, retours utilisation Wesley.

   Couleurs prédéfinies (cohérence avec brique-flamme-tokens) :
   - "primary" : orange (courses, suggestions IA)
   - "secondary" : safran (stocks, balance)
   - "success" : vert (préparations, tâches faites)
   - "info" : bleu (mémoire, agenda)
   - "destructive" : rouge (alertes critiques)
   ========================================================================= */

export type DashCardTone =
  | "primary"
  | "secondary"
  | "success"
  | "info"
  | "destructive"
  | "neutral";

const TONE_STYLES: Record<
  DashCardTone,
  { bg: string; border: string; color: string }
> = {
  primary: {
    bg: "rgba(255,107,36,0.12)",
    border: "rgba(255,107,36,0.24)",
    color: "text-primary",
  },
  secondary: {
    bg: "rgba(255,200,69,0.14)",
    border: "rgba(255,200,69,0.28)",
    color: "text-[#FFC845]",
  },
  success: {
    bg: "rgba(76,175,80,0.14)",
    border: "rgba(76,175,80,0.28)",
    color: "text-[#4CAF50]",
  },
  info: {
    bg: "rgba(100,160,255,0.14)",
    border: "rgba(100,160,255,0.28)",
    color: "text-[#64A0FF]",
  },
  destructive: {
    bg: "rgba(229,55,77,0.14)",
    border: "rgba(229,55,77,0.28)",
    color: "text-destructive",
  },
  neutral: {
    bg: "var(--surface-elevated)",
    border: "var(--border)",
    color: "text-foreground",
  },
};

interface DashCardProps {
  icon: LucideIcon;
  title: string;
  sublabel?: string;
  href: string;
  tone?: DashCardTone;
  /** Élément optionnel à droite avant le chevron (badge count, etc.). */
  accessory?: ReactNode;
  /** Cacher le chevron. */
  noChevron?: boolean;
}

export function DashCard({
  icon: Icon,
  title,
  sublabel,
  href,
  tone = "primary",
  accessory,
  noChevron,
}: DashCardProps) {
  const style = TONE_STYLES[tone];
  // Toutes les DashCard partagent le meme fond/border que le hero greeting
  // pour une harmonie visuelle forte. Seule la couleur de l'icone change
  // selon le tone.
  return (
    <Link
      href={href}
      className="rounded-[14px] px-4 py-3 flex items-center gap-3 border transition-colors hover:brightness-105"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,107,36,0.10), rgba(255,200,69,0.03))",
        borderColor: "rgba(255,107,36,0.20)",
      }}
    >
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 border"
        style={{
          background: style.bg,
          borderColor: style.border,
        }}
      >
        <Icon size={18} className={style.color} strokeWidth={2.2} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <span className="text-[14px] font-medium leading-tight">{title}</span>
        {sublabel ? (
          <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
            {sublabel}
          </span>
        ) : null}
      </div>
      {accessory ? <div className="shrink-0">{accessory}</div> : null}
      {!noChevron ? (
        <ChevronRight size={16} className="text-foreground-faint shrink-0" />
      ) : null}
    </Link>
  );
}
