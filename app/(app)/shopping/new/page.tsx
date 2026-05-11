"use client";

import { Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { parseShoppingItemNatural } from "@/lib/ai/parse-shopping";
import { createShoppingItem } from "@/lib/firebase/firestore";
import type { ShoppingRayon } from "@/types/cocon";

const RAYONS: ShoppingRayon[] = [
  "Frais",
  "Boulangerie",
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

export default function NewShoppingItemPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("");
  const [rayon, setRayon] = useState<ShoppingRayon>("Épicerie");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [aiMode, setAiMode] = useState<"idle" | "editing" | "analyzing">(
    "idle",
  );
  const [naturalText, setNaturalText] = useState("");

  async function handleAnalyze() {
    if (naturalText.trim().length < 2) return;
    setError(null);
    setAiMode("analyzing");
    try {
      const ai = await parseShoppingItemNatural(naturalText.trim());
      setName(ai.name);
      if (ai.emoji) setEmoji(ai.emoji);
      if (ai.quantity) setQuantity(ai.quantity);
      if (ai.unit) setUnit(ai.unit);
      if (ai.rayon) setRayon(ai.rayon);
      const filled =
        Number(Boolean(ai.emoji)) +
        Number(ai.quantity && ai.quantity > 1) +
        Number(Boolean(ai.unit)) +
        Number(Boolean(ai.rayon));
      showToast({
        message: `${1 + filled} champ${filled > 0 ? "s" : ""} détecté${filled > 0 ? "s" : ""}`,
      });
      setAiMode("idle");
      setNaturalText("");
    } catch (err) {
      setName(naturalText.trim());
      setNaturalText("");
      setAiMode("idle");
      setError(
        err instanceof Error
          ? err.message
          : "Analyse IA indisponible — on garde le texte comme nom.",
      );
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !household) return;
    setError(null);
    setSubmitting(true);
    try {
      await createShoppingItem(household.id, {
        name: name.trim(),
        emoji: emoji.trim() || undefined,
        quantity,
        unit: unit || undefined,
        rayon,
        notes: notes.trim() || undefined,
        addedBy: user.uid,
      });
      router.replace("/shopping");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'ajouter l'article.",
      );
      setSubmitting(false);
    }
  }

  const canSubmit = name.trim().length > 0 && !submitting;

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
        <h1 className="text-[15px] font-medium">Nouvel article</h1>
        <button
          type="submit"
          form="new-shopping-form"
          disabled={!canSubmit}
          className={`px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-colors ${
            canSubmit
              ? "text-primary hover:text-[var(--primary-hover)]"
              : "text-foreground-faint cursor-not-allowed"
          }`}
        >
          {submitting ? "..." : "Ajouter"}
        </button>
      </header>

      <div className="px-5 pt-6 max-w-md w-full mx-auto">
        {aiMode === "idle" ? (
          <button
            type="button"
            onClick={() => setAiMode("editing")}
            className="w-full rounded-[14px] border border-dashed border-[rgba(255,107,36,0.4)] bg-gradient-to-br from-[rgba(255,107,36,0.10)] to-[rgba(255,200,69,0.05)] px-4 py-4 flex items-center gap-3 text-left hover:from-[rgba(255,107,36,0.16)] transition-all"
          >
            <Sparkles
              size={20}
              className="text-primary shrink-0 drop-shadow-[0_0_8px_rgba(255,107,36,0.6)]"
            />
            <div className="flex-1 flex flex-col gap-0.5">
              <span className="text-[13px] font-medium text-foreground">
                Décrire en une phrase
              </span>
              <span className="text-[12px] text-muted-foreground">
                « 2 litres de lait demi-écrémé »
              </span>
            </div>
          </button>
        ) : (
          <div className="rounded-[14px] border border-[rgba(255,107,36,0.4)] bg-gradient-to-br from-[rgba(255,107,36,0.12)] to-[rgba(255,200,69,0.06)] px-4 py-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <span className="text-[12px] uppercase tracking-[0.1em] text-primary font-semibold">
                Saisie naturelle
              </span>
            </div>
            <textarea
              value={naturalText}
              onChange={(e) => setNaturalText(e.target.value)}
              placeholder="Tape ta phrase ici..."
              rows={2}
              autoFocus
              disabled={aiMode === "analyzing"}
              className="rounded-[10px] bg-surface/60 border border-border px-3 py-2 text-[14px] focus:outline-none focus:border-primary resize-none disabled:opacity-50"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setAiMode("idle");
                  setNaturalText("");
                }}
                disabled={aiMode === "analyzing"}
                className="px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={
                  aiMode === "analyzing" || naturalText.trim().length < 2
                }
                className="px-4 py-2 rounded-[10px] bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50"
              >
                {aiMode === "analyzing" ? "Analyse…" : "Analyser ✨"}
              </button>
            </div>
          </div>
        )}
      </div>

      <form
        id="new-shopping-form"
        onSubmit={handleSubmit}
        className={`flex-1 flex flex-col gap-6 px-5 py-6 max-w-md w-full mx-auto transition-opacity ${
          aiMode === "editing" ? "opacity-40 pointer-events-none" : ""
        }`}
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="item-name"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Nom
          </label>
          <input
            id="item-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. Lait demi-écrémé"
            required
            disabled={submitting}
            className="font-display text-[20px] font-semibold bg-transparent border-b border-border focus:border-primary outline-none py-2 placeholder:text-foreground-faint placeholder:font-normal placeholder:font-sans placeholder:text-[15px]"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="item-emoji"
              className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
            >
              Emoji
            </label>
            <input
              id="item-emoji"
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
              placeholder="🥛"
              disabled={submitting}
              className="rounded-[10px] border border-border bg-surface px-3 py-2 text-center text-[18px] focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="item-qty"
              className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
            >
              Qté
            </label>
            <input
              id="item-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              disabled={submitting}
              className="rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="item-unit"
              className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
            >
              Unité
            </label>
            <select
              id="item-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={submitting}
              className="rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px]"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u || "—"}
                </option>
              ))}
            </select>
          </div>
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
          <label
            htmlFor="item-notes"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Note contextuelle (visible par tous)
          </label>
          <textarea
            id="item-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ex. Marque flacon vert, pas la blanche"
            rows={2}
            disabled={submitting}
            className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[14px] focus:outline-none focus:border-primary resize-none"
          />
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
