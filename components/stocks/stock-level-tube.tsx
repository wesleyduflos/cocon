"use client";

import type { StockLevel } from "@/types/cocon";

/* =========================================================================
   <StockLevelTube> — sprint 5 bloc D, variante 3A

   Métaphore bouteille / tube de niveau vertical. Largeur 12px, hauteur 56px,
   remplissage interne selon le niveau, transition 300ms.

   Utilisé sur /stocks (chaque card a son tube à gauche), et reuse possible
   dans les alertes du dashboard (Bloc F.6).
   ========================================================================= */

interface StockLevelTubeProps {
  level: StockLevel;
  /** Override de la taille (default 12x56). */
  width?: number;
  height?: number;
  className?: string;
}

const FILL_PCT: Record<StockLevel, number> = {
  full: 100,
  half: 50,
  low: 25,
  empty: 6,
};

const FILL_STYLE: Record<StockLevel, string> = {
  full: "linear-gradient(180deg, #4CAF50, #2E7D32)",
  half: "linear-gradient(180deg, #FFC845, #FF9800)",
  low: "linear-gradient(180deg, #FF6B24, #E5374D)",
  empty: "#E5374D",
};

export function StockLevelTube({
  level,
  width = 20,
  height = 64,
  className,
}: StockLevelTubeProps) {
  const pct = FILL_PCT[level];
  return (
    <div
      role="img"
      aria-label={`Niveau de stock : ${level}`}
      className={`relative rounded-[8px] bg-surface-elevated overflow-hidden shrink-0 ${className ?? ""}`}
      style={{ width, height }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-300 ease-out"
        style={{
          height: `${pct}%`,
          background: FILL_STYLE[level],
        }}
      />
    </div>
  );
}
