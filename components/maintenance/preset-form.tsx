"use client";

import { Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { MAINTENANCE_CATEGORY_LABELS } from "@/lib/maintenance/presets";
import type { MaintenanceCategory } from "@/types/cocon";

const CATEGORIES: MaintenanceCategory[] = [
  "trash",
  "appliance",
  "filter",
  "safety",
  "seasonal",
  "exterior",
];

const FREQUENCY_PRESETS: Array<{
  label: string;
  rule: string;
  frequencyLabel: string;
}> = [
  {
    label: "Quotidien",
    rule: "FREQ=DAILY",
    frequencyLabel: "Tous les jours",
  },
  {
    label: "Hebdo",
    rule: "FREQ=WEEKLY",
    frequencyLabel: "Toutes les semaines",
  },
  {
    label: "Bi-mens.",
    rule: "FREQ=WEEKLY;INTERVAL=2",
    frequencyLabel: "Toutes les 2 semaines",
  },
  { label: "Mensuel", rule: "FREQ=MONTHLY", frequencyLabel: "Tous les mois" },
  {
    label: "Trimestriel",
    rule: "FREQ=MONTHLY;INTERVAL=3",
    frequencyLabel: "Tous les 3 mois",
  },
  {
    label: "Semestriel",
    rule: "FREQ=MONTHLY;INTERVAL=6",
    frequencyLabel: "Tous les 6 mois",
  },
  { label: "Annuel", rule: "FREQ=YEARLY", frequencyLabel: "1 fois / an" },
];

export interface PresetFormValue {
  category: MaintenanceCategory;
  title: string;
  emoji: string;
  hint: string;
  recurrenceRule: string;
  frequencyLabel: string;
  priority: boolean;
}

interface Props {
  initial?: PresetFormValue;
  submitLabel: string;
  topBarTitle: string;
  onSubmit: (value: PresetFormValue) => Promise<void>;
  onDelete?: () => Promise<void>;
}

function Pill({
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
      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(255,107,36,0.4)]"
          : "bg-surface border border-border text-muted-foreground hover:bg-surface-elevated"
      }`}
    >
      {children}
    </button>
  );
}

export function MaintenancePresetForm({
  initial,
  submitLabel,
  topBarTitle,
  onSubmit,
  onDelete,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [category, setCategory] = useState<MaintenanceCategory>(
    initial?.category ?? "trash",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "");
  const [hint, setHint] = useState(initial?.hint ?? "");
  const [recurrenceRule, setRecurrenceRule] = useState(
    initial?.recurrenceRule ?? "FREQ=MONTHLY",
  );
  const [frequencyLabel, setFrequencyLabel] = useState(
    initial?.frequencyLabel ?? "Tous les mois",
  );
  const [priority, setPriority] = useState(initial?.priority ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyFrequency(preset: (typeof FREQUENCY_PRESETS)[number]) {
    setRecurrenceRule(preset.rule);
    setFrequencyLabel(preset.frequencyLabel);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Donne un titre au preset.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        category,
        title: title.trim(),
        emoji: emoji.trim() || "🔧",
        hint: hint.trim(),
        recurrenceRule: recurrenceRule.trim(),
        frequencyLabel: frequencyLabel.trim() || "Personnalisée",
        priority,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'enregistrer. Réessaie.",
      );
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (
      !window.confirm(
        `Supprimer définitivement le preset « ${title} » ? Cette action est irréversible.`,
      )
    )
      return;
    setDeleting(true);
    try {
      await onDelete();
      showToast({ message: "Preset supprimé" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Suppression impossible",
      );
      setDeleting(false);
    }
  }

  const canSubmit = title.trim().length > 0 && !submitting && !deleting;

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
        <h1 className="text-[15px] font-medium">{topBarTitle}</h1>
        <button
          type="submit"
          form="preset-form"
          disabled={!canSubmit}
          className={`px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-colors ${
            canSubmit
              ? "text-primary hover:text-[var(--primary-hover)]"
              : "text-foreground-faint cursor-not-allowed"
          }`}
        >
          {submitting ? "..." : submitLabel}
        </button>
      </header>

      <form
        id="preset-form"
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-7 px-5 py-6 max-w-md w-full mx-auto"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="preset-title"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Titre
          </label>
          <input
            id="preset-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={submitting || deleting}
            placeholder="Sortir poubelle grise…"
            className="font-display text-[22px] font-semibold bg-transparent border-b border-border focus:border-primary outline-none py-2"
          />
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="preset-emoji"
              className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
            >
              Emoji
            </label>
            <input
              id="preset-emoji"
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="🔧"
              maxLength={4}
              disabled={submitting || deleting}
              className="rounded-[12px] border border-border bg-surface px-4 py-2.5 text-[18px] w-24 text-center focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="preset-hint"
              className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
            >
              Précision
            </label>
            <input
              id="preset-hint"
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Ordures ménagères"
              disabled={submitting || deleting}
              className="rounded-[12px] border border-border bg-surface px-4 py-2.5 text-[14px] focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Catégorie
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Pill
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
              >
                {MAINTENANCE_CATEGORY_LABELS[c].label}
              </Pill>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Fréquence
          </span>
          <div className="flex flex-wrap gap-2">
            {FREQUENCY_PRESETS.map((f) => (
              <Pill
                key={f.rule}
                active={recurrenceRule === f.rule}
                onClick={() => applyFrequency(f)}
              >
                {f.label}
              </Pill>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="rrule"
                className="text-[11px] text-foreground-faint"
              >
                Règle iCal (avancée)
              </label>
              <input
                id="rrule"
                type="text"
                value={recurrenceRule}
                onChange={(e) => setRecurrenceRule(e.target.value)}
                placeholder="FREQ=MONTHLY"
                disabled={submitting || deleting}
                className="rounded-[10px] border border-border bg-surface px-3 py-2 text-[12px] font-mono focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="freq-label"
                className="text-[11px] text-foreground-faint"
              >
                Étiquette humaine
              </label>
              <input
                id="freq-label"
                type="text"
                value={frequencyLabel}
                onChange={(e) => setFrequencyLabel(e.target.value)}
                placeholder="Tous les mois"
                disabled={submitting || deleting}
                className="rounded-[10px] border border-border bg-surface px-3 py-2 text-[12px] focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPriority((v) => !v)}
          className={`flex items-center gap-2.5 rounded-[12px] border px-4 py-3 transition-colors ${
            priority
              ? "border-secondary bg-[rgba(255,200,69,0.10)]"
              : "border-border bg-surface"
          }`}
          aria-pressed={priority}
        >
          <Star
            size={16}
            fill={priority ? "var(--secondary)" : "none"}
            strokeWidth={priority ? 0 : 2}
            className={
              priority ? "text-[var(--secondary)]" : "text-muted-foreground"
            }
          />
          <span className="text-[14px] font-medium text-left flex-1">
            Prioritaire
          </span>
          <span className="text-[11px] text-muted-foreground">
            ramonage, détecteurs…
          </span>
        </button>

        {error ? (
          <p role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        ) : null}

        {onDelete ? (
          <div className="pt-3 mt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || submitting}
              className="flex items-center gap-2 text-[13px] text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
              {deleting ? "Suppression…" : "Supprimer ce preset"}
            </button>
          </div>
        ) : null}
      </form>
    </main>
  );
}
