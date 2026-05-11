"use client";

import { httpsCallable } from "firebase/functions";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { functions } from "@/lib/firebase/client";

interface ExchangeOutput {
  googleEmail: string;
}

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [error, setError] = useState<string | null>(null);
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    ranOnce.current = true;

    const code = searchParams.get("code");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      setStatus("error");
      setError(`Google a refusé l'accès (${oauthError}).`);
      return;
    }
    if (!code) {
      setStatus("error");
      setError("Pas de code OAuth reçu. Recommence depuis Paramètres.");
      return;
    }

    const redirectUri = `${window.location.origin}/integrations/google/callback`;
    const callable = httpsCallable<
      { code: string; redirectUri: string },
      ExchangeOutput
    >(functions, "exchangeGoogleCode");

    callable({ code, redirectUri })
      .then(() => {
        router.replace("/settings/connectors?status=connected");
      })
      .catch((err: unknown) => {
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "L'échange du code a échoué. Réessaie.",
        );
      });
  }, [user, loading, router, searchParams]);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col gap-4 items-center text-center">
        {status === "working" ? (
          <>
            <span className="w-2 h-2 rounded-full glow-dot animate-pulse" />
            <p className="text-[14px] text-muted-foreground">
              Connexion à Google Calendar…
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-[22px] font-semibold">
              Connexion échouée
            </h1>
            <p className="text-[13px] text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => router.replace("/settings/connectors")}
              className="mt-2 rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[14px] px-[16px] py-2 hover:bg-[var(--primary-hover)]"
            >
              Revenir aux paramètres
            </button>
          </>
        )}
      </div>
    </main>
  );
}
