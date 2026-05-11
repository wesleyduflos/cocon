"use client";

import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { user } = useAuth();

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const firstName =
    user?.displayName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "toi";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md flex flex-col gap-10">
        <section className="flex flex-col gap-3">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            {today}
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
            Bonjour <span className="greeting-gradient">{firstName}</span>
          </h1>
          <p className="text-[0.9375rem] text-muted-foreground leading-[1.5]">
            Sprint 1 en cours. Le cocon démarre.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            État
          </p>
          <article className="rounded-[12px] border border-border bg-surface px-4 py-3.5 flex items-center gap-3.5">
            <div className="w-5 h-5 rounded-[6px] border-[1.5px] border-[#5C3D2C]" />
            <div className="flex-1 flex flex-col">
              <span className="text-[15px] font-medium">
                Authentification email-first
              </span>
              <span className="text-[12px] text-muted-foreground">
                Sous-tâche 3 · aujourd&apos;hui
              </span>
            </div>
            <span className="w-[7px] h-[7px] rounded-full glow-dot" />
          </article>
        </section>
      </div>
    </main>
  );
}
