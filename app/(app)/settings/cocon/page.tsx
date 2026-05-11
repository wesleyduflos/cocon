"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useMembers } from "@/hooks/use-members";
import { updateHousehold } from "@/lib/firebase/firestore";

const EMOJI_CHOICES = ["🏠", "🪴", "🕯️", "🔥", "🦊", "🌿", "☕", "✨"];

export default function CoconSettingsPage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { members } = useMembers(household?.memberIds);
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🏠");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!household) return;
    setName(household.name);
    setEmoji(household.emoji ?? "🏠");
  }, [household]);

  const isOwner = household?.ownerId === user?.uid;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!household) return;
    setSubmitting(true);
    try {
      await updateHousehold(household.id, { name: name.trim(), emoji });
      showToast({ message: "Cocon mis à jour" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-7">
      <div className="w-full max-w-md mx-auto flex flex-col gap-6">
        <header className="flex items-center gap-3">
          <Link
            href="/settings"
            aria-label="Retour"
            className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex flex-col">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Paramètres
            </p>
            <h1 className="font-display text-[22px] font-semibold leading-tight">
              Mon cocon
            </h1>
          </div>
        </header>

        {/* Édition nom + emoji (owner only) */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
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
              maxLength={48}
              required
              disabled={!isOwner || submitting}
              className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[15px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(255,107,36,0.18)] disabled:opacity-50"
            />
            {!isOwner ? (
              <p className="text-[12px] text-foreground-faint">
                Seul·e l&apos;owner peut renommer le cocon.
              </p>
            ) : null}
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
                  disabled={!isOwner || submitting}
                  aria-pressed={emoji === choice}
                  className={`w-11 h-11 rounded-[10px] text-[20px] flex items-center justify-center transition-all ${
                    emoji === choice
                      ? "bg-primary text-primary-foreground shadow-[0_0_14px_rgba(255,107,36,0.45)]"
                      : "bg-surface border border-border hover:bg-surface-elevated"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
          {isOwner ? (
            <button
              type="submit"
              disabled={submitting || name.trim().length === 0}
              className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-start"
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          ) : null}
        </form>

        {/* Membres */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Membres ({members.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {members.map((m) => {
              const isMe = m.uid === user?.uid;
              const isHouseholdOwner = m.uid === household?.ownerId;
              return (
                <li
                  key={m.uid}
                  className="rounded-[12px] border border-border bg-surface px-4 py-3 flex items-center gap-3"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-semibold text-[16px] ${
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {m.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="text-[14px] font-medium">
                      {isMe ? `${m.displayName} (toi)` : m.displayName}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {isHouseholdOwner ? "Owner" : "Membre"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {members.length < 2 ? (
            <Link
              href="/invite"
              className="rounded-[12px] border border-dashed border-primary text-primary font-sans font-semibold text-[14px] px-[18px] py-3 text-center hover:bg-[rgba(255,107,36,0.08)] transition-colors"
            >
              + Inviter quelqu&apos;un
            </Link>
          ) : null}
        </section>
      </div>
    </main>
  );
}
