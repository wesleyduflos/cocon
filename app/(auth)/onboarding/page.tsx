"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  getHouseholdsOfUser,
  joinHouseholdByCode,
} from "@/lib/firebase/firestore";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Si pas connecté → /login.
  // Si connecté ET déjà membre d'un cocon → /dashboard.
  // Sinon → afficher les 2 choix (créer / rejoindre via code).
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    getHouseholdsOfUser(user.uid)
      .then((households) => {
        if (cancelled) return;
        if (households.length > 0) {
          router.replace("/");
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, router]);

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setJoinError(null);
    setJoining(true);
    try {
      await joinHouseholdByCode(code.trim().toUpperCase(), user.uid);
      router.replace("/");
    } catch (err) {
      setJoinError(
        err instanceof Error
          ? err.message
          : "Code invalide ou inutilisable.",
      );
      setJoining(false);
    }
  }

  if (loading || checking || !user) {
    return (
      <p className="text-[13px] text-muted-foreground">Chargement…</p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          Bienvenue
        </p>
        <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
          On installe <span className="greeting-gradient">ton cocon</span>.
        </h1>
        <p className="text-[15px] text-muted-foreground leading-[1.5]">
          Tu es connecté en tant que{" "}
          <span className="text-foreground font-medium">{user.email}</span>.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Link
          href="/onboarding/create"
          className="rounded-[14px] border border-border bg-surface px-5 py-4 flex flex-col gap-1 hover:bg-surface-elevated transition-colors"
        >
          <p className="text-[15px] font-semibold text-foreground">
            Créer mon cocon
          </p>
          <p className="text-[13px] text-muted-foreground leading-[1.4]">
            Nouveau foyer, nouvel espace partagé. Tu pourras inviter
            quelqu&apos;un ensuite via un code.
          </p>
        </Link>

        <form
          onSubmit={handleJoin}
          className="rounded-[14px] border border-border-subtle bg-surface px-5 py-4 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <KeyRound size={14} className="text-primary" />
            <p className="text-[15px] font-semibold text-foreground">
              J&apos;ai un code d&apos;invitation
            </p>
          </div>
          <p className="text-[13px] text-muted-foreground leading-[1.4]">
            Tape le code à 6 caractères qu&apos;on t&apos;a partagé.
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD12"
            maxLength={6}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={joining}
            className="rounded-[10px] border border-border bg-background px-4 py-3 text-[18px] font-display font-bold tracking-[0.2em] text-center uppercase focus:outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(255,107,36,0.18)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={joining || code.trim().length < 6}
            className="rounded-[10px] bg-primary text-primary-foreground font-sans font-semibold text-[14px] px-4 py-2.5 shadow-[0_0_14px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {joining ? "Connexion…" : "Rejoindre le cocon"}
          </button>
          {joinError ? (
            <p role="alert" className="text-[12px] text-destructive">
              {joinError}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
