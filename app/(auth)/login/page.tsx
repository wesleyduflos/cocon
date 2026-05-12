"use client";

import { Eye, EyeOff, Fingerprint, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  humanReadableAuthError,
  signInWithPassword,
} from "@/lib/auth/password";
import {
  authenticateWithPasskey,
  isWebAuthnSupported,
  lookupEmailForLogin,
} from "@/lib/auth/passkey";

type Step = "form" | "passkey-prompt";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passkeyChecked, setPasskeyChecked] = useState(false);
  const supportsWebAuthn = isWebAuthnSupported();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  async function maybePromptPasskey(cleanedEmail: string): Promise<boolean> {
    if (!supportsWebAuthn || passkeyChecked) return false;
    try {
      const result = await lookupEmailForLogin(cleanedEmail);
      setPasskeyChecked(true);
      if (result.hasPasskey) {
        setStep("passkey-prompt");
        return true;
      }
    } catch {
      setPasskeyChecked(true);
      // fall through au password classique
    }
    return false;
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const cleanedEmail = email.trim();
    try {
      // Si une passkey existe pour cet email, propose-la avant de demander
      // le mot de passe (UX + sécurité).
      if (await maybePromptPasskey(cleanedEmail)) {
        setSubmitting(false);
        return;
      }
      await signInWithPassword(cleanedEmail, password);
      router.replace("/");
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code
          : undefined;
      setError(humanReadableAuthError(code));
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

  function handleBackToPassword() {
    setStep("form");
    setError(null);
  }

  if (step === "passkey-prompt") {
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
            onClick={handleBackToPassword}
            className="rounded-[12px] border border-border bg-transparent text-foreground font-sans font-medium text-[14px] px-[18px] py-3 hover:bg-surface-elevated transition-colors flex items-center justify-center gap-2"
          >
            <KeyRound size={16} />
            Utiliser mon mot de passe
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
          <span className="greeting-gradient">Bon retour</span> sur Cocon.
        </h1>
        <p className="text-[15px] text-muted-foreground leading-[1.5]">
          Connecte-toi pour retrouver ton foyer.
        </p>
      </header>

      <form onSubmit={handleLogin} className="flex flex-col gap-3">
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
          className="rounded-[12px] border border-border bg-surface px-4 py-3.5 text-[15px] text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(255,107,36,0.24)] disabled:opacity-50"
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            disabled={submitting}
            className="w-full rounded-[12px] border border-border bg-surface px-4 py-3.5 pr-12 text-[15px] text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(255,107,36,0.24)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Cacher" : "Afficher"}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-[8px] flex items-center justify-center text-muted-foreground hover:bg-surface-elevated"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button
          type="submit"
          disabled={
            submitting || email.trim().length === 0 || password.length === 0
          }
          className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
        >
          {submitting ? "Connexion…" : "Se connecter"}
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

      <div className="flex flex-col gap-2 text-[13px]">
        <Link
          href="/forgot-password"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Mot de passe oublié ?
        </Link>
        <p className="text-foreground-faint">
          Pas encore de compte ?{" "}
          <Link
            href="/signup"
            className="text-primary hover:underline font-medium"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
