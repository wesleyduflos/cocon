"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  humanReadableAuthError,
  signUpWithPassword,
} from "@/lib/auth/password";
import { retrievePendingInviteToken } from "@/lib/auth/invite-storage";
import { createUserDoc, userDoc } from "@/lib/firebase/firestore";
import { getDoc } from "firebase/firestore";

export default function SignupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  async function handleSignup(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Mot de passe trop court (minimum 6 caractères).");
      return;
    }
    setSubmitting(true);
    try {
      const cleanedEmail = email.trim();
      const fbUser = await signUpWithPassword(cleanedEmail, password);
      // Crée le doc Firestore users/{uid} si pas déjà là (sécurité au cas où).
      const snap = await getDoc(userDoc(fbUser.uid));
      if (!snap.exists()) {
        await createUserDoc({
          uid: fbUser.uid,
          email: cleanedEmail,
          displayName:
            cleanedEmail.split("@")[0] || "Membre du cocon",
        });
      }
      const pendingToken = retrievePendingInviteToken();
      router.replace(pendingToken ? `/join/${pendingToken}` : "/onboarding");
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code
          : undefined;
      setError(humanReadableAuthError(code));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
          <span className="greeting-gradient">Bienvenue</span> dans Cocon.
        </h1>
        <p className="text-[15px] text-muted-foreground leading-[1.5]">
          Crée ton compte pour commencer.
        </p>
      </header>

      <form onSubmit={handleSignup} className="flex flex-col gap-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ton@email.fr"
          disabled={submitting}
          className="rounded-[12px] border border-border bg-surface px-4 py-3.5 text-[15px] text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(255,107,36,0.24)] disabled:opacity-50"
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe (6 caractères minimum)"
            disabled={submitting}
            className="w-full rounded-[12px] border border-border bg-surface px-4 py-3.5 pr-12 text-[15px] text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(255,107,36,0.24)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Cacher" : "Afficher"}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-[8px] flex items-center justify-center text-muted-foreground hover:bg-surface-elevated"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button
          type="submit"
          disabled={
            submitting ||
            email.trim().length === 0 ||
            password.length < 6
          }
          className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
        >
          {submitting ? "Création…" : "Créer mon compte"}
        </button>
        {error ? (
          <p
            role="alert"
            className="text-[13px] text-destructive leading-[1.5]"
          >
            {error}
          </p>
        ) : null}
      </form>

      <p className="text-[13px] text-foreground-faint">
        Déjà un compte ?{" "}
        <Link
          href="/login"
          className="text-primary hover:underline font-medium"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
