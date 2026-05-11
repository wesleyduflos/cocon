"use client";

import { signOut } from "firebase/auth";
import { ArrowLeft, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase/client";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut(auth);
    router.replace("/login");
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
              Compte
            </h1>
          </div>
        </header>

        <div className="rounded-[14px] border border-border bg-surface px-4 py-3 flex flex-col gap-1">
          <span className="text-[12px] text-muted-foreground">
            Connecté en tant que
          </span>
          <span className="text-[15px] font-medium text-foreground">
            {user?.email ?? "—"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="rounded-[12px] border border-border bg-transparent text-foreground font-sans font-semibold text-[15px] px-[18px] py-3 hover:bg-surface-elevated transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <LogOut size={16} />
          {signingOut ? "Déconnexion…" : "Se déconnecter"}
        </button>

        <div className="rounded-[14px] border border-[rgba(229,55,77,0.4)] bg-[rgba(229,55,77,0.05)] px-4 py-4 flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-destructive">
            Supprimer mon compte
          </p>
          <p className="text-[12px] text-muted-foreground leading-[1.5]">
            La suppression définitive sera disponible dans une prochaine
            version. En attendant, contacte-nous depuis l&apos;app de
            ton·ta partenaire.
          </p>
          <button
            type="button"
            disabled
            className="self-start mt-1 rounded-[10px] border border-[rgba(229,55,77,0.4)] text-destructive font-sans font-semibold text-[13px] px-3 py-1.5 opacity-50 cursor-not-allowed"
          >
            Supprimer (bientôt)
          </button>
        </div>
      </div>
    </main>
  );
}
