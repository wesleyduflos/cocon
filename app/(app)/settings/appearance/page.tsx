"use client";

import { getDoc } from "firebase/firestore";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { updateUserPreferences, userDoc } from "@/lib/firebase/firestore";
import type { Theme } from "@/types/cocon";

export default function AppearanceSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [theme, setTheme] = useState<Theme>("dark");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDoc(userDoc(user.uid))
      .then((snap) => {
        if (cancelled) return;
        setTheme(snap.data()?.preferences?.theme ?? "dark");
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

  async function handleChange(next: Theme) {
    if (!user || next === theme) return;
    setUpdating(true);
    const previous = theme;
    setTheme(next); // optimistic
    try {
      await updateUserPreferences(user.uid, { theme: next });
      showToast({ message: "Thème mis à jour" });
    } catch {
      setTheme(previous);
    } finally {
      setUpdating(false);
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
              Apparence
            </h1>
          </div>
        </header>

        {loading ? (
          <p className="text-[13px] text-muted-foreground">Chargement…</p>
        ) : (
          <>
            <p className="text-[14px] text-muted-foreground leading-[1.5]">
              Cocon est conçu pour le mode sombre Brique Flamme. Le mode clair
              est disponible en alternative.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChange("dark")}
                disabled={updating}
                aria-pressed={theme === "dark"}
                className={`rounded-[14px] border bg-surface px-4 py-5 flex flex-col gap-2 transition-all ${
                  theme === "dark"
                    ? "border-primary shadow-[0_0_16px_rgba(255,107,36,0.4)]"
                    : "border-border hover:bg-surface-elevated"
                } disabled:opacity-60`}
              >
                <Moon
                  size={20}
                  className={theme === "dark" ? "text-primary" : "text-muted-foreground"}
                />
                <span className="text-[14px] font-semibold">Sombre</span>
                <span className="text-[11px] text-muted-foreground">
                  Brique Flamme
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleChange("light")}
                disabled={updating}
                aria-pressed={theme === "light"}
                className={`rounded-[14px] border bg-surface px-4 py-5 flex flex-col gap-2 transition-all ${
                  theme === "light"
                    ? "border-primary shadow-[0_0_16px_rgba(255,107,36,0.4)]"
                    : "border-border hover:bg-surface-elevated"
                } disabled:opacity-60`}
              >
                <Sun
                  size={20}
                  className={theme === "light" ? "text-primary" : "text-muted-foreground"}
                />
                <span className="text-[14px] font-semibold">Clair</span>
                <span className="text-[11px] text-muted-foreground">
                  Crème chaud
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
