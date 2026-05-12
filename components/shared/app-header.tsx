"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";

/* =========================================================================
   <AppHeader> — sprint 5 polish

   Header sticky qui se réduit progressivement au scroll. Approche
   ultra-performante :
   - Pas de useState (zéro re-render React au scroll)
   - Mise à jour directe d'une CSS custom property `--hp` (0 → 1)
     via `style.setProperty()` sur le ref du header
   - Toutes les interpolations en CSS pur via `calc()` :
     - Logo : transform scale (GPU, pas de reflow)
     - Wordmark : transform scale (GPU)
     - Background, border, padding : interpolés via CSS vars
   - requestAnimationFrame throttle le listener
   - Listener `passive` pour ne pas bloquer le scroll natif
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
      className="sticky top-0 z-30 flex items-center gap-3.5 px-5 will-change-[background-color,backdrop-filter]"
      style={
        {
          // --hp est mis à jour via JS sans déclencher de re-render
          ["--hp" as string]: "0",
          paddingTop:
            "calc(env(safe-area-inset-top, 0px) + (0.5rem - var(--hp) * 0.25rem))",
          paddingBottom: "calc(8px - var(--hp) * 4px)",
          backgroundColor: "rgba(16, 6, 4, calc(var(--hp) * 0.85))",
          backdropFilter: "blur(calc(var(--hp) * 14px))",
          WebkitBackdropFilter: "blur(calc(var(--hp) * 14px))",
          borderBottom:
            "1px solid rgba(255, 107, 36, calc(var(--hp) * 0.4))",
        } as React.CSSProperties
      }
    >
      {/* Logo : scale via transform (GPU). Wrapper conserve la place visuelle. */}
      <div
        className="shrink-0 w-14 h-14 flex items-center justify-start"
        style={{ width: "calc(56px - var(--hp) * 24px)" }}
      >
        <Image
          src="/icons/trans.png"
          alt="Cocon"
          width={56}
          height={56}
          priority
          className="origin-left will-change-transform"
          style={{
            transform: "scale(calc(1 - var(--hp) * 0.43))",
            filter: "drop-shadow(0 0 8px rgba(255,107,36,0.25))",
          }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center min-w-0">
        <h1
          className="font-display font-bold leading-none origin-left will-change-transform"
          style={{
            fontSize: "36px",
            letterSpacing: "-0.03em",
            transform: "scale(calc(1 - var(--hp) * 0.45))",
            background: "linear-gradient(90deg, #FF6B24, #FFC845)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            height: "calc(36px - var(--hp) * 17px)",
          }}
        >
          Cocon
        </h1>
        {subtitle ? (
          <p
            className="text-[12px] text-muted-foreground font-medium leading-tight truncate mt-1 will-change-[opacity,max-height]"
            style={{
              opacity: "calc(1 - var(--hp) * 2)",
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
