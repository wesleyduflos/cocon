"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

/* =========================================================================
   <AppHeader> — sprint 5 polish

   Header sticky qui se réduit progressivement au scroll :
   - En haut de page : logo 56px, wordmark 36px, fond transparent
   - Après ~100px de scroll : logo 32px, wordmark 20px, fond opaque +
     backdrop-blur + bordure subtile.

   Le contenu passe sous le header sticky (naturel CSS).
   ========================================================================= */

interface AppHeaderProps {
  /** Sous-titre : nom du foyer + count membres, ou label de section. */
  subtitle?: string;
  /** Slot de boutons d'action à droite. */
  actions?: ReactNode;
}

const SCROLL_THRESHOLD = 80; // px de scroll pour passer en compact

function useScrollProgress(threshold: number): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let rafId: number | null = null;
    const compute = () => {
      const y = window.scrollY || 0;
      setProgress(Math.min(1, Math.max(0, y / threshold)));
    };
    const handler = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        compute();
        rafId = null;
      });
    };
    compute();
    window.addEventListener("scroll", handler, { passive: true });
    return () => {
      window.removeEventListener("scroll", handler);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [threshold]);
  return progress;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function AppHeader({ subtitle, actions }: AppHeaderProps) {
  const progress = useScrollProgress(SCROLL_THRESHOLD);

  // Interpolations
  const logoSize = Math.round(lerp(56, 32, progress));
  const wordmarkSize = lerp(36, 20, progress);
  const wordmarkLetterSpacing = lerp(-0.03, -0.02, progress);
  const bgAlpha = progress * 0.85;
  const borderAlpha = progress * 0.4;
  const paddingTopExtra = lerp(0.5, 0.25, progress); // rem au-dessus du safe-area
  const paddingBottom = lerp(8, 4, progress); // px
  const showSubtitle = progress < 0.55 && Boolean(subtitle);

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3.5 px-5 transition-[padding] duration-150"
      style={{
        paddingTop: `calc(env(safe-area-inset-top, 0px) + ${paddingTopExtra}rem)`,
        paddingBottom: `${paddingBottom}px`,
        background: `rgba(16, 6, 4, ${bgAlpha})`,
        backdropFilter: progress > 0.05 ? "blur(14px)" : "none",
        WebkitBackdropFilter: progress > 0.05 ? "blur(14px)" : "none",
        borderBottom: `1px solid rgba(255, 107, 36, ${borderAlpha})`,
      }}
    >
      <Image
        src="/icons/trans.png"
        alt="Cocon"
        width={56}
        height={56}
        priority
        className="shrink-0 transition-[width,height] duration-150"
        style={{
          width: logoSize,
          height: logoSize,
          filter: "drop-shadow(0 0 8px rgba(255,107,36,0.25))",
        }}
      />

      <div className="flex-1 flex flex-col justify-center min-w-0">
        <h1
          className="font-display font-bold leading-none transition-[font-size] duration-150"
          style={{
            fontSize: `${wordmarkSize}px`,
            letterSpacing: `${wordmarkLetterSpacing}em`,
            background: "linear-gradient(90deg, #FF6B24, #FFC845)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Cocon
        </h1>
        {showSubtitle ? (
          <p
            className="text-[12px] text-muted-foreground font-medium leading-tight truncate mt-1"
            style={{ opacity: 1 - progress * 1.8 }}
          >
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
