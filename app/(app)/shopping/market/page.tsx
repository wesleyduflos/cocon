"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useShoppingItems } from "@/hooks/use-shopping";
import {
  checkShoppingItem,
  uncheckShoppingItem,
} from "@/lib/firebase/firestore";
import type { ShoppingItem, ShoppingRayon, WithId } from "@/types/cocon";

const RAYON_ORDER: ShoppingRayon[] = [
  "Frais",
  "Boulangerie",
  "Épicerie",
  "Boissons",
  "Hygiène",
  "Maison",
  "Animalerie",
  "Autre",
];

const RAYON_EMOJI: Record<ShoppingRayon, string> = {
  Frais: "❄️",
  Boulangerie: "🥖",
  Épicerie: "🥫",
  Boissons: "🥤",
  Hygiène: "🧴",
  Maison: "🧹",
  Animalerie: "🐾",
  Autre: "📦",
};

function vibrate() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(50);
    } catch {
      // Safari iOS / browsers without vibration silent
    }
  }
}

interface RayonGroup {
  rayon: ShoppingRayon;
  items: WithId<ShoppingItem>[];
  pendingCount: number;
  totalCount: number;
}

export default function MarketModePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { items } = useShoppingItems(household?.id);

  // On capture le set initial des items pour calculer la progression sur la session.
  // Les items ajoutés en cours de route comptent aussi.
  const [startedAt] = useState(() => Date.now());
  const [activeRayon, setActiveRayon] = useState<ShoppingRayon | null>(null);
  const [celebrated, setCelebrated] = useState(false);

  // Tous les items qu'on regarde dans cette session (pending au démarrage + ceux ajoutés)
  const sessionItems = items;
  const pendingItems = useMemo(
    () => sessionItems.filter((i) => i.status === "pending"),
    [sessionItems],
  );
  const totalItems = sessionItems.length;
  const checkedItems = sessionItems.filter(
    (i) => i.status === "bought",
  ).length;

  const groups = useMemo<RayonGroup[]>(() => {
    const byRayon = new Map<ShoppingRayon, WithId<ShoppingItem>[]>();
    for (const item of sessionItems) {
      const list = byRayon.get(item.rayon) ?? [];
      list.push(item);
      byRayon.set(item.rayon, list);
    }
    return RAYON_ORDER.filter((r) => byRayon.has(r)).map((r) => {
      const all = byRayon.get(r) ?? [];
      return {
        rayon: r,
        items: all,
        pendingCount: all.filter((i) => i.status === "pending").length,
        totalCount: all.length,
      };
    });
  }, [sessionItems]);

  // Auto-sélection du premier rayon non vide
  useEffect(() => {
    if (activeRayon) return;
    const first = groups.find((g) => g.pendingCount > 0);
    if (first) setActiveRayon(first.rayon);
  }, [groups, activeRayon]);

  // Saute automatiquement au rayon suivant quand le rayon courant est fini
  useEffect(() => {
    if (!activeRayon) return;
    const current = groups.find((g) => g.rayon === activeRayon);
    if (current && current.pendingCount === 0) {
      const next = groups.find(
        (g) => g.pendingCount > 0 && g.rayon !== activeRayon,
      );
      if (next) setActiveRayon(next.rayon);
    }
  }, [groups, activeRayon]);

  // Détection fin de session : tous les items cochés
  useEffect(() => {
    if (
      !celebrated &&
      totalItems > 0 &&
      pendingItems.length === 0
    ) {
      setCelebrated(true);
    }
  }, [pendingItems.length, totalItems, celebrated]);

  async function handleToggle(itemId: string, isDone: boolean) {
    if (!household || !user) return;
    vibrate();
    if (isDone) {
      // Décocher = correction d'erreur de saisie, on garde le stock à 'full'
      // (cf bug A.4 sprint 5 : ne pas annuler le renouvellement de stock).
      await uncheckShoppingItem(household.id, itemId);
    } else {
      await checkShoppingItem(household.id, itemId, user.uid);
    }
  }

  function handleFinish() {
    if (pendingItems.length > 0) {
      if (
        !window.confirm(
          `Il reste ${pendingItems.length} article(s) non cochés. Sortir du mode supermarché ?`,
        )
      ) {
        return;
      }
    }
    router.replace("/shopping");
  }

  const activeGroup = activeRayon
    ? groups.find((g) => g.rayon === activeRayon)
    : undefined;
  const activeItems = activeGroup?.items ?? [];

  const progressPct =
    totalItems === 0 ? 0 : Math.round((checkedItems / totalItems) * 100);
  const elapsedMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

  if (celebrated) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 gap-5 text-center">
        <div className="text-[56px]">🎉</div>
        <h1 className="font-display text-[26px] font-semibold leading-tight">
          <span className="greeting-gradient">Bien joué</span>
        </h1>
        <p className="text-[15px] text-muted-foreground max-w-[280px]">
          {totalItems} article{totalItems > 1 ? "s" : ""} cochés en environ{" "}
          {elapsedMin} min.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/shopping")}
          className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors"
        >
          Retour aux courses →
        </button>
      </main>
    );
  }

  if (totalItems === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 gap-5 text-center">
        <div className="text-[40px]">🛒</div>
        <p className="text-[15px] text-muted-foreground max-w-[280px]">
          Aucun article à acheter pour l&apos;instant.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/shopping")}
          className="rounded-[12px] border border-border bg-transparent text-foreground font-sans font-semibold text-[14px] px-[16px] py-2"
        >
          Retour
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-background/90 backdrop-blur-xl border-b border-border">
        <button
          type="button"
          onClick={handleFinish}
          aria-label="Retour"
          className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-[14px] font-medium">
          {checkedItems}/{totalItems} articles
        </h1>
        <button
          type="button"
          onClick={handleFinish}
          className="text-[13px] font-semibold text-primary hover:text-[var(--primary-hover)] px-3 py-1.5"
        >
          Terminer
        </button>
      </header>

      <div className="flex-1 flex flex-col gap-5 px-5 py-5 max-w-md w-full mx-auto">
        {/* Card progression */}
        <article className="rounded-[16px] border border-border bg-surface px-5 py-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-[36px] font-bold leading-none">
              {checkedItems}
              <span className="text-foreground-faint">/{totalItems}</span>
            </span>
            <span className="text-[12px] text-muted-foreground">
              {progressPct}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-border-subtle overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </article>

        {/* Rayon actuel */}
        {activeGroup ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[28px]">{RAYON_EMOJI[activeGroup.rayon]}</span>
              <h2 className="font-display text-[22px] font-semibold">
                {activeGroup.rayon}
              </h2>
              <span className="text-[12px] text-muted-foreground">
                · {activeGroup.pendingCount} restant
                {activeGroup.pendingCount > 1 ? "s" : ""}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {activeItems.map((item) => {
                const isDone = item.status === "bought";
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleToggle(item.id, isDone)}
                      aria-pressed={isDone}
                      className={`w-full rounded-[14px] border px-4 py-4 flex items-center gap-3 text-left transition-all active:scale-[0.98] ${
                        isDone
                          ? "border-secondary/30 bg-secondary/5 opacity-70 hover:opacity-90"
                          : "border-border bg-surface hover:bg-surface-elevated"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-[8px] border-2 flex items-center justify-center shrink-0 transition-all ${
                          isDone
                            ? "bg-secondary border-secondary"
                            : "border-[#5C3D2C]"
                        }`}
                      >
                        {isDone ? (
                          <Check
                            size={16}
                            strokeWidth={3}
                            className="text-secondary-foreground"
                          />
                        ) : null}
                      </span>
                      {item.emoji ? (
                        <span className="text-[20px]">{item.emoji}</span>
                      ) : null}
                      <div className="flex-1 flex flex-col min-w-0">
                        <span
                          className={`text-[16px] font-medium ${
                            isDone
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {item.name}
                          {item.quantity > 1 ? (
                            <span className="ml-1 text-muted-foreground">
                              ×{item.quantity}
                              {item.unit ? ` ${item.unit}` : ""}
                            </span>
                          ) : null}
                        </span>
                        {item.notes ? (
                          <span className="text-[13px] text-secondary italic mt-1 leading-snug">
                            {item.notes}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      {/* Bande horizontale des autres rayons */}
      <div
        className="sticky bottom-0 left-0 right-0 z-10 px-5 py-3 bg-background/90 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="flex gap-2 overflow-x-auto -mx-5 px-5 scrollbar-hide">
          {groups.map((g) => {
            const isActive = g.rayon === activeRayon;
            const isComplete = g.pendingCount === 0;
            const pct =
              g.totalCount === 0
                ? 0
                : Math.round(
                    ((g.totalCount - g.pendingCount) / g.totalCount) * 100,
                  );
            return (
              <button
                key={g.rayon}
                type="button"
                onClick={() => setActiveRayon(g.rayon)}
                className={`shrink-0 w-[86px] rounded-[12px] border bg-surface px-2 py-2 flex flex-col gap-1 ${
                  isActive
                    ? "border-primary shadow-[0_0_14px_rgba(255,107,36,0.4)]"
                    : "border-border"
                } ${isComplete ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[14px]">{RAYON_EMOJI[g.rayon]}</span>
                  <span className="text-[10px] font-medium truncate flex-1 text-left">
                    {g.rayon}
                  </span>
                </div>
                <div className="w-full h-1 rounded-full bg-border-subtle">
                  <div
                    className={`h-full rounded-full ${isComplete ? "bg-secondary" : "bg-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
