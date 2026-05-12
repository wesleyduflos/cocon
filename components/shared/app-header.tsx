"use client";

import type { ReactNode } from "react";

/* =========================================================================
   <AppHeader> — sprint 5 bloc C, variante 1A

   Header horizontal compact 64px, identite Cocon :
   - Logo carre 44px arrondi, gradient orange -> safran, bordure
     primary subtile, drop-shadow.
   - Wordmark "Cocon" Funnel Display 700 24px, gradient orange -> safran.
   - Sous-titre Funnel Sans 500 12px muted (nom du foyer + count
     membres, ou label de page sur les sous-pages).
   - Slot `actions` a droite (boutons recherche / ajout / etc).

   Utilise sur le dashboard. Sur les sous-pages, on prefere souvent
   un top bar plus discret (ArrowLeft + titre). Ce header reste
   un peu intrusif visuellement pour empiler avec une nav contextuelle.
   ========================================================================= */

interface AppHeaderProps {
  /** Sous-titre : nom du foyer + count membres, ou label de section. */
  subtitle?: string;
  /** Override de l'emoji du logo (defaut "🔥"). */
  logoEmoji?: string;
  /** Slot de boutons d'action à droite. */
  actions?: ReactNode;
  /** Si fourni, le header est sticky avec ce z-index. */
  sticky?: boolean;
}

export function AppHeader({
  subtitle,
  logoEmoji = "🔥",
  actions,
  sticky = true,
}: AppHeaderProps) {
  return (
    <header
      className={`flex items-center gap-3 px-5 h-16 border-b border-border-subtle bg-background/85 backdrop-blur-xl ${
        sticky ? "sticky top-0 z-10" : ""
      }`}
    >
      {/* Logo carré 44px */}
      <div
        className="shrink-0 w-11 h-11 rounded-[12px] flex items-center justify-center border text-[22px]"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,107,36,0.20), rgba(255,200,69,0.06))",
          borderColor: "rgba(255,107,36,0.32)",
          boxShadow: "0 0 18px rgba(255,107,36,0.18)",
        }}
        aria-hidden
      >
        <span style={{ filter: "drop-shadow(0 0 4px rgba(255,107,36,0.4))" }}>
          {logoEmoji}
        </span>
      </div>

      {/* Wordmark + subtitle */}
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <h1
          className="font-display font-bold text-[22px] leading-none tracking-[-0.025em]"
          style={{
            background: "linear-gradient(90deg, #FF6B24, #FFC845)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Cocon
        </h1>
        {subtitle ? (
          <p className="text-[11px] text-muted-foreground font-medium leading-tight truncate mt-0.5">
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* Actions */}
      {actions ? (
        <div className="shrink-0 flex items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
