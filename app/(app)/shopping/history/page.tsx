"use client";

import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useShoppingItems } from "@/hooks/use-shopping";
import {
  deleteShoppingItem,
  uncheckShoppingItem,
} from "@/lib/firebase/firestore";

/* =========================================================================
   /shopping/history

   Liste tous les articles qui ont déjà été achetés (status === "bought"),
   du plus récent au plus ancien. Pour chaque :
   - "Re-ajouter à la liste" → uncheck (repasse en pending dans la liste
     active, prêt à racheter).
   - "Supprimer" → supprime définitivement de l'historique.

   Le nettoyage de la liste active (bouton ✨ Nettoyer sur /shopping) vide
   aussi cet historique — les bought sont supprimés physiquement.
   ========================================================================= */

export default function ShoppingHistoryPage() {
  const { household } = useCurrentHousehold();
  const { items, loading } = useShoppingItems(household?.id);
  const { showToast } = useToast();

  const bought = useMemo(
    () =>
      items
        .filter((i) => i.status === "bought")
        .sort((a, b) => {
          const aMs = a.boughtAt?.toMillis?.() ?? 0;
          const bMs = b.boughtAt?.toMillis?.() ?? 0;
          return bMs - aMs;
        }),
    [items],
  );

  async function handleReadd(itemId: string, name: string) {
    if (!household) return;
    await uncheckShoppingItem(household.id, itemId);
    showToast({ message: `${name} ajouté à la liste` });
  }

  async function handleDelete(itemId: string) {
    if (!household) return;
    await deleteShoppingItem(household.id, itemId);
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-6">
      <div className="w-full max-w-md mx-auto flex flex-col gap-5">
        <header className="flex items-center gap-3">
          <Link
            href="/shopping"
            aria-label="Retour aux courses"
            className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex flex-col">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Courses
            </p>
            <h1 className="font-display text-[22px] font-semibold leading-tight">
              Historique{" "}
              <span className="text-muted-foreground font-normal text-[16px]">
                · {bought.length}
              </span>
            </h1>
          </div>
        </header>

        {loading ? (
          <p className="text-[13px] text-muted-foreground">Chargement…</p>
        ) : bought.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="text-[40px]">📦</div>
            <h2 className="font-display text-[20px] font-semibold leading-tight">
              Pas encore d&apos;historique
            </h2>
            <p className="text-[13px] text-muted-foreground max-w-[260px] leading-snug">
              Les articles que tu coches dans ta liste de courses
              apparaîtront ici, prêts à être re-ajoutés.
            </p>
            <Link
              href="/shopping"
              className="rounded-[10px] border border-border bg-surface px-4 py-2 text-[13px] mt-2 hover:bg-surface-elevated transition-colors"
            >
              Retour à la liste
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {bought.map((item) => {
              const boughtMs = item.boughtAt?.toMillis?.() ?? 0;
              const boughtLabel =
                boughtMs > 0
                  ? new Date(boughtMs).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })
                  : null;
              return (
                <li
                  key={item.id}
                  className="rounded-[12px] border border-border-subtle bg-surface px-4 py-3 flex items-center gap-3"
                >
                  {item.emoji ? (
                    <span className="text-[18px] shrink-0">{item.emoji}</span>
                  ) : null}
                  <div className="flex-1 flex flex-col min-w-0">
                    <span className="text-[14px] font-medium truncate">
                      {item.name}
                      {item.quantity && item.quantity > 1 ? (
                        <span className="text-muted-foreground ml-1">
                          ×{item.quantity}
                          {item.unit ? ` ${item.unit}` : ""}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {item.rayon}
                      {boughtLabel ? ` · acheté ${boughtLabel}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReadd(item.id, item.name)}
                    aria-label={`Re-ajouter ${item.name} à la liste`}
                    title="Re-ajouter à la liste"
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    aria-label={`Supprimer ${item.name} de l'historique`}
                    title="Supprimer"
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center text-foreground-faint hover:bg-destructive/20 hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
