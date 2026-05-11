"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/use-auth";
import { sendMagicLink } from "@/lib/auth/magic-link";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Un utilisateur déjà connecté n'a rien à faire ici.
  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await sendMagicLink(email.trim());
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
          className="rounded-[12px] border border-[var(--primary)] bg-surface px-4 py-3.5 text-[15px] text-foreground placeholder:text-foreground-faint focus:outline-none focus:ring-2 focus:ring-[rgba(255,107,36,0.24)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitting || email.trim().length === 0}
          className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Envoi…" : "Continuer →"}
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
      </p>
    </div>
  );
}
