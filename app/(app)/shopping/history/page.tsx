"use client";

import {
  ArrowLeft,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { RayonBandeau } from "@/components/shopping/rayon-bandeau";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useShoppingHistory } from "@/hooks/use-shopping";
import {
  addFromShoppingHistory,
  clearShoppingHistory,
  deleteShoppingHistoryEntry,
  toggleShoppingHistoryFavorite,
} from "@/lib/firebase/firestore";
import type {
  ShoppingHistoryEntry,
  ShoppingRayon,
  WithId,
} from "@/types/cocon";

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

type TimeFilter = "week" | "month" | "all";

function formatRelative(ms: number): string {
  if (ms <= 0) return "—";
  const diff = Date.now() - ms;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days}j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)}sem`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  return `il y a ${Math.floor(days / 365)} an${days >= 730 ? "s" : ""}`;
}

function passesTimeFilter(ms: number, filter: TimeFilter): boolean {
  if (filter === "all") return true;
  if (!ms) return false;
  const diffDays = (Date.now() - ms) / (1000 * 60 * 60 * 24);
  if (filter === "week") return diffDays <= 7;
  return diffDays <= 30;
}

export default function ShoppingHistoryPage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { entries, loading } = useShoppingHistory(household?.id);
  const { showToast } = useToast();
  const [clearing, setClearing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("week");

  // Set des rayons COLLAPSED (collapsed = explicitement repliés)
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

  const favorites = useMemo(
    () => entries.filter((e) => e.favorite === true),
    [entries],
  );

  const nonFavorites = useMemo(
    () => entries.filter((e) => e.favorite !== true),
    [entries],
  );

  const filtered = useMemo(
    () =>
      nonFavorites.filter((e) =>
        passesTimeFilter(e.lastBoughtAt?.toMillis?.() ?? 0, timeFilter),
      ),
    [nonFavorites, timeFilter],
  );

  const byRayon = useMemo(() => {
    const map = new Map<ShoppingRayon, WithId<ShoppingHistoryEntry>[]>();
    for (const e of filtered) {
      const list = map.get(e.rayon) ?? [];
      list.push(e);
      map.set(e.rayon, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const am = a.lastBoughtAt?.toMillis?.() ?? 0;
        const bm = b.lastBoughtAt?.toMillis?.() ?? 0;
        return bm - am;
      });
    }
    return map;
  }, [filtered]);

  async function handleReadd(entry: WithId<ShoppingHistoryEntry>) {
    if (!household || !user) return;
    await addFromShoppingHistory(household.id, entry, user.uid);
    showToast({ message: `${entry.emoji ?? "🛒"} ${entry.name} ajouté` });
  }

  async function handleDelete(entryId: string) {
    if (!household) return;
    await deleteShoppingHistoryEntry(household.id, entryId);
  }

  async function handleToggleFavorite(entry: WithId<ShoppingHistoryEntry>) {
    if (!household) return;
    await toggleShoppingHistoryFavorite(
      household.id,
      entry.id,
      !(entry.favorite === true),
    );
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

  const visibleRayons = RAYON_ORDER.filter(
    (r) => (byRayon.get(r)?.length ?? 0) > 0,
  );
  const totalVisible =
    favorites.length +
    visibleRayons.reduce((sum, r) => sum + (byRayon.get(r)?.length ?? 0), 0);

  return (
    <main className="flex flex-1 flex-col">
      <div
        className="sticky top-0 z-30 px-5 pt-6 pb-3 bg-background/85 backdrop-blur-xl"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 18px)" }}
      >
        <div className="w-full max-w-md mx-auto flex flex-col gap-3">
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

          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 scrollbar-hide">
            <TimePill
              active={timeFilter === "week"}
              onClick={() => setTimeFilter("week")}
            >
              Cette semaine
            </TimePill>
            <TimePill
              active={timeFilter === "month"}
              onClick={() => setTimeFilter("month")}
            >
              Ce mois
            </TimePill>
            <TimePill
              active={timeFilter === "all"}
              onClick={() => setTimeFilter("all")}
            >
              Tout
            </TimePill>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto px-5 pt-3 pb-6 flex flex-col gap-4">
        {loading ? (
          <p className="text-[13px] text-muted-foreground">Chargement…</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="text-[40px]">📚</div>
            <h2 className="font-display text-[20px] font-semibold leading-tight">
              Pas encore d&apos;historique
            </h2>
            <p className="text-[13px] text-muted-foreground max-w-[260px] leading-snug">
              Les articles que tu coches dans ta liste apparaîtront ici, prêts
              à être re-ajoutés rapidement.
            </p>
            <Link
              href="/shopping"
              className="rounded-[10px] border border-border bg-surface px-4 py-2 text-[13px] mt-2 hover:bg-surface-elevated transition-colors"
            >
              Retour à la liste
            </Link>
          </div>
        ) : (
          <>
            {favorites.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5 px-1">
                  <Star
                    size={11}
                    fill="var(--secondary)"
                    className="text-[var(--secondary)]"
                  />
                  Favoris · {favorites.length}
                </h2>
                <ul className="flex flex-col gap-2">
                  {favorites.map((entry) => (
                    <HistoryRow
                      key={entry.id}
                      entry={entry}
                      onReadd={handleReadd}
                      onDelete={handleDelete}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {visibleRayons.length === 0 && favorites.length === 0 ? (
              <p className="text-[13px] text-muted-foreground text-center py-8">
                Aucun article dans cette période.
              </p>
            ) : null}

            {visibleRayons.length > 0 ? (
              <section className="flex flex-col gap-3 -mx-5">
                {visibleRayons.map((r) => {
                  const list = byRayon.get(r) ?? [];
                  const open = !collapsedRayons.has(r);
                  return (
                    <article key={r} className="flex flex-col">
                      <RayonBandeau
                        rayon={r}
                        count={list.length}
                        onToggle={() => toggleRayon(r)}
                        expanded={open}
                      />
                      {open ? (
                        <ul className="flex flex-col px-4">
                          {list.map((entry) => (
                            <HistoryRayonRow
                              key={entry.id}
                              entry={entry}
                              onReadd={handleReadd}
                              onDelete={handleDelete}
                              onToggleFavorite={handleToggleFavorite}
                            />
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  );
                })}
              </section>
            ) : null}

            {totalVisible === 0 && entries.length > 0 ? (
              <button
                type="button"
                onClick={() => setTimeFilter("all")}
                className="rounded-[10px] border border-border bg-surface px-4 py-2 text-[13px] mt-2 hover:bg-surface-elevated transition-colors mx-auto"
              >
                Voir tout l&apos;historique
              </button>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

function TimePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full whitespace-nowrap px-3.5 py-1.5 text-[13px] font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(255,107,36,0.4)]"
          : "bg-surface border border-border text-muted-foreground hover:bg-surface-elevated"
      }`}
    >
      {children}
    </button>
  );
}

function HistoryRow({
  entry,
  onReadd,
  onDelete,
  onToggleFavorite,
}: {
  entry: WithId<ShoppingHistoryEntry>;
  onReadd: (entry: WithId<ShoppingHistoryEntry>) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (entry: WithId<ShoppingHistoryEntry>) => void;
}) {
  const isFav = entry.favorite === true;
  const lastMs = entry.lastBoughtAt?.toMillis?.() ?? 0;
  return (
    <li className="rounded-[12px] border border-border-subtle bg-surface px-3 py-2.5 flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => onToggleFavorite(entry)}
        aria-label={isFav ? "Retirer des favoris" : "Mettre en favori"}
        title={isFav ? "Retirer des favoris" : "Mettre en favori"}
        className={`w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors shrink-0 ${
          isFav
            ? "text-[var(--secondary)] hover:bg-[var(--secondary)]/10"
            : "text-foreground-faint hover:bg-surface-elevated"
        }`}
      >
        <Star
          size={14}
          fill={isFav ? "var(--secondary)" : "none"}
          strokeWidth={2}
        />
      </button>
      {entry.emoji ? (
        <span className="text-[18px] shrink-0">{entry.emoji}</span>
      ) : null}
      <div className="flex-1 flex flex-col min-w-0">
        <span className="text-[14px] font-medium truncate">{entry.name}</span>
        <span className="text-[11px] text-muted-foreground truncate">
          {entry.rayon}
          {lastMs ? ` · ${formatRelative(lastMs)}` : ""}
          {entry.buyCount > 1 ? ` · ×${entry.buyCount}` : ""}
        </span>
      </div>
      <Link
        href={`/shopping/history/${entry.id}/edit`}
        aria-label={`Modifier ${entry.name}`}
        title="Modifier"
        className="w-8 h-8 rounded-[8px] flex items-center justify-center text-foreground-faint hover:bg-surface-elevated transition-colors shrink-0"
      >
        <Pencil size={14} />
      </Link>
      <button
        type="button"
        onClick={() => onReadd(entry)}
        aria-label={`Racheter ${entry.name}`}
        title="Racheter"
        className="w-8 h-8 rounded-[8px] flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
      >
        <Plus size={16} strokeWidth={2.4} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(entry.id)}
        aria-label={`Supprimer ${entry.name} de l'historique`}
        title="Retirer de l'historique"
        className="w-8 h-8 rounded-[8px] flex items-center justify-center text-foreground-faint hover:bg-destructive/20 hover:text-destructive transition-colors shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

function HistoryRayonRow({
  entry,
  onReadd,
  onDelete,
  onToggleFavorite,
}: {
  entry: WithId<ShoppingHistoryEntry>;
  onReadd: (entry: WithId<ShoppingHistoryEntry>) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (entry: WithId<ShoppingHistoryEntry>) => void;
}) {
  const isFav = entry.favorite === true;
  const lastMs = entry.lastBoughtAt?.toMillis?.() ?? 0;
  return (
    <li className="flex items-center gap-2.5 py-3 border-b border-[rgba(67,42,31,0.4)] last:border-b-0">
      <button
        type="button"
        onClick={() => onToggleFavorite(entry)}
        aria-label={isFav ? "Retirer des favoris" : "Mettre en favori"}
        title={isFav ? "Retirer des favoris" : "Mettre en favori"}
        className={`w-7 h-7 rounded-[8px] flex items-center justify-center transition-colors shrink-0 ${
          isFav
            ? "text-[var(--secondary)] hover:bg-[var(--secondary)]/10"
            : "text-foreground-faint hover:bg-surface-elevated"
        }`}
      >
        <Star
          size={13}
          fill={isFav ? "var(--secondary)" : "none"}
          strokeWidth={2}
        />
      </button>
      {entry.emoji ? (
        <span className="text-[16px] shrink-0">{entry.emoji}</span>
      ) : null}
      <Link
        href={`/shopping/history/${entry.id}/edit`}
        className="flex-1 flex flex-col min-w-0"
      >
        <span className="font-sans text-[15px] font-medium truncate">
          {entry.name}
        </span>
        <span className="text-[11px] text-muted-foreground truncate">
          {lastMs ? formatRelative(lastMs) : "—"}
          {entry.buyCount > 1 ? ` · ×${entry.buyCount}` : ""}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => onReadd(entry)}
        aria-label={`Racheter ${entry.name}`}
        title="Racheter"
        className="px-2.5 h-7 rounded-[8px] flex items-center gap-1 bg-primary/10 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors shrink-0"
      >
        <Plus size={13} strokeWidth={2.4} />
        Racheter
      </button>
      <button
        type="button"
        onClick={() => onDelete(entry.id)}
        aria-label={`Supprimer ${entry.name} de l'historique`}
        title="Retirer de l'historique"
        className="w-7 h-7 rounded-[8px] flex items-center justify-center text-foreground-faint hover:bg-destructive/20 hover:text-destructive transition-colors shrink-0"
      >
        <Trash2 size={13} />
      </button>
    </li>
  );
}
