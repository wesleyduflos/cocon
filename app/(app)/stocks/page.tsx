"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import { StockLevelTube } from "@/components/stocks/stock-level-tube";
import { useMemo, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useStocks } from "@/hooks/use-stocks";
import {
  createStockItem,
  deleteStockItem,
  updateStockLevel,
} from "@/lib/firebase/firestore";
import type { StockItem, StockLevel, WithId } from "@/types/cocon";

const LEVEL_LABEL: Record<StockLevel, string> = {
  full: "Plein",
  half: "Entamé",
  low: "Bas",
  empty: "Épuisé",
};

const LEVEL_COLOR: Record<StockLevel, string> = {
  full: "bg-secondary",
  half: "bg-highlight",
  low: "bg-primary",
  empty: "bg-destructive",
};

const LEVEL_TEXT_COLOR: Record<StockLevel, string> = {
  full: "text-[#4CAF50]",
  half: "text-[#FFC845]",
  low: "text-[#FF6B24]",
  empty: "text-[#E5374D]",
};

const LEVEL_CYCLE: Record<StockLevel, StockLevel> = {
  full: "half",
  half: "low",
  low: "empty",
  empty: "full",
};

const LEVELS: StockLevel[] = ["full", "half", "low", "empty"];

type Filter = "all" | "soon" | "empty";

function timeAgo(ms: number): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days < 1) return "aujourd'hui";
  if (days < 7) return `il y a ${days}j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)}sem`;
  return `il y a ${Math.floor(days / 30)}mois`;
}

function formatNextRenewal(ms: number | undefined): string | null {
  if (!ms) return null;
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export default function StocksPage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { stocks, loading } = useStocks(household?.id);
  const { showToast } = useToast();

  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");

  const filtered = useMemo(() => {
    if (filter === "soon")
      return stocks.filter((s) => s.level === "low" || s.level === "empty");
    if (filter === "empty") return stocks.filter((s) => s.level === "empty");
    return stocks;
  }, [stocks, filter]);

  async function handleCreate() {
    if (!user || !household || newName.trim().length === 0) return;
    setCreating(true);
    try {
      await createStockItem(household.id, {
        name: newName.trim(),
        emoji: newEmoji.trim() || undefined,
        level: "full",
        createdBy: user.uid,
      });
      setNewName("");
      setNewEmoji("");
    } finally {
      setCreating(false);
    }
  }

  async function handleLevelChange(stock: WithId<StockItem>, next: StockLevel) {
    if (!user || !household || stock.level === next) return;
    const wasNotLow = stock.level !== "low" && stock.level !== "empty";
    const becomesLow = next === "low" || next === "empty";
    await updateStockLevel(household.id, stock.id, next, user.uid);
    // Si transition vers bas/épuisé → l'item est auto-ajouté aux courses
    // (cf updateStockLevel côté firestore.ts).
    if (wasNotLow && becomesLow) {
      showToast({
        message: `${stock.emoji ?? "📦"} ${stock.name} ajouté aux courses`,
      });
    }
  }

  async function handleDelete(stock: WithId<StockItem>) {
    if (!household) return;
    if (!window.confirm(`Supprimer "${stock.name}" ?`)) return;
    await deleteStockItem(household.id, stock.id);
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-6">
      <div className="w-full max-w-md mx-auto flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Réserves
            </p>
            <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
              Stocks{" "}
              <span className="text-muted-foreground font-normal text-[20px]">
                · {stocks.length}
              </span>
            </h1>
          </div>
        </header>

        {/* Création rapide inline */}
        <article className="rounded-[14px] border border-border bg-surface px-4 py-3 flex items-center gap-2">
          <input
            type="text"
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value.slice(0, 2))}
            placeholder="🦷"
            disabled={creating}
            className="w-12 rounded-[8px] border border-border bg-background px-2 py-1.5 text-center text-[16px]"
            aria-label="Emoji"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ex. Dentifrice"
            disabled={creating}
            className="flex-1 rounded-[8px] border border-border bg-background px-3 py-1.5 text-[14px] focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || newName.trim().length === 0}
            aria-label="Ajouter ce stock"
            className="w-9 h-9 rounded-[10px] bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
          >
            <Plus size={18} />
          </button>
        </article>

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          {(
            [
              { value: "all", label: "Tous" },
              { value: "soon", label: "À renouveler" },
              { value: "empty", label: "Épuisés" },
            ] as Array<{ value: Filter; label: string }>
          ).map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`rounded-full whitespace-nowrap px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface border border-border text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <p className="text-[13px] text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="text-[36px]">📦</div>
            <h2 className="font-display text-[20px] font-semibold leading-tight">
              Tout est <span className="greeting-gradient">plein</span>
            </h2>
            <p className="text-[13px] text-muted-foreground max-w-[260px] leading-[1.5]">
              Note ce que tu rachètes régulièrement pour anticiper les fins
              de réserve.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((stock) => {
              const lastMs = stock.lastRenewedAt?.toMillis() ?? 0;
              const nextMs = stock.predictedNextRenewalAt?.toMillis();
              const nextStr = formatNextRenewal(nextMs);
              return (
                <li key={stock.id}>
                  {/* Toute la card est cliquable et cycle le niveau au tap.
                      div + role=button au lieu de <button> pour autoriser les
                      Link/button enfants (edit/delete) sans HTML invalide. */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      handleLevelChange(stock, LEVEL_CYCLE[stock.level])
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleLevelChange(stock, LEVEL_CYCLE[stock.level]);
                      }
                    }}
                    aria-label={`${stock.name} — niveau ${LEVEL_LABEL[stock.level]}, tap pour passer au suivant`}
                    className="w-full rounded-[14px] border border-border bg-surface px-4 py-3 flex items-center gap-4 text-left hover:bg-surface-elevated active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <StockLevelTube level={stock.level} />

                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        {stock.emoji ? (
                          <span className="text-[20px] leading-tight shrink-0">
                            {stock.emoji}
                          </span>
                        ) : null}
                        <span className="text-[15px] font-medium truncate">
                          {stock.name}
                        </span>
                      </div>
                      <span className="text-[12px] mt-1">
                        <span
                          className={`font-semibold ${LEVEL_TEXT_COLOR[stock.level]}`}
                        >
                          {LEVEL_LABEL[stock.level]}
                        </span>
                        <span className="text-muted-foreground">
                          {" · renouvelé "}
                          {timeAgo(lastMs)}
                          {nextStr ? ` · prochain ${nextStr}` : ""}
                        </span>
                      </span>
                    </div>

                    {/* Actions secondaires (edit/delete) en split — ne pas
                        déclencher le cycle au tap. */}
                    <div
                      className="flex flex-col gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={`/stocks/${stock.id}/edit`}
                        aria-label={`Modifier ${stock.name}`}
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center hover:bg-surface-elevated transition-colors text-muted-foreground"
                      >
                        <Pencil size={12} />
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(stock);
                        }}
                        aria-label="Supprimer"
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
