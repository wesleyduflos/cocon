"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/use-auth";
import { createHousehold } from "@/lib/firebase/firestore";

const EMOJI_CHOICES = ["🏠", "🪴", "🕯️", "🔥", "🦊", "🌿", "☕", "✨"];

export default function CreateHouseholdPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string>("🏠");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      await createHousehold({
        name: name.trim(),
        emoji,
        ownerId: user.uid,
      });
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer le cocon. Réessaie dans quelques instants.",
      );
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return <p className="text-[13px] text-muted-foreground">Chargement…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          Étape 1 / 2
        </p>
        <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
          <span className="greeting-gradient">Ton cocon</span> a un nom ?
        </h1>
        <p className="text-[15px] text-muted-foreground leading-[1.5]">
          Tu pourras le changer plus tard dans les paramètres.
        </p>
      </header>

      <div className="flex flex-col gap-2.5">
        <label
          htmlFor="cocon-name"
          className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
        >
          Nom du cocon
        </label>
        <input
          id="cocon-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex. Cocon Magnolia"
          required
          maxLength={48}
          autoFocus
          disabled={submitting}
          className="rounded-[12px] border border-[var(--primary)] bg-surface px-4 py-3.5 text-[15px] text-foreground placeholder:text-foreground-faint focus:outline-none focus:ring-2 focus:ring-[rgba(255,107,36,0.24)] disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          Emoji
        </span>
        <div className="flex flex-wrap gap-2">
          {EMOJI_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => setEmoji(choice)}
              disabled={submitting}
              aria-pressed={emoji === choice}
              className={`w-11 h-11 rounded-[10px] text-[20px] flex items-center justify-center transition-all ${
                emoji === choice
                  ? "bg-primary text-primary-foreground shadow-[0_0_14px_rgba(255,107,36,0.45)]"
                  : "bg-surface border border-border hover:bg-surface-elevated"
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={submitting || name.trim().length === 0}
          className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Création…" : "Créer le cocon →"}
        </button>
        {error ? (
          <p role="alert" className="text-[13px] text-destructive leading-[1.5]">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
