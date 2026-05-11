"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { getHouseholdsOfUser } from "@/lib/firebase/firestore";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);

  // Si pas connecté → /login.
  // Si connecté ET déjà membre d'un cocon → /dashboard.
  // Sinon → afficher les 2 choix (créer / rejoindre).
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
            Nouveau foyer, nouvel espace partagé. Tu pourras inviter quelqu&apos;un ensuite.
          </p>
        </Link>

        <div className="rounded-[14px] border border-border-subtle bg-transparent px-5 py-4 flex flex-col gap-2">
          <p className="text-[15px] font-semibold text-foreground">
            J&apos;ai un lien d&apos;invitation
          </p>
          <p className="text-[13px] text-muted-foreground leading-[1.4]">
            Demande à la personne qui t&apos;invite de te partager le lien
            <code className="text-foreground"> /join/…</code> qu&apos;elle voit après avoir créé son cocon.
          </p>
        </div>
      </div>
    </div>
  );
}
