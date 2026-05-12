"use client";

import type { MemberProfile } from "@/hooks/use-members";

/* =========================================================================
   <MemberAvatar> — sprint 5 polish

   Affiche le membre du foyer sous forme d'avatar visuel :
   - Si avatarEmoji est défini → emoji sur fond transparent
   - Sinon → initiale du displayName sur fond coloré (legacy fallback)

   Configurable via Settings / Profil.
   ========================================================================= */

interface MemberAvatarProps {
  member: Pick<MemberProfile, "displayName" | "avatarEmoji">;
  /** Taille en px (default 36). */
  size?: number;
  /** Style coloré primary pour "moi", secondary sinon (legacy fallback). */
  variant?: "primary" | "secondary" | "muted";
  className?: string;
}

export function MemberAvatar({
  member,
  size = 36,
  variant = "secondary",
  className,
}: MemberAvatarProps) {
  const emoji = member.avatarEmoji?.trim();
  const initial = member.displayName.charAt(0).toUpperCase() || "?";
  const isEmoji = Boolean(emoji);

  const bgClass = isEmoji
    ? "bg-surface border border-border-subtle"
    : variant === "primary"
      ? "bg-primary text-primary-foreground shadow-[0_0_14px_rgba(255,107,36,0.35)]"
      : variant === "muted"
        ? "bg-surface-elevated text-foreground"
        : "bg-secondary text-secondary-foreground";

  // Echelle emoji vs texte : emoji légèrement plus grand car centré visuellement
  const fontSize = isEmoji ? Math.round(size * 0.55) : Math.round(size * 0.4);

  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center font-display font-semibold ${bgClass} ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: `${fontSize}px` }}
      aria-label={member.displayName}
    >
      {isEmoji ? emoji : initial}
    </div>
  );
}

/** Helper pur : retourne emoji ou initiale (sans encore le rendre). */
export function memberAvatarChar(
  member: Pick<MemberProfile, "displayName" | "avatarEmoji">,
): string {
  return (
    member.avatarEmoji?.trim() ||
    member.displayName.charAt(0).toUpperCase() ||
    "?"
  );
}
