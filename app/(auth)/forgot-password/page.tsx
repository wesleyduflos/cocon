"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  humanReadableAuthError,
  sendPasswordReset,
} from "@/lib/auth/password";

type Status = "form" | "sent";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await sendPasswordReset(email.trim());
      setStatus("sent");
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code
          : undefined;
      setError(humanReadableAuthError(code));
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-3">
          <span className="text-[40px]">📬</span>
          <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
            <span className="greeting-gradient">Check ta boîte</span>
          </h1>
          <p className="text-[15px] text-muted-foreground leading-[1.5]">
            Si un compte existe pour{" "}
            <span className="text-foreground font-medium">{email.trim()}</span>,
            tu vas recevoir un email avec un lien pour définir un nouveau
            mot de passe.
          </p>
          <p className="text-[13px] text-foreground-faint leading-[1.5]">
            Pense à regarder dans les spams si tu ne vois rien dans 1 minute.
          </p>
        </header>
        <Link
          href="/login"
          className="rounded-[12px] border border-border bg-transparent text-foreground font-sans font-medium text-[14px] px-[18px] py-3 hover:bg-surface-elevated transition-colors text-center"
        >
          Revenir à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
          <span className="greeting-gradient">Mot de passe</span> oublié
        </h1>
        <p className="text-[15px] text-muted-foreground leading-[1.5]">
          Entre ton email, on t&apos;envoie un lien pour en définir un nouveau.
        </p>
        <p className="text-[13px] text-foreground-faint leading-[1.5]">
          Première connexion après la mise à jour ? C&apos;est aussi par ici
          que tu définis ton premier mot de passe.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
        <button
          type="submit"
          disabled={submitting || email.trim().length === 0}
          className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Mail size={16} />
          {submitting ? "Envoi…" : "Envoyer le lien"}
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

      <Link
        href="/login"
        className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Revenir à la connexion
      </Link>
    </div>
  );
}
