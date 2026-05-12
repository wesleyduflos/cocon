"use client";

import Image from "next/image";
import type { ReactNode } from "react";

/* =========================================================================
   <AppHeader> — sprint 5 polish

   Header simple, non-sticky : il scroll avec le reste du contenu.
   Logo PNG transparent + wordmark "Cocon" + sous-titre optionnel.
   ========================================================================= */

interface AppHeaderProps {
  /** Sous-titre : nom du foyer + count membres, ou label de section. */
  subtitle?: string;
  /** Slot de boutons d'action à droite. */
  actions?: ReactNode;
}

export function AppHeader({ subtitle, actions }: AppHeaderProps) {
  return (
    <header
      className="flex items-center gap-3.5 px-5"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 18px)",
        paddingBottom: "14px",
      }}
    >
      <Image
        src="/icons/trans.png"
        alt="Cocon"
        width={56}
        height={56}
        priority
        className="shrink-0"
        style={{
          filter: "drop-shadow(0 0 8px rgba(255,107,36,0.25))",
        }}
      />

      <div className="flex-1 flex flex-col justify-center min-w-0">
        <h1
          className="font-display font-bold text-[36px] leading-none tracking-[-0.03em] truncate"
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

      {actions ? (
        <div className="shrink-0 flex items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
