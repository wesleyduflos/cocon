"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { auth } from "@/lib/firebase/client";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { household } = useCurrentHousehold();

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const firstName =
    user?.displayName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "toi";

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col gap-10">
        <section className="flex flex-col gap-3">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            {today}
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
            Bonjour <span className="greeting-gradient">{firstName}</span>
          </h1>
          {household ? (
            <p className="text-[0.9375rem] text-muted-foreground leading-[1.5]">
              {household.emoji ? `${household.emoji} ` : ""}
              <span className="text-foreground">{household.name}</span>
              {household.memberIds.length > 1
                ? ` · ${household.memberIds.length} membres`
                : " · juste toi pour l'instant"}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-3">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            État
          </p>
          <article className="rounded-[12px] border border-border bg-surface px-4 py-3.5 flex items-center gap-3.5">
            <div className="w-5 h-5 rounded-[6px] border-[1.5px] border-[#5C3D2C]" />
            <div className="flex-1 flex flex-col">
              <span className="text-[15px] font-medium">
                Module Tâches en place
              </span>
              <span className="text-[12px] text-muted-foreground">
                Sous-tâche 5 · aujourd&apos;hui
              </span>
            </div>
            <span className="w-[7px] h-[7px] rounded-full glow-dot" />
          </article>
        </section>

        {household && household.memberIds.length < 2 ? (
          <section className="flex flex-col gap-3">
            <Link
              href="/invite"
              className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors text-center"
            >
              Inviter quelqu&apos;un →
            </Link>
            <p className="text-[12px] text-foreground-faint text-center">
              Tu es seul·e dans ton cocon. Génère un lien à partager.
            </p>
          </section>
        ) : null}

        <section className="flex justify-center pt-4">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-[12px] text-foreground-faint hover:text-muted-foreground transition-colors"
          >
            Se déconnecter
          </button>
        </section>
      </div>
    </main>
  );
}
