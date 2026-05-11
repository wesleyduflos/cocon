"use client";

import { getDoc } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { updateUserDisplayName, userDoc } from "@/lib/firebase/firestore";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDoc(userDoc(user.uid))
      .then((snap) => {
        if (cancelled) return;
        setDisplayName(snap.data()?.displayName ?? "");
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await updateUserDisplayName(user.uid, displayName.trim());
      showToast({ message: "Profil mis à jour" });
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
              Mon profil
            </h1>
          </div>
        </header>

        {loading ? (
          <p className="text-[13px] text-muted-foreground">Chargement…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="display-name"
                className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
              >
                Prénom affiché
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
                required
                disabled={submitting}
                className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[15px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(255,107,36,0.18)] disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
                Email
              </span>
              <p className="rounded-[12px] border border-border-subtle bg-transparent px-4 py-3 text-[15px] text-muted-foreground">
                {user?.email ?? "—"}
              </p>
              <p className="text-[12px] text-foreground-faint">
                L&apos;email est lié à ton compte d&apos;authentification et ne peut pas être modifié ici.
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting || displayName.trim().length === 0}
              className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-start"
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
