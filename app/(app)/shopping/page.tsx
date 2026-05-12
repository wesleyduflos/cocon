"use client";

import { ChevronDown, ChevronUp, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import {
  useQuickAddItems,
  useShoppingItems,
} from "@/hooks/use-shopping";
import {
  checkShoppingItem,
  createShoppingItem,
  incrementShoppingItemQuantity,
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

export default function ShoppingPage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { showToast } = useToast();

  const { items, loading } = useShoppingItems(household?.id);
  const { items: quickAdd } = useQuickAddItems(household?.id);

  const pending = useMemo(
    () => items.filter((i) => i.status === "pending"),
    [items],
  );
  const pendingCount = pending.length;

  // Groupage par rayon
  const byRayon = useMemo(() => {
    const map = new Map<ShoppingRayon, WithId<ShoppingItem>[]>();
    for (const item of pending) {
      const list = map.get(item.rayon) ?? [];
      list.push(item);
      map.set(item.rayon, list);
    }
    return map;
  }, [pending]);

  // Set des rayons COLLAPSED. Tous les rayons sont expanded par defaut ;
  // l'user en met explicitement certains dans le set pour les replier.
  // Simple, predictible, fonctionne dans tous les sens (replier puis
  // re-deplier sans bug).
  const [collapsedRayons, setCollapsedRayons] = useState<Set<ShoppingRayon>>(
    new Set(),
  );

  function toggleRayon(r: ShoppingRayon) {
    setCollapsedRayons((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  function isExpanded(r: ShoppingRayon): boolean {
    return !collapsedRayons.has(r);
  }

  async function handleQuickAdd(quickItem: {
    name: string;
    emoji: string;
    defaultRayon: ShoppingRayon;
    defaultUnit?: string;
  }) {
    if (!household || !user) return;
    // Si un item pending existe déjà avec ce nom + rayon → +1 quantité
    const existing = pending.find(
      (i) =>
        i.name.toLowerCase() === quickItem.name.toLowerCase() &&
        i.rayon === quickItem.defaultRayon,
    );
    if (existing) {
      await incrementShoppingItemQuantity(household.id, existing.id, 1);
      showToast({ message: `+1 ${quickItem.emoji} ${quickItem.name}` });
      return;
    }
    await createShoppingItem(household.id, {
      name: quickItem.name,
      emoji: quickItem.emoji,
      rayon: quickItem.defaultRayon,
      unit: quickItem.defaultUnit,
      fromQuickAdd: true,
      addedBy: user.uid,
    });
    showToast({ message: `${quickItem.emoji} ${quickItem.name} ajouté` });
  }

  async function handleCheck(item: WithId<ShoppingItem>) {
    if (!household || !user) return;
    if (item.status === "bought") {
      await uncheckShoppingItem(household.id, item.id);
    } else {
      await checkShoppingItem(household.id, item.id, user.uid);
      showToast({
        message: "Coché",
        action: {
          label: "Annuler",
          onClick: () => uncheckShoppingItem(household.id, item.id),
        },
      });
    }
  }

  // Indique combien d'items pending sont déjà dans la liste pour un quick-add donné
  function pendingCountFor(name: string, rayon: ShoppingRayon): number {
    return pending
      .filter(
        (i) =>
          i.name.toLowerCase() === name.toLowerCase() && i.rayon === rayon,
      )
      .reduce((sum, i) => sum + (i.quantity ?? 1), 0);
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-6">
      <div className="w-full max-w-md mx-auto flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              À acheter
            </p>
            <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
              Courses{" "}
              <span className="text-muted-foreground font-normal text-[20px]">
                · {pendingCount}
              </span>
            </h1>
          </div>
          <Link
            href="/shopping/new"
            aria-label="Ajouter un article"
            className="w-10 h-10 rounded-[10px] bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_14px_rgba(255,107,36,0.45)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus size={20} strokeWidth={2.4} />
          </Link>
        </header>

        {/* Essentiels du foyer */}
        {quickAdd.length > 0 ? (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Essentiels du foyer
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {quickAdd.map((q) => {
                const count = pendingCountFor(q.name, q.defaultRayon);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleQuickAdd(q)}
                    aria-label={`Ajouter ${q.name}`}
                    className="relative aspect-square rounded-[14px] bg-surface border border-border flex flex-col items-center justify-center gap-1 hover:bg-surface-elevated transition-colors"
                  >
                    <span className="text-[22px]">{q.emoji}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight max-w-full px-1 truncate">
                      {q.name}
                    </span>
                    {count > 0 ? (
                      <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Mode supermarché */}
        {pendingCount > 0 ? (
          <Link
            href="/shopping/market"
            className="rounded-[16px] bg-gradient-to-br from-primary to-secondary text-primary-foreground font-display text-[18px] font-semibold px-5 py-4 flex items-center justify-between shadow-[0_0_24px_rgba(255,107,36,0.4)] hover:opacity-95 transition-opacity"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={22} strokeWidth={2.2} />
              Mode supermarché
            </span>
            <span className="text-[14px] font-normal opacity-90">
              {pendingCount} article{pendingCount > 1 ? "s" : ""}
            </span>
          </Link>
        ) : null}

        {/* Par rayon */}
        {loading ? (
          <p className="text-[13px] text-muted-foreground">Chargement…</p>
        ) : pendingCount === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="text-[40px] leading-none">🛒</div>
            <h2 className="font-display text-[22px] font-semibold leading-[1.1]">
              Frigo plein,{" "}
              <span className="greeting-gradient">placards remplis</span>
            </h2>
            <p className="text-[14px] text-muted-foreground max-w-[280px] leading-[1.5]">
              Tape sur un essentiel quand tu te souviens d&apos;un truc à racheter.
            </p>
          </div>
        ) : (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Par rayon
            </h2>
            <div className="flex flex-col gap-2">
              {RAYON_ORDER.filter(
                (r) => (byRayon.get(r)?.length ?? 0) > 0,
              ).map((r) => {
                const list = byRayon.get(r) ?? [];
                const open = isExpanded(r);
                return (
                  <article
                    key={r}
                    className="rounded-[14px] border border-border bg-surface overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleRayon(r)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-elevated"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[18px]">{RAYON_EMOJI[r]}</span>
                        <span className="text-[14px] font-medium">{r}</span>
                        <span className="text-[12px] text-muted-foreground">
                          · {list.length}
                        </span>
                      </span>
                      {open ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    {open ? (
                      <ul className="border-t border-border-subtle">
                        {list.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle last:border-b-0"
                          >
                            <button
                              type="button"
                              onClick={() => handleCheck(item)}
                              aria-label="Cocher"
                              className="w-5 h-5 rounded-[6px] border-[1.5px] border-[#5C3D2C] flex items-center justify-center hover:border-primary shrink-0"
                            />
                            <Link
                              href={`/shopping/${item.id}`}
                              className="flex-1 flex items-center gap-2 min-w-0"
                            >
                              {item.emoji ? (
                                <span className="text-[16px]">{item.emoji}</span>
                              ) : null}
                              <span className="text-[14px] truncate">
                                {item.name}
                                {item.quantity && item.quantity > 1 ? (
                                  <span className="text-muted-foreground ml-1">
                                    ×{item.quantity}
                                    {item.unit ? ` ${item.unit}` : ""}
                                  </span>
                                ) : null}
                              </span>
                              {item.fromQuickAdd ? (
                                <span
                                  className="text-[10px] text-primary"
                                  aria-label="Depuis la grille essentiels"
                                >
                                  ★
                                </span>
                              ) : null}
                              {item.notes ? (
                                <span
                                  aria-label="Note contextuelle"
                                  className="text-[12px]"
                                >
                                  💬
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
