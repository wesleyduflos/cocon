"use client";

import {
  AlertTriangle,
  Calendar,
  Repeat,
  Sparkles,
  Star,
} from "lucide-react";

/* =========================================================================
   Mockups dashboard — page de comparaison visuelle non-listée.

   Accessible via /mockups/dashboard. Trois variantes empilées avec un
   séparateur entre chaque. Toutes les données sont factices.

   Wesley regarde, choisit, on pousse celle qu'il préfère en remplacement
   du vrai dashboard.
   ========================================================================= */

const MOCK = {
  firstName: "Wesley",
  today: "Mardi 12 mai",
  weather: {
    emoji: "🌤️",
    temp: 18,
    condition: "Partiellement nuageux",
    location: "Magnolia",
  },
  summary: "3 tâches aujourd'hui, dont 1 en retard.",
  alerts: [
    { emoji: "🧼", title: "Lessive épuisée", weight: 100 },
    { emoji: "☕", title: "Café bas", weight: 70 },
    { emoji: "📜", title: "Garantie frigo Samsung expire dans 12j", weight: 80 },
  ],
  todayTasks: [
    {
      id: "1",
      title: "Sortir les poubelles jaunes",
      meta: "Maison · Wesley",
      priority: true,
      overdue: false,
      recurring: true,
    },
    {
      id: "2",
      title: "Appeler le véto pour Mochi",
      meta: "Animaux · Camille",
      priority: false,
      overdue: true,
      recurring: false,
    },
    {
      id: "3",
      title: "Récupérer le pain",
      meta: "Cuisine · Wesley",
      priority: false,
      overdue: false,
      recurring: false,
    },
  ],
  calendar: [
    { time: "14:00", title: "Rdv kiné", location: "Cabinet Lyon 6" },
    { time: "19:30", title: "Dîner Léa & Tom", location: "Chez nous" },
  ],
  suggestion: {
    emoji: "🌴",
    name: "Avant les vacances",
    event: "Vacances Bretagne",
    daysLabel: "dans 3 jours",
  },
  balance: {
    ratio: 0.12,
    message: "Vous formez une équipe au top !",
    me: { count: 4, weight: 8 },
    other: { count: 3, weight: 7 },
  },
  runs: [{ emoji: "🌴", name: "Avant les vacances", done: 8, total: 12 }],
};

function Separator({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 px-5 my-8 border-y border-border-subtle bg-surface/30">
      <span className="text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">
        ⇣ Mockup suivant ⇣
      </span>
      <h2 className="font-display text-[22px] font-bold text-foreground text-center">
        {label}
      </h2>
    </div>
  );
}

/* =========================================================================
   VARIANTE 1 — Calme câlin (raffinement de l'actuel)

   Pari : douceur, espace, plus de chaleur visuelle. Hero unifié, sections
   nettement séparées sans surcharge.
   ========================================================================= */

function VariantCalm() {
  return (
    <main className="flex flex-col gap-6 px-5 py-7 max-w-md w-full mx-auto">
      {/* Hero unifié : greeting + météo dans un même bloc gradient */}
      <section
        className="rounded-[20px] px-5 py-5 flex flex-col gap-3 border"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,107,36,0.12), rgba(255,200,69,0.04))",
          borderColor: "rgba(255,107,36,0.22)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              {MOCK.today}
            </p>
            <h1 className="font-display text-[28px] font-semibold leading-[1.05] mt-1">
              Bonjour{" "}
              <span className="greeting-gradient">{MOCK.firstName}</span>
            </h1>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[28px] leading-none">
              {MOCK.weather.emoji}
            </div>
            <div className="text-[14px] font-semibold mt-1">
              {MOCK.weather.temp}°
            </div>
            <div className="text-[10px] text-muted-foreground">
              {MOCK.weather.location}
            </div>
          </div>
        </div>
        <p className="text-[13px] text-muted-foreground leading-[1.5]">
          {MOCK.summary}
        </p>
      </section>

      {/* Suggestion IA */}
      <article className="rounded-[16px] bg-gradient-to-br from-[rgba(255,107,36,0.10)] to-[rgba(255,200,69,0.04)] border border-[rgba(255,107,36,0.24)] px-5 py-4 flex flex-col gap-2">
        <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-primary font-semibold flex items-center gap-1.5">
          <Sparkles size={11} /> Suggestion · {MOCK.suggestion.emoji}
        </p>
        <p className="font-display text-[17px] font-semibold leading-tight">
          {MOCK.suggestion.event}{" "}
          <span className="text-muted-foreground font-normal">
            {MOCK.suggestion.daysLabel}
          </span>
        </p>
        <p className="text-[12px] text-muted-foreground">
          Lance « {MOCK.suggestion.name} » ?
        </p>
        <div className="flex gap-2 mt-1">
          <button className="rounded-[10px] bg-primary text-primary-foreground text-[13px] font-semibold px-3.5 py-2 flex-1">
            Lancer
          </button>
          <button className="rounded-[10px] border border-border text-foreground text-[13px] px-3.5 py-2">
            Plus tard
          </button>
        </div>
      </article>

      {/* Alertes — chips horizontaux scrollables */}
      <section className="flex flex-col gap-2.5">
        <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
          <AlertTriangle size={11} className="text-primary" />
          Alertes du foyer · {MOCK.alerts.length}
        </h2>
        <ul className="flex flex-col gap-1.5">
          {MOCK.alerts.map((a, i) => (
            <li
              key={i}
              className="rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5 flex items-center gap-2.5"
            >
              <span className="text-[16px]">{a.emoji}</span>
              <span className="flex-1 text-[13px]">{a.title}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Tâches du jour */}
      <section className="flex flex-col gap-2.5">
        <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          Tâches du jour
        </h2>
        <ul className="flex flex-col gap-2">
          {MOCK.todayTasks.map((t) => (
            <li
              key={t.id}
              className={`rounded-[12px] bg-surface flex items-center gap-3.5 ${
                t.overdue
                  ? "border border-destructive/60 border-l-[3px]"
                  : "border border-border"
              }`}
            >
              <div className="shrink-0 pl-4 py-3.5">
                <span className="w-5 h-5 rounded-[6px] border-[1.5px] border-[#5C3D2C] block" />
              </div>
              <div className="flex-1 py-3.5 pr-4 min-w-0">
                <div className="flex items-center gap-1.5 text-[15px] font-medium truncate">
                  {t.priority ? (
                    <Star
                      size={13}
                      fill="var(--secondary)"
                      className="text-[var(--secondary)] shrink-0"
                    />
                  ) : null}
                  {t.recurring ? (
                    <Repeat size={12} className="text-muted-foreground" />
                  ) : null}
                  <span className="truncate">{t.title}</span>
                </div>
                <div className="text-[12px] text-muted-foreground truncate">
                  {t.meta}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Agenda du jour */}
      <section className="flex flex-col gap-2.5">
        <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
          <Calendar size={11} />
          Agenda · {MOCK.calendar.length}
        </h2>
        <ul className="flex flex-col gap-1.5">
          {MOCK.calendar.map((c, i) => (
            <li
              key={i}
              className="rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5 flex items-baseline gap-3"
            >
              <span className="font-display font-semibold text-[14px] text-primary shrink-0 w-12">
                {c.time}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium truncate">
                  {c.title}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {c.location}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Équilibre */}
      <article className="rounded-[14px] bg-surface border border-border-subtle px-5 py-4 flex flex-col gap-2">
        <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          Équilibre · 7 jours
        </p>
        <p className="text-[13px] text-foreground">{MOCK.balance.message}</p>
        <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden mt-1">
          <div
            className="h-full bg-gradient-to-r from-secondary to-primary"
            style={{ width: `${(1 - MOCK.balance.ratio) * 100}%` }}
          />
        </div>
      </article>
    </main>
  );
}

/* =========================================================================
   VARIANTE 2 — Glance dense (info-dashboard)

   Pari : tout voir d'un coup d'œil. Grille 2×2 de tuiles KPI en haut, liste
   des tâches en dessous. Plus utile pour vérifier l'état du foyer en 3s
   avant de partir au boulot.
   ========================================================================= */

function VariantGlance() {
  return (
    <main className="flex flex-col gap-5 px-5 py-7 max-w-md w-full mx-auto">
      {/* Greeting compact */}
      <section>
        <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          {MOCK.today}
        </p>
        <h1 className="font-display text-[24px] font-semibold leading-tight">
          Bonjour{" "}
          <span className="greeting-gradient">{MOCK.firstName}</span>
        </h1>
      </section>

      {/* Grille 2x2 de KPIs */}
      <div className="grid grid-cols-2 gap-2.5">
        <article className="rounded-[14px] border border-border bg-surface px-3.5 py-3 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Tâches du jour
          </p>
          <p className="font-display text-[28px] font-bold leading-none">
            3
          </p>
          <p className="text-[11px] text-destructive">1 en retard</p>
        </article>
        <article className="rounded-[14px] border border-border bg-surface px-3.5 py-3 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Météo
          </p>
          <p className="font-display text-[20px] font-semibold leading-none flex items-center gap-1.5">
            {MOCK.weather.emoji} {MOCK.weather.temp}°
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {MOCK.weather.condition}
          </p>
        </article>
        <article className="rounded-[14px] border border-[rgba(255,107,36,0.3)] bg-[rgba(255,107,36,0.06)] px-3.5 py-3 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-[0.12em] text-primary">
            Alertes
          </p>
          <p className="font-display text-[28px] font-bold leading-none">
            {MOCK.alerts.length}
          </p>
          <p className="text-[11px] text-muted-foreground">à traiter</p>
        </article>
        <article className="rounded-[14px] border border-border bg-surface px-3.5 py-3 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Équilibre
          </p>
          <p className="font-display text-[20px] font-semibold leading-none">
            👍
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            Équipe au top
          </p>
        </article>
      </div>

      {/* Suggestion compacte */}
      <article className="rounded-[12px] border border-[rgba(255,107,36,0.32)] bg-[rgba(255,107,36,0.08)] px-3.5 py-2.5 flex items-center gap-3">
        <span className="text-[20px]">{MOCK.suggestion.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium truncate">
            {MOCK.suggestion.event} {MOCK.suggestion.daysLabel}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            Lance « {MOCK.suggestion.name} »
          </p>
        </div>
        <button className="rounded-[8px] bg-primary text-primary-foreground text-[12px] font-semibold px-3 py-1.5">
          Lancer
        </button>
      </article>

      {/* Alertes détaillées */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          Alertes
        </h2>
        <ul className="flex flex-col gap-1">
          {MOCK.alerts.map((a, i) => (
            <li
              key={i}
              className="rounded-[10px] bg-surface px-3 py-2 flex items-center gap-2.5 text-[13px]"
            >
              <span>{a.emoji}</span>
              <span className="flex-1 truncate">{a.title}</span>
              <span className="text-[10px] text-muted-foreground">→</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Tâches denses */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          Tâches du jour
        </h2>
        <ul className="flex flex-col gap-1">
          {MOCK.todayTasks.map((t) => (
            <li
              key={t.id}
              className={`rounded-[10px] bg-surface flex items-center gap-2.5 px-3 py-2 ${
                t.overdue ? "border-l-2 border-l-destructive" : ""
              }`}
            >
              <span className="w-4 h-4 rounded-[4px] border-[1.5px] border-[#5C3D2C] shrink-0" />
              <span className="flex items-center gap-1.5 text-[14px] flex-1 min-w-0 truncate">
                {t.priority ? (
                  <Star
                    size={12}
                    fill="var(--secondary)"
                    className="text-[var(--secondary)] shrink-0"
                  />
                ) : null}
                <span className="truncate">{t.title}</span>
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {t.meta.split(" · ")[1]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Agenda compact */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          Agenda
        </h2>
        <ul className="flex flex-col gap-1">
          {MOCK.calendar.map((c, i) => (
            <li
              key={i}
              className="rounded-[10px] bg-surface px-3 py-2 flex items-baseline gap-3 text-[13px]"
            >
              <span className="font-display font-semibold text-primary w-12 shrink-0">
                {c.time}
              </span>
              <span className="flex-1 truncate">{c.title}</span>
              <span className="text-[10px] text-muted-foreground truncate">
                {c.location}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

/* =========================================================================
   VARIANTE 3 — Magazine éditorial

   Pari : grosse typographie, sections nettes, lecture verticale immersive.
   Plus "boutique" / artisanal. Plus de scroll, mais chaque section est
   un mini-univers.
   ========================================================================= */

function VariantMagazine() {
  return (
    <main className="flex flex-col gap-10 px-5 py-10 max-w-md w-full mx-auto">
      {/* Greeting éditorial massif */}
      <section className="flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--secondary)] font-medium">
          {MOCK.today.toUpperCase()}
        </p>
        <h1 className="font-display text-[40px] font-bold leading-[1.05] tracking-[-0.02em]">
          Bonjour
          <br />
          <span className="greeting-gradient">{MOCK.firstName}</span>.
        </h1>
        <p className="text-[14px] text-muted-foreground mt-3 leading-[1.5]">
          {MOCK.weather.emoji} {MOCK.weather.temp}°,{" "}
          {MOCK.weather.condition.toLowerCase()} à {MOCK.weather.location}.
        </p>
      </section>

      {/* I. Aujourd'hui */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[12px] text-[var(--secondary)] font-semibold tracking-[0.15em]">
            I.
          </span>
          <h2 className="font-display text-[22px] font-bold leading-tight">
            Aujourd&apos;hui
          </h2>
        </div>
        <p className="text-[13px] text-muted-foreground leading-snug">
          {MOCK.summary}
        </p>
        <ul className="flex flex-col gap-2 mt-2">
          {MOCK.todayTasks.map((t) => (
            <li key={t.id} className="flex items-baseline gap-3 py-1">
              <span className="w-4 h-4 rounded-full border border-foreground/30 shrink-0 translate-y-0.5" />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[15px] font-medium leading-snug ${
                    t.overdue ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {t.priority ? "⭐ " : ""}
                  {t.title}
                  {t.recurring ? " · 🔁" : ""}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t.meta}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* II. Alertes */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[12px] text-[var(--secondary)] font-semibold tracking-[0.15em]">
            II.
          </span>
          <h2 className="font-display text-[22px] font-bold leading-tight">
            À surveiller
          </h2>
        </div>
        <ul className="flex flex-col gap-2">
          {MOCK.alerts.map((a, i) => (
            <li
              key={i}
              className="flex items-baseline gap-2.5 py-1 border-b border-border-subtle pb-2 last:border-0"
            >
              <span className="text-[14px]">{a.emoji}</span>
              <span className="text-[14px] flex-1">{a.title}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* III. Préparation */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[12px] text-[var(--secondary)] font-semibold tracking-[0.15em]">
            III.
          </span>
          <h2 className="font-display text-[22px] font-bold leading-tight">
            Préparation suggérée
          </h2>
        </div>
        <article className="rounded-[14px] border border-[rgba(255,107,36,0.3)] bg-[rgba(255,107,36,0.06)] px-5 py-4 flex flex-col gap-3">
          <p className="text-[20px] leading-none">{MOCK.suggestion.emoji}</p>
          <p className="font-display text-[18px] font-semibold leading-tight">
            {MOCK.suggestion.event} {MOCK.suggestion.daysLabel}.
          </p>
          <p className="text-[13px] text-muted-foreground">
            Lance la routine « {MOCK.suggestion.name} » pour ne rien oublier.
          </p>
          <button className="self-start rounded-[10px] bg-primary text-primary-foreground text-[13px] font-semibold px-4 py-2 mt-1">
            Lancer la routine →
          </button>
        </article>
      </section>

      {/* IV. Agenda */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[12px] text-[var(--secondary)] font-semibold tracking-[0.15em]">
            IV.
          </span>
          <h2 className="font-display text-[22px] font-bold leading-tight">
            Rendez-vous
          </h2>
        </div>
        <ul className="flex flex-col gap-3">
          {MOCK.calendar.map((c, i) => (
            <li key={i} className="flex gap-4 items-baseline">
              <span className="font-display text-[18px] font-bold text-primary shrink-0">
                {c.time}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium">{c.title}</p>
                <p className="text-[12px] text-muted-foreground">
                  {c.location}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

/* =========================================================================
   Page racine — empile les 3 variantes
   ========================================================================= */

export default function MockupsDashboardPage() {
  return (
    <div className="flex flex-col">
      <div className="px-5 py-8 max-w-md w-full mx-auto">
        <h1 className="font-display text-[26px] font-bold mb-2">
          Mockups dashboard
        </h1>
        <p className="text-[13px] text-muted-foreground leading-[1.5]">
          3 variantes empilées ci-dessous. Données factices. Scrolle, compare,
          et dis-moi laquelle tu préfères (ou ce que tu veux mixer entre elles).
        </p>
      </div>

      <Separator label="Variante 1 — Calme & câlin" />
      <VariantCalm />

      <Separator label="Variante 2 — Glance & action (info-dashboard)" />
      <VariantGlance />

      <Separator label="Variante 3 — Magazine éditorial" />
      <VariantMagazine />

      <div className="h-8" />
    </div>
  );
}
