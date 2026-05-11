"use client";

import { Fingerprint, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/use-auth";
import { sendMagicLink } from "@/lib/auth/magic-link";
import {
  authenticateWithPasskey,
  isWebAuthnSupported,
  lookupEmailForLogin,
} from "@/lib/auth/passkey";

type Step = "email" | "choose-method";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [hasPasskey, setHasPasskey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supportsWebAuthn = isWebAuthnSupported();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const cleaned = email.trim();
      // Si le navigateur supporte WebAuthn, on consulte si une passkey
      // existe pour proposer une connexion plus rapide.
      if (supportsWebAuthn) {
        try {
          const result = await lookupEmailForLogin(cleaned);
          if (result.hasPasskey) {
            setHasPasskey(true);
            setStep("choose-method");
            setSubmitting(false);
            return;
          }
        } catch {
          // lookup peut échouer (rate limit, no users yet) — on tombe
          // silencieusement sur le magic link, anti-énumération préservée.
        }
      }
      await sendMagicLink(cleaned);
      router.push("/login/check-email");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'envoyer le lien. Réessaie dans quelques instants.",
      );
      setSubmitting(false);
    }
  }

  async function handlePasskeyLogin() {
    setError(null);
    setSubmitting(true);
    try {
      await authenticateWithPasskey(email.trim());
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Connexion par passkey annulée ou échouée.",
      );
      setSubmitting(false);
    }
  }

  async function handleFallbackMagicLink() {
    setError(null);
    setSubmitting(true);
    try {
      await sendMagicLink(email.trim());
      router.push("/login/check-email");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible d'envoyer le lien.",
      );
      setSubmitting(false);
    }
  }

  if (step === "choose-method" && hasPasskey) {
    return (
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            On te reconnaît
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
            <span className="greeting-gradient">Bon retour</span> sur Cocon.
          </h1>
          <p className="text-[15px] text-muted-foreground leading-[1.5]">
            Connecte-toi sur{" "}
            <span className="text-foreground font-medium">{email.trim()}</span>.
          </p>
        </header>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={submitting}
            className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Fingerprint size={18} />
            {submitting ? "Connexion…" : "Utiliser ma passkey"}
          </button>
          <button
            type="button"
            onClick={handleFallbackMagicLink}
            disabled={submitting}
            className="rounded-[12px] border border-border bg-transparent text-foreground font-sans font-medium text-[14px] px-[18px] py-3 hover:bg-surface-elevated transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Mail size={16} />
            Recevoir un lien par email
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setHasPasskey(false);
            }}
            className="text-[12px] text-foreground-faint hover:text-muted-foreground transition-colors"
          >
            Pas le bon compte ? Changer d&apos;email
          </button>
          {error ? (
            <p
              role="alert"
              className="text-[13px] text-destructive leading-[1.5]"
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
          Bonjour !{" "}
          <span className="greeting-gradient">Entre ton email</span> pour
          commencer.
        </h1>
        <p className="text-[15px] text-muted-foreground leading-[1.5]">
          On te guide ensuite.
        </p>
      </header>

      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ton@email.fr"
          disabled={submitting}
          className="rounded-[12px] border border-[var(--primary)] bg-surface px-4 py-3.5 text-[15px] text-foreground placeholder:text-foreground-faint focus:outline-none focus:ring-2 focus:ring-[rgba(255,107,36,0.24)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitting || email.trim().length === 0}
          className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "..." : "Continuer →"}
        </button>
        {error ? (
          <p
            role="alert"
            className="text-[13px] text-destructive leading-[1.5]"
          >
            {error}
          </p>
        ) : null}
      </form>

      <p className="text-[12px] text-foreground-faint leading-[1.5]">
        Nouveau ou invité ? On reconnaît automatiquement.
        {supportsWebAuthn
          ? " Si une passkey est enregistrée pour ton email, on te la propose."
          : null}
      </p>
    </div>
  );
}
