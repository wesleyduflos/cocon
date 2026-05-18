"use client";

import { onSnapshot } from "firebase/firestore";
import { Trash2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useCurrentHousehold } from "@/hooks/use-household";
import {
  deleteShoppingHistoryEntry,
  shoppingHistoryDoc,
  updateShoppingHistoryEntry,
} from "@/lib/firebase/firestore";
import type {
  ShoppingHistoryEntry,
  ShoppingRayon,
  WithId,
} from "@/types/cocon";

const RAYONS: ShoppingRayon[] = [
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

const UNITS = ["", "L", "kg", "g", "pcs", "pack"];

function Pill({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(255,107,36,0.4)]"
          : "bg-surface border border-border text-muted-foreground hover:bg-surface-elevated"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

export default function EditHistoryEntryPage() {
  const router = useRouter();
  const params = useParams<{ entryId: string }>();
  const entryId = params.entryId;
  const { household } = useCurrentHousehold();
  const { showToast } = useToast();

  const [entry, setEntry] = useState<WithId<ShoppingHistoryEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [rayon, setRayon] = useState<ShoppingRayon>("Autre");
  const [unit, setUnit] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!household?.id || !entryId) return;
    const unsubscribe = onSnapshot(
      shoppingHistoryDoc(household.id, entryId),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = { ...snap.data(), id: snap.id };
        setEntry(data);
        if (!hydrated) {
          setName(data.name);
          setEmoji(data.emoji ?? "");
          setRayon(data.rayon);
          setUnit(data.unit ?? "");
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
  }, [household?.id, entryId, hydrated]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!household || !entry) return;
    setError(null);
    setSubmitting(true);
    try {
      await updateShoppingHistoryEntry(household.id, entry.id, {
        name: name.trim(),
        emoji: emoji.trim() || undefined,
        rayon,
        unit: unit || undefined,
      });
      showToast({ message: "Entrée mise à jour" });
      router.replace("/shopping/history");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible d'enregistrer.",
      );
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!household || !entry) return;
    if (!window.confirm(`Supprimer « ${entry.name} » de l'historique ?`))
      return;
    setDeleting(true);
    try {
      await deleteShoppingHistoryEntry(household.id, entry.id);
      showToast({ message: "Entrée supprimée" });
      router.replace("/shopping/history");
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

  if (notFound || !entry) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-7 gap-4 text-center">
        <p className="text-[14px] text-muted-foreground">
          Entrée d&apos;historique introuvable.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/shopping/history")}
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
        <h1 className="text-[15px] font-medium">Modifier l&apos;entrée</h1>
        <button
          type="submit"
          form="edit-history-form"
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
        id="edit-history-form"
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-7 px-5 py-6 max-w-md w-full mx-auto"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="entry-name"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Nom
          </label>
          <input
            id="entry-name"
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
            htmlFor="entry-emoji"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Emoji (facultatif)
          </label>
          <input
            id="entry-emoji"
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="🥖"
            disabled={submitting || deleting}
            maxLength={4}
            className="rounded-[12px] border border-border bg-surface px-4 py-2.5 text-[15px] w-24 text-center focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Rayon
          </span>
          <div className="flex flex-wrap gap-2">
            {RAYONS.map((r) => (
              <Pill
                key={r}
                active={rayon === r}
                onClick={() => setRayon(r)}
                disabled={submitting}
              >
                {r}
              </Pill>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Unité (facultatif)
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            disabled={submitting || deleting}
            className="rounded-[12px] border border-border bg-surface px-4 py-2.5 text-[15px] w-32 focus:outline-none focus:border-primary"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u || "Aucune"}
              </option>
            ))}
          </select>
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
            {deleting ? "Suppression…" : "Supprimer cette entrée"}
          </button>
        </div>
      </form>
    </main>
  );
}
