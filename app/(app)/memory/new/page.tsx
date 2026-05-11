"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { createMemoryEntry } from "@/lib/firebase/firestore";
import type { MemoryEntryType } from "@/types/cocon";

const TYPES: Array<{
  value: MemoryEntryType;
  label: string;
  emoji: string;
  hint: string;
}> = [
  {
    value: "code",
    label: "Code",
    emoji: "🔐",
    hint: "Wi-Fi, portail, alarme…",
  },
  { value: "object", label: "Objet", emoji: "📦", hint: "Passeport, papiers…" },
  {
    value: "contact",
    label: "Contact",
    emoji: "📞",
    hint: "Vétérinaire, plombier…",
  },
  { value: "manual", label: "Manuel", emoji: "📖", hint: "Notice électroménager" },
  { value: "warranty", label: "Garantie", emoji: "📄", hint: "Achats récents" },
  { value: "note", label: "Note", emoji: "📝", hint: "Texte libre" },
];

export default function NewMemoryEntryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { household } = useCurrentHousehold();

  const [type, setType] = useState<MemoryEntryType | null>(null);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [pinned, setPinned] = useState(false);
  const [isSensitive, setIsSensitive] = useState(false);
  // Champs adaptés au type, stockés tels quels dans structuredData
  const [fields, setFields] = useState<Record<string, string>>({});
  const [tagsRaw, setTagsRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !household || !type) return;
    setSubmitting(true);
    setError(null);
    try {
      const cleanFields: Record<string, string> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v.trim()) cleanFields[k] = v.trim();
      }
      const tags = tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await createMemoryEntry(household.id, {
        type,
        title: title.trim(),
        createdBy: user.uid,
        emoji: emoji.trim() || undefined,
        pinned,
        structuredData: cleanFields,
        tags,
        isSensitive: type === "code" ? isSensitive : false,
      });
      router.replace("/memory");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Création impossible.",
      );
      setSubmitting(false);
    }
  }

  if (!type) {
    return (
      <main className="flex flex-1 flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-background/85 backdrop-blur-xl border-b border-border">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Fermer"
            className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center"
          >
            <X size={18} />
          </button>
          <h1 className="text-[15px] font-medium">Nouvelle entrée</h1>
          <div className="w-9" />
        </header>
        <div className="flex-1 flex flex-col gap-4 px-5 py-6 max-w-md w-full mx-auto">
          <p className="text-[14px] text-muted-foreground">
            Quel type d&apos;entrée ?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className="rounded-[14px] border border-border bg-surface px-4 py-4 flex flex-col gap-1 text-left hover:bg-surface-elevated transition-colors"
              >
                <span className="text-[26px]">{t.emoji}</span>
                <span className="text-[14px] font-semibold">{t.label}</span>
                <span className="text-[11px] text-muted-foreground">
                  {t.hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const typeMeta = TYPES.find((t) => t.value === type)!;
  const canSubmit = title.trim().length > 0 && !submitting;

  return (
    <main className="flex flex-1 flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-background/85 backdrop-blur-xl border-b border-border">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Fermer"
          className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center"
        >
          <X size={18} />
        </button>
        <h1 className="text-[15px] font-medium">
          {typeMeta.emoji} {typeMeta.label}
        </h1>
        <button
          type="submit"
          form="new-memory-form"
          disabled={!canSubmit}
          className={`px-4 py-1.5 rounded-[10px] text-[13px] font-semibold ${
            canSubmit
              ? "text-primary hover:text-[var(--primary-hover)]"
              : "text-foreground-faint"
          }`}
        >
          {submitting ? "..." : "Enregistrer"}
        </button>
      </header>

      <form
        id="new-memory-form"
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-5 px-5 py-6 max-w-md w-full mx-auto"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
            placeholder={typeMeta.emoji}
            disabled={submitting}
            className="w-14 rounded-[10px] border border-border bg-surface text-center text-[20px] py-2"
            aria-label="Emoji"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre"
            required
            autoFocus
            disabled={submitting}
            className="flex-1 font-display text-[20px] font-semibold bg-transparent border-b border-border focus:border-primary outline-none py-2 placeholder:text-foreground-faint placeholder:font-normal placeholder:font-sans placeholder:text-[15px]"
          />
        </div>

        {/* Champs adaptés au type */}
        {type === "code" ? (
          <>
            <Field label="Valeur" required>
              <input
                type="text"
                value={fields.value ?? ""}
                onChange={(e) => setField("value", e.target.value)}
                className="rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px] font-mono focus:outline-none focus:border-primary"
                required
                disabled={submitting}
              />
            </Field>
            <Field label="Emplacement physique">
              <input
                type="text"
                value={fields.location ?? ""}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="ex. Portail entrée"
                className="rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px] focus:outline-none focus:border-primary"
                disabled={submitting}
              />
            </Field>
            <label className="flex items-center justify-between rounded-[12px] border border-border bg-surface px-4 py-3 cursor-pointer">
              <span className="text-[14px]">Valeur sensible (masquer par défaut)</span>
              <input
                type="checkbox"
                checked={isSensitive}
                onChange={(e) => setIsSensitive(e.target.checked)}
                className="w-5 h-5 accent-primary"
              />
            </label>
          </>
        ) : null}

        {type === "object" ? (
          <Field label="Emplacement">
            <input
              type="text"
              value={fields.location ?? ""}
              onChange={(e) => setField("location", e.target.value)}
              placeholder="ex. Secrétaire, tiroir du haut"
              className="rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px]"
              disabled={submitting}
            />
          </Field>
        ) : null}

        {type === "contact" ? (
          <>
            <Field label="Téléphone">
              <input
                type="tel"
                value={fields.phone ?? ""}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="06 12 34 56 78"
                className="rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px]"
                disabled={submitting}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={fields.email ?? ""}
                onChange={(e) => setField("email", e.target.value)}
                className="rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px]"
                disabled={submitting}
              />
            </Field>
            <Field label="Spécialité / rôle">
              <input
                type="text"
                value={fields.specialty ?? ""}
                onChange={(e) => setField("specialty", e.target.value)}
                placeholder="ex. Vétérinaire"
                className="rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px]"
                disabled={submitting}
              />
            </Field>
          </>
        ) : null}

        {type === "manual" ? (
          <>
            <Field label="Marque">
              <input
                type="text"
                value={fields.brand ?? ""}
                onChange={(e) => setField("brand", e.target.value)}
                className="rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px]"
                disabled={submitting}
              />
            </Field>
            <Field label="Modèle">
              <input
                type="text"
                value={fields.model ?? ""}
                onChange={(e) => setField("model", e.target.value)}
                className="rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px]"
                disabled={submitting}
              />
            </Field>
            <Field label="Date d'achat">
              <input
                type="date"
                value={fields.purchaseDate ?? ""}
                onChange={(e) => setField("purchaseDate", e.target.value)}
                className="rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px]"
                disabled={submitting}
              />
            </Field>
          </>
        ) : null}

        {type === "warranty" ? (
          <>
            <Field label="Produit">
              <input
                type="text"
                value={fields.product ?? ""}
                onChange={(e) => setField("product", e.target.value)}
                className="rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px]"
                disabled={submitting}
              />
            </Field>
            <Field label="Date d'expiration">
              <input
                type="date"
                value={fields.expiryDate ?? ""}
                onChange={(e) => setField("expiryDate", e.target.value)}
                className="rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px]"
                disabled={submitting}
              />
            </Field>
          </>
        ) : null}

        {type === "note" ? (
          <Field label="Contenu">
            <textarea
              value={fields.text ?? ""}
              onChange={(e) => setField("text", e.target.value)}
              rows={5}
              className="rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px] resize-none"
              disabled={submitting}
            />
          </Field>
        ) : null}

        <Field label="Tags (séparés par virgule)">
          <input
            type="text"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="ex. wifi, salon, freebox"
            className="rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[14px]"
            disabled={submitting}
          />
        </Field>

        <label className="flex items-center justify-between rounded-[12px] border border-border bg-surface px-4 py-3 cursor-pointer">
          <span className="text-[14px]">Épingler en favori</span>
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="w-5 h-5 accent-primary"
          />
        </label>

        {error ? (
          <p role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </main>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </div>
  );
}
