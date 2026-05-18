"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useCurrentHousehold } from "@/hooks/use-household";
import { createChecklistTemplate } from "@/lib/firebase/firestore";

const EMOJI_CHOICES = [
  "📋",
  "🌴",
  "🍽️",
  "🎉",
  "🏖️",
  "🎄",
  "👶",
  "🐾",
  "🏠",
  "🧹",
  "📦",
  "✈️",
];

export default function NewPreparationPage() {
  const router = useRouter();
  const { household } = useCurrentHousehold();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📋");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(idx: number, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? value : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addItem() {
    setItems((prev) => [...prev, ""]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!household) return;
    const cleanedName = name.trim();
    const cleanedItems = items.map((i) => i.trim()).filter((i) => i.length > 0);
    if (cleanedName.length === 0) {
      setError("Donne un nom à la préparation.");
      return;
    }
    if (cleanedItems.length === 0) {
      setError("Ajoute au moins une tâche.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createChecklistTemplate({
        householdId: household.id,
        name: cleanedName,
        emoji,
        description: description.trim() || undefined,
        items: cleanedItems,
      });
      showToast({ message: `${emoji} ${cleanedName} créée` });
      router.replace("/preparations");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer la préparation.",
      );
      setSubmitting(false);
    }
  }

  const canSubmit =
    !submitting &&
    name.trim().length > 0 &&
    items.some((i) => i.trim().length > 0);

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
        <h1 className="text-[15px] font-medium">Nouvelle préparation</h1>
        <button
          type="submit"
          form="new-prep-form"
          disabled={!canSubmit}
          className={`px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-colors ${
            canSubmit
              ? "text-primary hover:text-[var(--primary-hover)]"
              : "text-foreground-faint cursor-not-allowed"
          }`}
        >
          {submitting ? "..." : "Créer"}
        </button>
      </header>

      <form
        id="new-prep-form"
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-6 px-5 py-6 max-w-md w-full mx-auto"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="prep-name"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Nom de la préparation
          </label>
          <input
            id="prep-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. Avant les vacances"
            required
            autoFocus
            maxLength={60}
            disabled={submitting}
            className="font-display text-[20px] font-semibold bg-transparent border-b border-border focus:border-primary outline-none py-2"
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Emoji
          </span>
          <div className="flex flex-wrap gap-2">
            {EMOJI_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => setEmoji(choice)}
                disabled={submitting}
                aria-pressed={emoji === choice}
                className={`w-11 h-11 rounded-[10px] text-[20px] flex items-center justify-center transition-all ${
                  emoji === choice
                    ? "bg-primary text-primary-foreground shadow-[0_0_14px_rgba(255,107,36,0.45)]"
                    : "bg-surface border border-border hover:bg-surface-elevated"
                }`}
              >
                {choice}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="prep-desc"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Description (facultatif)
          </label>
          <textarea
            id="prep-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Quand utiliser cette préparation, contexte…"
            rows={2}
            disabled={submitting}
            className="rounded-[12px] border border-border bg-surface px-4 py-2.5 text-[14px] focus:outline-none focus:border-primary resize-none"
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Tâches ({items.filter((i) => i.trim().length > 0).length})
            </span>
            <button
              type="button"
              onClick={addItem}
              disabled={submitting}
              className="text-[12px] text-primary hover:text-[var(--primary-hover)] flex items-center gap-1"
            >
              <Plus size={12} />
              Ajouter
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-[12px] text-foreground-faint w-5 text-right shrink-0">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateItem(idx, e.target.value)}
                  placeholder="ex. Vider le frigo"
                  maxLength={120}
                  disabled={submitting}
                  className="flex-1 rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px] focus:outline-none focus:border-primary"
                />
                {items.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={submitting}
                    aria-label={`Supprimer la tâche ${idx + 1}`}
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        {error ? (
          <p role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </main>
  );
}
