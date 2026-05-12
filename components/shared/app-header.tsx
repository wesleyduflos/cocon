"use client";

import Image from "next/image";
import type { ReactNode } from "react";

/* =========================================================================
   <AppHeader> — sprint 5 bloc C, variante 1A

   Header horizontal compact 64px, identite Cocon :
   - Logo image (public/icons/logo-mark.png) 44px sans fond/bordure
     pour se fondre dans la page.
   - Wordmark "Cocon" Funnel Display 700 22px, gradient orange -> safran.
   - Sous-titre Funnel Sans 500 11px muted (nom du foyer + count
     membres, ou label de page sur les sous-pages).
   - Slot `actions` a droite optionnel.
   ========================================================================= */

interface AppHeaderProps {
  /** Sous-titre : nom du foyer + count membres, ou label de section. */
  subtitle?: string;
  /** Slot de boutons d'action à droite. */
  actions?: ReactNode;
  /** Si fourni, le header est sticky avec ce z-index. */
  sticky?: boolean;
}

export function AppHeader({
  subtitle,
  actions,
  sticky = true,
}: AppHeaderProps) {
  return (
    <header
      className={`flex items-center gap-3 px-5 pt-6 pb-2 ${
        sticky ? "sticky top-0 z-10" : ""
      }`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.5rem)" }}
    >
      {/* Logo transparent, sans fond ni bordure, totalement fondu dans la page */}
      <Image
        src="/icons/trans.png"
        alt="Cocon"
        width={52}
        height={52}
        priority
        className="shrink-0"
        style={{
          filter: "drop-shadow(0 0 8px rgba(255,107,36,0.25))",
        }}
      />

      {/* Wordmark + subtitle */}
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <h1
          className="font-display font-bold text-[30px] leading-none tracking-[-0.025em]"
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
          <p className="text-[12px] text-muted-foreground font-medium leading-tight truncate mt-1">
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
