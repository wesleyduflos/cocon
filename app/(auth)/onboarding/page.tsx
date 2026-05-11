"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Si l'utilisateur n'est pas connecté, on le renvoie vers le login.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <p className="text-[13px] text-muted-foreground">Chargement…</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
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

      <article className="rounded-[14px] border border-border bg-surface px-5 py-4 flex flex-col gap-2">
        <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          Prochaine étape
        </p>
        <p className="text-[15px] text-foreground leading-[1.5]">
          Création / rejoindre un cocon — implémenté à la <strong>sous-tâche
          4</strong> du sprint 1.
        </p>
      </article>
    </div>
  );
}
