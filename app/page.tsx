export default function Home() {
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md flex flex-col gap-10">
        <section className="flex flex-col gap-3">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            {today}
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
            Bonjour <span className="greeting-gradient">Wesley</span>
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
              <span className="text-[15px] font-medium">Setup Next.js + Firebase + Brique Flamme</span>
              <span className="text-[12px] text-muted-foreground">Sous-tâche 1 · aujourd&apos;hui</span>
            </div>
            <span className="w-[7px] h-[7px] rounded-full glow-dot" />
          </article>
        </section>

        <section className="flex gap-2">
          <button
            type="button"
            className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-2.5 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            Continuer
          </button>
          <button
            type="button"
            className="rounded-[12px] border border-border bg-transparent text-foreground font-sans font-semibold text-[15px] px-[18px] py-2.5 hover:bg-surface-elevated transition-colors"
          >
            Plus tard
          </button>
        </section>
      </div>
    </main>
  );
}
