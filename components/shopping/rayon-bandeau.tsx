"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import type { ShoppingRayon } from "@/types/cocon";

export const RAYON_EMOJI: Record<ShoppingRayon, string> = {
  "Fruits & légumes": "🥬",
  Boulangerie: "🥖",
  Viandes: "🥩",
  Poisson: "🐟",
  "Produits laitiers": "🥛",
  Frais: "❄️",
  Conserves: "🥫",
  Épicerie: "🍝",
  Boissons: "🥤",
  Hygiène: "🧴",
  Maison: "🧹",
  Animalerie: "🐾",
  Autre: "📦",
};

interface RayonBandeauProps {
  rayon: ShoppingRayon;
  count: number;
  /** Label compteur custom (« 2/5 » pour pending/total, « il y a 3j » etc.). */
  countLabel?: string;
  /** Si défini, le bandeau devient un bouton qui toggle l'expand. */
  onToggle?: () => void;
  expanded?: boolean;
}

/**
 * Bandeau de rayon plein largeur — variante A du sprint 6.
 *
 * Gradient orange→safran subtil, bordures haute+basse en `--primary` alpha,
 * nom du rayon en MAJUSCULES Funnel Display avec letter-spacing aéré.
 */
export function RayonBandeau({
  rayon,
  count,
  countLabel,
  onToggle,
  expanded,
}: RayonBandeauProps) {
  const inner = (
    <>
      <span className="flex items-center gap-2.5 min-w-0">
        <span className="text-[18px] shrink-0">{RAYON_EMOJI[rayon]}</span>
        <span className="font-display text-[13px] font-bold text-primary tracking-[0.12em] uppercase truncate">
          {rayon}
        </span>
      </span>
      <span className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {countLabel ?? `${count} article${count > 1 ? "s" : ""}`}
        </span>
        {onToggle ? (
          expanded ? (
            <ChevronUp size={14} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground" />
          )
        ) : null}
      </span>
    </>
  );

  const baseClass =
    "w-full flex items-center justify-between px-5 py-3 bg-[linear-gradient(90deg,rgba(255,107,36,0.16),rgba(255,200,69,0.04))] border-y border-y-[rgba(255,107,36,0.20)] border-t-[rgba(255,107,36,0.30)]";

  if (onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`${baseClass} hover:bg-[linear-gradient(90deg,rgba(255,107,36,0.22),rgba(255,200,69,0.06))] transition-colors`}
      >
        {inner}
      </button>
    );
  }

  return <div className={baseClass}>{inner}</div>;
}
