"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  createInvitation,
  getHouseholdsOfUser,
} from "@/lib/firebase/firestore";
import type { Household, WithId } from "@/types/cocon";

type Status = "preparing" | "form" | "submitting" | "ready" | "error";

export default function InvitePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [household, setHousehold] = useState<WithId<Household> | null>(null);
  const [status, setStatus] = useState<Status>("preparing");
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getHouseholdsOfUser(user.uid)
      .then((households) => {
        if (cancelled) return;
        if (households.length === 0) {
          router.replace("/onboarding");
          return;
        }
        setHousehold(households[0]);
        setStatus("form");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Erreur de chargement.");
      });
    return () => {
      cancelled = true;
    };
  }, [user, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !household) return;
    setStatus("submitting");
    setError(null);
    try {
      const ownerDisplayName =
        user.displayName?.split(" ")[0] ??
        user.email?.split("@")[0] ??
        "un membre";
      const token = await createInvitation({
        householdId: household.id,
        householdName: household.name,
        ownerDisplayName,
        email: email.trim(),
        invitedBy: user.uid,
      });
      const link = `${window.location.origin}/join/${token}`;
      setInviteLink(link);
      setStatus("ready");
    } catch (err) {
      setStatus("form");
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer l'invitation.",
      );
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Pas de fallback en sprint 1 (le navigateur de Wesley supporte clipboard API).
    }
  }

  if (status === "preparing") {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors self-start"
          >
            ← Retour
          </button>
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Inviter quelqu&apos;un
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
            Partage le <span className="greeting-gradient">cocon</span>
          </h1>
          <p className="text-[15px] text-muted-foreground leading-[1.5]">
            Génère un lien d&apos;invitation et envoie-le par message à la personne
            que tu veux ajouter à ton cocon. Le lien expire dans 7 jours.
          </p>
        </header>

        {status !== "ready" ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2.5">
              <label
                htmlFor="invite-email"
                className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
              >
                Email de l&apos;invité·e
              </label>
              <input
                id="invite-email"
                type="email"
                inputMode="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="camille@exemple.fr"
                disabled={status === "submitting"}
                className="rounded-[12px] border border-border bg-surface px-4 py-3.5 text-[15px] text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(255,107,36,0.24)] disabled:opacity-50"
              />
              <p className="text-[12px] text-foreground-faint">
                L&apos;email est juste indicatif — n&apos;importe qui avec le lien peut rejoindre.
              </p>
            </div>

            <button
              type="submit"
              disabled={status === "submitting" || email.trim().length === 0}
              className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "submitting" ? "Génération…" : "Générer le lien →"}
            </button>
            {error ? (
              <p role="alert" className="text-[13px] text-destructive leading-[1.5]">
                {error}
              </p>
            ) : null}
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="rounded-[14px] border border-border bg-surface px-4 py-3.5 flex flex-col gap-2">
              <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
                Lien d&apos;invitation
              </p>
              <p className="text-[13px] text-foreground break-all font-mono">
                {inviteLink}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors"
            >
              {copied ? "Copié ✓" : "Copier le lien"}
            </button>
            <p className="text-[12px] text-foreground-faint leading-[1.5]">
              Envoie-le par WhatsApp, iMessage ou n&apos;importe quel canal direct.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
