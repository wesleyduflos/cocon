"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  createHousehold,
  setHouseholdInviteCode,
} from "@/lib/firebase/firestore";

/* =========================================================================
   /onboarding/create — sprint 5 polish

   Plus de saisie de nom ni d'emoji pour le cocon (Wesley a demandé de
   retirer). Création directe avec nom par défaut "Mon Cocon" et génération
   automatique d'un code d'invitation à 6 caractères.
   ========================================================================= */

export default function CreateHouseholdPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  async function handleCreate() {
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const householdId = await createHousehold({
        name: "Mon Cocon",
        ownerId: user.uid,
      });
      // Génère un code d'invitation par défaut pour partager facilement.
      try {
        await setHouseholdInviteCode(householdId, "Mon Cocon", user.uid);
      } catch {
        // Si la génération du code échoue, on laisse la création passer
        // — l'user pourra le générer plus tard depuis /settings/cocon.
      }
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
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
          On crée <span className="greeting-gradient">ton cocon</span>.
        </h1>
        <p className="text-[15px] text-muted-foreground leading-[1.5]">
          Un espace partagé pour t&apos;organiser à deux. Tu pourras inviter
          quelqu&apos;un juste après via un code à 6 caractères.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleCreate}
          disabled={submitting}
          className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Création…" : "Créer mon cocon →"}
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
