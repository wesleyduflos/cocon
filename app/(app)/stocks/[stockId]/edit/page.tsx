"use client";

import { onSnapshot } from "firebase/firestore";
import { Trash2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useQuickAddItems } from "@/hooks/use-shopping";
import {
  deleteStockItem,
  stockDoc,
  updateStockItem,
  updateStockLevel,
} from "@/lib/firebase/firestore";
import type { StockItem, StockLevel, WithId } from "@/types/cocon";

const LEVEL_LABEL: Record<StockLevel, string> = {
  full: "Plein",
  half: "Entamé",
  low: "Bas",
  empty: "Épuisé",
};

const LEVELS: StockLevel[] = ["full", "half", "low", "empty"];

const LEVEL_COLOR: Record<StockLevel, string> = {
  full: "bg-secondary text-secondary-foreground",
  half: "bg-highlight text-foreground",
  low: "bg-primary text-primary-foreground",
  empty: "bg-destructive text-destructive-foreground",
};

export default function EditStockPage() {
  const router = useRouter();
  const params = useParams<{ stockId: string }>();
  const stockId = params.stockId;
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { showToast } = useToast();
  const { items: quickAddItems } = useQuickAddItems(household?.id);

  const [stock, setStock] = useState<WithId<StockItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [level, setLevel] = useState<StockLevel>("full");
  const [linkedQuickAddItemId, setLinkedQuickAddItemId] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!household?.id || !stockId) return;
    const unsubscribe = onSnapshot(
      stockDoc(household.id, stockId),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = { ...snap.data(), id: snap.id };
        setStock(data);
        if (!hydrated) {
          setName(data.name);
          setEmoji(data.emoji ?? "");
          setLevel(data.level);
          setLinkedQuickAddItemId(data.linkedQuickAddItemId ?? "");
          setHydrated(true);
        }
        setLoading(false);
      },
      () => {
        setNotFound(true);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [household?.id, stockId, hydrated]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!household || !stock || !user) return;
    setError(null);
    setSubmitting(true);
    try {
      // 1) Update champs métadata
      await updateStockItem(household.id, stock.id, {
        name: name.trim(),
        emoji: emoji.trim() || undefined,
        linkedQuickAddItemId: linkedQuickAddItemId || undefined,
      });
      // 2) Update level via le helper dédié (préserve history + auto-reorder)
      if (level !== stock.level) {
        await updateStockLevel(household.id, stock.id, level, user.uid);
      }
      showToast({ message: "Stock mis à jour" });
      router.replace("/stocks");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible d'enregistrer.",
      );
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!household || !stock) return;
    if (!window.confirm(`Supprimer le stock « ${stock.name} » ?`)) return;
    setDeleting(true);
    try {
      await deleteStockItem(household.id, stock.id);
      showToast({ message: "Stock supprimé" });
      router.replace("/stocks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-7">
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  if (notFound || !stock) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-7 gap-4 text-center">
        <p className="text-[14px] text-muted-foreground">
          Stock introuvable.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/stocks")}
          className="rounded-[12px] border border-border bg-transparent text-foreground px-4 py-2 text-[13px]"
        >
          Retour
        </button>
      </main>
    );
  }

  const canSubmit = name.trim().length > 0 && !submitting && !deleting;

  return (
    <main className="flex flex-1 flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-background/85 backdrop-blur-xl border-b border-border">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Fermer"
          className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
        >
          <X size={18} />
        </button>
        <h1 className="text-[15px] font-medium">Modifier le stock</h1>
        <button
          type="submit"
          form="edit-stock-form"
          disabled={!canSubmit}
          className={`px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-colors ${
            canSubmit
              ? "text-primary hover:text-[var(--primary-hover)]"
              : "text-foreground-faint cursor-not-allowed"
          }`}
        >
          {submitting ? "..." : "Enregistrer"}
        </button>
      </header>

      <form
        id="edit-stock-form"
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-7 px-5 py-6 max-w-md w-full mx-auto"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="stock-name"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Nom
          </label>
          <input
            id="stock-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={submitting || deleting}
            className="font-display text-[22px] font-semibold bg-transparent border-b border-border focus:border-primary outline-none py-2"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="stock-emoji"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Emoji (facultatif)
          </label>
          <input
            id="stock-emoji"
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="🧴"
            disabled={submitting || deleting}
            maxLength={4}
            className="rounded-[12px] border border-border bg-surface px-4 py-2.5 text-[15px] w-24 text-center focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Niveau actuel
          </span>
          <div className="flex gap-2">
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(lvl)}
                disabled={submitting || deleting}
                aria-pressed={level === lvl}
                className={`flex-1 rounded-[10px] py-2.5 text-[12px] font-medium border transition-all ${
                  level === lvl
                    ? `${LEVEL_COLOR[lvl]} border-transparent shadow-[0_0_10px_rgba(255,107,36,0.3)]`
                    : "bg-surface border-border text-muted-foreground hover:bg-surface-elevated"
                } disabled:opacity-50`}
              >
                {LEVEL_LABEL[lvl]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="stock-linked"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Article de courses lié (facultatif)
          </label>
          <select
            id="stock-linked"
            value={linkedQuickAddItemId}
            onChange={(e) => setLinkedQuickAddItemId(e.target.value)}
            disabled={submitting || deleting}
            className="rounded-[12px] border border-border bg-surface px-4 py-2.5 text-[15px] focus:outline-none focus:border-primary"
          >
            <option value="">— Aucun —</option>
            {quickAddItems.map((qa) => (
              <option key={qa.id} value={qa.id}>
                {qa.emoji ? `${qa.emoji} ` : ""}
                {qa.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-foreground-faint leading-snug">
            Si lié, le stock est auto-ajouté aux courses quand il passe à
            «&nbsp;Bas&nbsp;» ou «&nbsp;Épuisé&nbsp;».
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-[13px] text-destructive leading-[1.5]">
            {error}
          </p>
        ) : null}

        <div className="pt-3 mt-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || submitting}
            className="flex items-center gap-2 text-[13px] text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
            {deleting ? "Suppression…" : "Supprimer le stock"}
          </button>
        </div>
      </form>
    </main>
  );
}
