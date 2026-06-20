"use client";

import {
  History,
  Plus,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { QuantityPill } from "@/components/shopping/quantity-pill";
import { ShoppingQuickAddBar } from "@/components/shopping/quick-add-bar";
import { RayonBandeau } from "@/components/shopping/rayon-bandeau";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import {
  useQuickAddItems,
  useShoppingItems,
} from "@/hooks/use-shopping";
import { useCurrentUserProfile } from "@/hooks/use-user-profile";
import {
  checkShoppingItem,
  clearBoughtShoppingItems,
  createShoppingItem,
  deleteShoppingItem,
  incrementShoppingItemQuantity,
  uncheckShoppingItem,
  updateUserPreferences,
} from "@/lib/firebase/firestore";
import type { ShoppingItem, ShoppingRayon, WithId } from "@/types/cocon";

const RAYON_ORDER: ShoppingRayon[] = [
  "Fruits & légumes",
  "Boulangerie",
  "Viandes",
  "Poisson",
  "Produits laitiers",
  "Frais",
  "Conserves",
  "Épicerie",
  "Boissons",
  "Hygiène",
  "Maison",
  "Animalerie",
  "Autre",
];

export default function ShoppingPage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { profile } = useCurrentUserProfile();
  const { showToast } = useToast();

  const { items, loading } = useShoppingItems(household?.id);
  const { items: quickAdd } = useQuickAddItems(household?.id);

  const pending = useMemo(
    () => items.filter((i) => i.status === "pending"),
    [items],
  );
  const pendingCount = pending.length;

  // Groupage par rayon (inclut les coches : ils restent visibles, tries en bas
  // de leur rayon). Tri : pending d'abord (par addedAt desc), bought en bas.
  const byRayon = useMemo(() => {
    const map = new Map<ShoppingRayon, WithId<ShoppingItem>[]>();
    for (const item of items) {
      const list = map.get(item.rayon) ?? [];
      list.push(item);
      map.set(item.rayon, list);
    }
    // Tri interne : pending d'abord, bought ensuite
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
        // À status égal, plus récent en premier
        const aMs = a.addedAt?.toMillis?.() ?? 0;
        const bMs = b.addedAt?.toMillis?.() ?? 0;
        return bMs - aMs;
      });
    }
    return map;
  }, [items]);

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

  async function handleDeleteItem(item: WithId<ShoppingItem>) {
    if (!household) return;
    await deleteShoppingItem(household.id, item.id);
  }

  const [clearing, setClearing] = useState(false);
  async function handleClearBought() {
    if (!household) return;
    const boughtCount = items.filter((i) => i.status === "bought").length;
    if (boughtCount === 0) {
      showToast({ message: "Rien à nettoyer." });
      return;
    }
    if (
      !window.confirm(
        `Supprimer définitivement ${boughtCount} article${boughtCount > 1 ? "s" : ""} coché${boughtCount > 1 ? "s" : ""} ? L'historique disparaîtra aussi.`,
      )
    )
      return;
    setClearing(true);
    try {
      const n = await clearBoughtShoppingItems(household.id);
      showToast({ message: `${n} articles supprimés` });
    } finally {
      setClearing(false);
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

  const hintShown =
    profile?.raw?.preferences?.shoppingQuickAddHintShown === true;
  const showHint = !hintShown && items.length === 0;

  async function dismissHint() {
    if (!user || hintShown) return;
    try {
      await updateUserPreferences(user.uid, {
        shoppingQuickAddHintShown: true,
      });
    } catch {
      // silencieux, c'est juste un hint
    }
  }

  return (
    <main className="flex flex-1 flex-col pb-6">
      <div
        className="sticky top-0 z-30 px-5 pt-6 pb-3 bg-background/85 backdrop-blur-xl"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 18px)" }}
      >
        <div className="w-full max-w-md mx-auto flex flex-col gap-3">
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
            <div className="flex items-center gap-2">
              <Link
                href="/shopping/history"
                aria-label="Historique"
                title="Historique"
                className="w-10 h-10 rounded-[10px] bg-surface border border-border flex items-center justify-center hover:bg-surface-elevated transition-colors"
              >
                <History size={16} className="text-muted-foreground" />
              </Link>
              <button
                type="button"
                onClick={handleClearBought}
                disabled={clearing}
                aria-label="Nettoyer la liste (supprimer les cochés)"
                title="Nettoyer (supprimer les cochés)"
                className="w-10 h-10 rounded-[10px] bg-surface border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
              >
                <Sparkles size={16} className="text-muted-foreground" />
              </button>
              <Link
                href="/shopping/new"
                aria-label="Ajouter un article (avancé)"
                title="Ajout avancé"
                className="w-10 h-10 rounded-[10px] bg-surface border border-border flex items-center justify-center hover:bg-surface-elevated transition-colors"
              >
                <Plus size={18} strokeWidth={2.2} className="text-muted-foreground" />
              </Link>
            </div>
          </header>
          {household && user ? (
            <>
              <ShoppingQuickAddBar
                householdId={household.id}
                userId={user.uid}
                onAdded={() => void dismissHint()}
              />
              {showHint ? (
                <p className="text-[12px] text-muted-foreground leading-snug px-1">
                  Tape juste « lait » — Cocon range et catégorise tout seul ✨
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      <div className="w-full max-w-md mx-auto px-5 pt-5 flex flex-col gap-6">

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
        ) : items.length === 0 ? (
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
          <section className="flex flex-col gap-3 -mx-5">
            {RAYON_ORDER.filter(
              (r) => (byRayon.get(r)?.length ?? 0) > 0,
            ).map((r) => {
              const list = byRayon.get(r) ?? [];
              const pendingInRayon = list.filter(
                (i) => i.status === "pending",
              ).length;
              const hasBought = list.some((i) => i.status === "bought");
              const countLabel = hasBought
                ? `${pendingInRayon}/${list.length}`
                : `${list.length} article${list.length > 1 ? "s" : ""}`;
              const open = isExpanded(r);
              return (
                <article key={r} className="flex flex-col">
                  <RayonBandeau
                    rayon={r}
                    count={pendingInRayon}
                    countLabel={countLabel}
                    onToggle={() => toggleRayon(r)}
                    expanded={open}
                  />
                  {open ? (
                    <ul className="flex flex-col px-4">
                      {list.map((item) => {
                        const isBought = item.status === "bought";
                        return (
                          <li
                            key={item.id}
                            className={`flex items-center gap-2.5 py-3 border-b border-[rgba(67,42,31,0.4)] last:border-b-0 ${
                              isBought ? "opacity-50" : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleCheck(item)}
                              aria-label={isBought ? "Decocher" : "Cocher"}
                              aria-pressed={isBought}
                              className={`w-5 h-5 rounded-[6px] border-[1.5px] flex items-center justify-center shrink-0 transition-all ${
                                isBought
                                  ? "bg-secondary border-secondary"
                                  : "border-[#5C3D2C] hover:border-primary"
                              }`}
                            >
                              {isBought ? (
                                <span className="text-[11px] text-secondary-foreground">
                                  ✓
                                </span>
                              ) : null}
                            </button>
                            <Link
                              href={`/shopping/${item.id}/edit`}
                              className="flex-1 flex items-center gap-2 min-w-0"
                            >
                              {item.emoji ? (
                                <span className="text-[16px] shrink-0">
                                  {item.emoji}
                                </span>
                              ) : null}
                              <span
                                className={`font-sans text-[15px] font-medium truncate ${
                                  isBought
                                    ? "line-through text-muted-foreground"
                                    : "text-foreground"
                                }`}
                              >
                                {item.name}
                              </span>
                              {item.notes ? (
                                <span
                                  aria-label="Note contextuelle"
                                  className="text-[12px] shrink-0"
                                >
                                  💬
                                </span>
                              ) : null}
                            </Link>
                            <QuantityPill
                              quantity={item.quantity ?? 1}
                              unit={item.unit}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item);
                              }}
                              aria-label={`Supprimer ${item.name}`}
                              className="w-7 h-7 rounded-[8px] flex items-center justify-center text-foreground-faint hover:bg-destructive/20 hover:text-destructive transition-colors shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
