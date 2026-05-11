"use client";

import { getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  completeMagicLink,
  isMagicLink,
} from "@/lib/auth/magic-link";
import { createUserDoc, userDoc } from "@/lib/firebase/firestore";

type Status = "completing" | "error";

export default function CompleteLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("completing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // useEffect peut tirer 2× en dev strict mode — on guard pour ne pas
  // appeler signInWithEmailLink deux fois (le 2e échouerait : lien usé).
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    async function complete() {
      const url = window.location.href;
      if (!isMagicLink(url)) {
        setStatus("error");
        setErrorMessage("Ce lien est invalide ou a déjà été utilisé.");
        return;
      }

      try {
        const fbUser = await completeMagicLink(url);
        const snap = await getDoc(userDoc(fbUser.uid));
        if (!snap.exists()) {
          await createUserDoc({
            uid: fbUser.uid,
            email: fbUser.email ?? "",
            displayName: fbUser.email?.split("@")[0] ?? "Membre du cocon",
          });
        }
        router.replace("/onboarding");
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Erreur lors de la connexion. Réessaie depuis l'écran de login.",
        );
      }
    }

    complete();
  }, [router]);

  return (
    <div className="flex flex-col gap-6">
      {status === "completing" ? (
        <>
          <header className="flex flex-col gap-3">
            <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
              <span className="greeting-gradient">Connexion</span> en cours…
            </h1>
            <p className="text-[15px] text-muted-foreground leading-[1.5]">
              On finalise ton arrivée dans le cocon.
            </p>
          </header>
          <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full glow-dot animate-pulse" />
            Sécurisation de la session
          </div>
        </>
      ) : (
        <>
          <header className="flex flex-col gap-3">
            <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
              Lien <span className="text-destructive">non valable</span>
            </h1>
            <p className="text-[15px] text-muted-foreground leading-[1.5]">
              {errorMessage}
            </p>
          </header>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors self-start"
          >
            Revenir à l&apos;écran de connexion
          </button>
        </>
      )}
    </div>
  );
}
