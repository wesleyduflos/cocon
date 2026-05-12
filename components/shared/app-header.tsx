"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";

/* =========================================================================
   <AppHeader> — sprint 5 polish

   Header sticky qui se réduit progressivement au scroll, fluide grâce à :
   - CSS custom property `--hp` (0 → 1) mise à jour directement via
     style.setProperty (zéro re-render React).
   - rAF + listener passif pour throttler.
   - Toutes les valeurs interpolées en CSS `calc(... * var(--hp))`.
   - Animation directe de width/height/font-size sur ces 2-3 éléments
     seulement (coût layout négligeable, et pas de clipping comme avec
     transform: scale).
   ========================================================================= */

interface AppHeaderProps {
  /** Sous-titre : nom du foyer + count membres, ou label de section. */
  subtitle?: string;
  /** Slot de boutons d'action à droite. */
  actions?: ReactNode;
}

const SCROLL_THRESHOLD = 80;

export function AppHeader({ subtitle, actions }: AppHeaderProps) {
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let rafId: number | null = null;
    const update = () => {
      const y = window.scrollY || 0;
      const progress = Math.min(1, Math.max(0, y / SCROLL_THRESHOLD));
      if (headerRef.current) {
        headerRef.current.style.setProperty("--hp", String(progress));
      }
      rafId = null;
    };
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 flex items-center gap-3.5 px-5"
      style={
        {
          ["--hp" as string]: "0",
          // Plein : safe-area + 18px top, 14px bottom (espace généreux)
          // Compact : safe-area + 6px top, 6px bottom (header bien resserré)
          paddingTop:
            "calc(env(safe-area-inset-top, 0px) + 18px - var(--hp) * 12px)",
          paddingBottom: "calc(14px - var(--hp) * 8px)",
          backgroundColor: "rgba(16, 6, 4, calc(var(--hp) * 0.85))",
          backdropFilter: "blur(calc(var(--hp) * 14px))",
          WebkitBackdropFilter: "blur(calc(var(--hp) * 14px))",
          borderBottom:
            "1px solid rgba(255, 107, 36, calc(var(--hp) * 0.4))",
        } as React.CSSProperties
      }
    >
      {/* Logo : width/height anime directement (pas de transform/scale → 0 clip) */}
      <Image
        src="/icons/trans.png"
        alt="Cocon"
        width={56}
        height={56}
        priority
        className="shrink-0"
        style={{
          width: "calc(56px - var(--hp) * 22px)",
          height: "calc(56px - var(--hp) * 22px)",
          filter: "drop-shadow(0 0 8px rgba(255,107,36,0.25))",
        }}
      />

      <div className="flex-1 flex flex-col justify-center min-w-0">
        <h1
          className="font-display font-bold leading-none truncate"
          style={{
            // Plein : 36px. Compact : 22px. font-size anime directement,
            // sans clipping (pas de height/scale combinés qui rognent).
            fontSize: "calc(36px - var(--hp) * 14px)",
            letterSpacing: "calc(-0.03em + var(--hp) * 0.01em)",
            background: "linear-gradient(90deg, #FF6B24, #FFC845)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Cocon
        </h1>
        {subtitle ? (
          <p
            className="text-[12px] text-muted-foreground font-medium leading-tight truncate"
            style={{
              opacity: "calc(1 - var(--hp) * 1.8)",
              maxHeight: "calc(16px - var(--hp) * 16px)",
              marginTop: "calc(0.25rem - var(--hp) * 0.25rem)",
              overflow: "hidden",
            }}
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
