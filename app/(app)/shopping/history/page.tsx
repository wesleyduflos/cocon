"use client";

import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useShoppingHistory } from "@/hooks/use-shopping";
import {
  addFromShoppingHistory,
  clearShoppingHistory,
  deleteShoppingHistoryEntry,
} from "@/lib/firebase/firestore";

/* =========================================================================
   /shopping/history

   Historique PERSISTANT des articles achetés (sous-collection shopping-
   history, mise à jour à chaque check). Survit aux nettoyages de la liste
   active : l'user peut nettoyer ses courses en confiance, l'historique
   reste pour reconstruire une nouvelle liste.

   Pour chaque entrée :
   - "+" : crée un nouvel item shopping pending avec name/emoji/rayon/unit
   - 🗑️ : supprime l'entrée de l'historique
   ========================================================================= */

export default function ShoppingHistoryPage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { entries, loading } = useShoppingHistory(household?.id);
  const { showToast } = useToast();
  const [clearing, setClearing] = useState(false);

  async function handleReadd(entryId: string) {
    if (!household || !user) return;
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    await addFromShoppingHistory(household.id, entry, user.uid);
    showToast({ message: `${entry.emoji ?? "🛒"} ${entry.name} ajouté` });
  }

  async function handleDelete(entryId: string) {
    if (!household) return;
    await deleteShoppingHistoryEntry(household.id, entryId);
  }

  async function handleClearAll() {
    if (!household || entries.length === 0) return;
    if (
      !window.confirm(
        `Effacer l'historique complet (${entries.length} entrées) ? Tu ne pourras plus re-ajouter rapidement ces articles.`,
      )
    )
      return;
    setClearing(true);
    try {
      const n = await clearShoppingHistory(household.id);
      showToast({ message: `${n} entrées effacées` });
    } finally {
      setClearing(false);
    }
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
          <div className="flex flex-col flex-1">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Courses
            </p>
            <h1 className="font-display text-[22px] font-semibold leading-tight">
              Historique{" "}
              <span className="text-muted-foreground font-normal text-[16px]">
                · {entries.length}
              </span>
            </h1>
          </div>
          {entries.length > 0 ? (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearing}
              aria-label="Effacer tout l'historique"
              title="Effacer tout"
              className="w-9 h-9 rounded-[10px] bg-surface border border-border flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </header>

        <p className="text-[12px] text-muted-foreground leading-snug">
          Tout ce que tu as déjà acheté. Tape sur <strong>+</strong> pour
          re-ajouter à la liste. L&apos;historique survit aux nettoyages.
        </p>

        {loading ? (
          <p className="text-[13px] text-muted-foreground">Chargement…</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="text-[40px]">📚</div>
            <h2 className="font-display text-[20px] font-semibold leading-tight">
              Pas encore d&apos;historique
            </h2>
            <p className="text-[13px] text-muted-foreground max-w-[260px] leading-snug">
              Les articles que tu coches dans ta liste apparaîtront ici,
              prêts à être re-ajoutés rapidement.
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
            {entries.map((entry) => {
              const lastMs = entry.lastBoughtAt?.toMillis?.() ?? 0;
              const lastLabel =
                lastMs > 0
                  ? new Date(lastMs).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })
                  : null;
              return (
                <li
                  key={entry.id}
                  className="rounded-[12px] border border-border-subtle bg-surface px-4 py-3 flex items-center gap-3"
                >
                  {entry.emoji ? (
                    <span className="text-[18px] shrink-0">{entry.emoji}</span>
                  ) : null}
                  <div className="flex-1 flex flex-col min-w-0">
                    <span className="text-[14px] font-medium truncate">
                      {entry.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {entry.rayon}
                      {lastLabel ? ` · dernier ${lastLabel}` : ""}
                      {entry.buyCount > 1 ? ` · ×${entry.buyCount}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReadd(entry.id)}
                    aria-label={`Ajouter ${entry.name} à la liste`}
                    title="Ajouter à la liste"
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                  >
                    <Plus size={16} strokeWidth={2.4} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    aria-label={`Supprimer ${entry.name} de l'historique`}
                    title="Retirer de l'historique"
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
