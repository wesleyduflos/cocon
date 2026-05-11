"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  clearPendingInviteToken,
  storePendingInviteToken,
} from "@/lib/auth/invite-storage";
import {
  acceptInvitation,
  getInvitation,
  isInvitationExpired,
} from "@/lib/firebase/firestore";
import type { Invitation } from "@/types/cocon";

type Status = "loading" | "ready" | "accepting" | "error";

export default function JoinByTokenPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { user, loading } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    if (loading) return;
    ranOnce.current = true;

    // 1) Pas connecté → stocker le token + redirect /login.
    if (!user) {
      storePendingInviteToken(token);
      router.replace("/login");
      return;
    }

    // 2) Connecté : charger l'invitation et vérifier sa validité.
    let cancelled = false;
    getInvitation(token)
      .then((inv) => {
        if (cancelled) return;
        if (!inv) {
          setStatus("error");
          setError("Cette invitation n'existe pas.");
          return;
        }
        if (inv.status !== "pending") {
          setStatus("error");
          setError("Cette invitation a déjà été utilisée.");
          return;
        }
        if (isInvitationExpired(inv, new Date())) {
          setStatus("error");
          setError("Cette invitation est expirée. Demande un nouveau lien.");
          return;
        }
        // Cas particulier : l'invité est déjà membre du cocon (lien rejoué).
        if (inv.householdId && user.uid === inv.invitedBy) {
          setStatus("error");
          setError("C'est ton propre lien d'invitation — partage-le plutôt.");
          return;
        }
        setInvitation(inv);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger l'invitation.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [user, loading, token, router]);

  async function handleAccept() {
    if (!user || !invitation) return;
    setStatus("accepting");
    setError(null);
    try {
      await acceptInvitation({ token, userId: user.uid });
      clearPendingInviteToken();
      router.replace("/");
    } catch (err) {
      setStatus("ready");
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de rejoindre le cocon. Réessaie.",
      );
    }
  }

  if (status === "loading" || loading) {
    return <p className="text-[13px] text-muted-foreground">Chargement de l&apos;invitation…</p>;
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-3">
          <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
            Invitation <span className="text-destructive">non valable</span>
          </h1>
          <p className="text-[15px] text-muted-foreground leading-[1.5]">{error}</p>
        </header>
        <button
          type="button"
          onClick={() => router.replace("/onboarding")}
          className="rounded-[12px] border border-border bg-transparent text-foreground font-sans font-semibold text-[15px] px-[18px] py-3 hover:bg-surface-elevated transition-colors self-start"
        >
          Revenir à l&apos;onboarding
        </button>
      </div>
    );
  }

  // status === "ready" || "accepting"
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          Invitation
        </p>
        <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
          Tu rejoins{" "}
          <span className="greeting-gradient">
            {invitation?.householdName ?? "le cocon"}
          </span>
        </h1>
        <p className="text-[15px] text-muted-foreground leading-[1.5]">
          Invitation envoyée par{" "}
          <span className="text-foreground font-medium">
            {invitation?.ownerDisplayName ?? "un membre"}
          </span>
          .
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleAccept}
          disabled={status === "accepting"}
          className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "accepting" ? "On t'ajoute…" : "Rejoindre le cocon →"}
        </button>
        {error ? (
          <p role="alert" className="text-[13px] text-destructive leading-[1.5]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
