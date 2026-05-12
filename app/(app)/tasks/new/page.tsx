"use client";

import { Timestamp, getDoc } from "firebase/firestore";
import { Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { RecurrencePicker } from "@/components/tasks/recurrence-picker";
import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { applyParseHints, parseTaskNatural } from "@/lib/ai/parse-task";
import { createTask, userDoc } from "@/lib/firebase/firestore";
import type { TaskEffort } from "@/types/cocon";
import { Star } from "lucide-react";

const CATEGORIES = ["Maison", "Animaux", "Voiture", "Cuisine"];
const EFFORTS: Array<{ value: TaskEffort; label: string }> = [
  { value: "quick", label: "Rapide" },
  { value: "normal", label: "Normal" },
  { value: "long", label: "Long" },
];

type WhenChoice = "none" | "today" | "tomorrow" | "thisWeek" | "custom";

function buildDueDate(
  choice: WhenChoice,
  customDate: string,
): Timestamp | undefined {
  const now = new Date();
  if (choice === "today") {
    return Timestamp.fromDate(
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
    );
  }
  if (choice === "tomorrow") {
    return Timestamp.fromDate(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        23,
        59,
        59,
      ),
    );
  }
  if (choice === "thisWeek") {
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    return Timestamp.fromDate(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + daysUntilSunday,
        23,
        59,
        59,
      ),
    );
  }
  if (choice === "custom" && customDate) {
    return Timestamp.fromDate(new Date(`${customDate}T23:59:59`));
  }
  return undefined;
}

interface MemberOption {
  uid: string;
  displayName: string;
  avatarEmoji?: string;
}

function Pill({
  active,
  children,
  onClick,
  disabled,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
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

export default function NewTaskPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [whenChoice, setWhenChoice] = useState<WhenChoice>("none");
  const [customDate, setCustomDate] = useState<string>("");
  const [category, setCategory] = useState<string | null>(null);
  const [effort, setEffort] = useState<TaskEffort | null>(null);
  const [priority, setPriority] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null);

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saisie naturelle (encart sparkle)
  const [aiMode, setAiMode] = useState<"idle" | "editing" | "analyzing">(
    "idle",
  );
  const [naturalText, setNaturalText] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    Promise.all(
      household.memberIds.map(async (uid) => {
        const snap = await getDoc(userDoc(uid));
        const data = snap.data();
        return {
          uid,
          displayName:
            data?.displayName ?? data?.email?.split("@")[0] ?? "Membre",
          avatarEmoji: data?.avatarEmoji,
        };
      }),
    )
      .then((m) => {
        if (!cancelled) setMembers(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [household]);

  function whenChoiceFromDueDate(dueDate?: Timestamp): WhenChoice {
    if (!dueDate) return "none";
    const due = dueDate.toDate();
    const now = new Date();
    if (
      due.getFullYear() === now.getFullYear() &&
      due.getMonth() === now.getMonth() &&
      due.getDate() === now.getDate()
    )
      return "today";
    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    if (
      due.getFullYear() === tomorrow.getFullYear() &&
      due.getMonth() === tomorrow.getMonth() &&
      due.getDate() === tomorrow.getDate()
    )
      return "tomorrow";
    const inSevenDays = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 7,
    );
    if (due <= inSevenDays) return "thisWeek";
    return "custom";
  }

  async function handleAnalyze() {
    if (!user || naturalText.trim().length < 3) return;
    setAiError(null);
    setAiMode("analyzing");
    try {
      const ai = await parseTaskNatural(naturalText.trim());
      const otherId = household?.memberIds.find((uid) => uid !== user.uid);
      const fields = applyParseHints(
        ai,
        { currentUserId: user.uid, otherMemberId: otherId },
        new Date(),
      );
      // Pré-remplir le formulaire avec les valeurs détectées
      setTitle(fields.title);
      if (fields.category) setCategory(fields.category);
      if (fields.assigneeId) setAssigneeId(fields.assigneeId);
      if (fields.effort) setEffort(fields.effort);
      if (fields.dueDate) {
        setWhenChoice(whenChoiceFromDueDate(fields.dueDate));
      }
      const filledCount =
        Number(Boolean(fields.title)) +
        Number(Boolean(fields.category)) +
        Number(Boolean(fields.assigneeId)) +
        Number(Boolean(fields.effort)) +
        Number(Boolean(fields.dueDate));
      showToast({
        message: `${filledCount} champ${filledCount > 1 ? "s" : ""} détecté${filledCount > 1 ? "s" : ""} · ajuste avant d'enregistrer`,
      });
      setAiMode("idle");
      setNaturalText("");
    } catch (err) {
      // Fallback silencieux conformément aux specs : on bascule en mode
      // formulaire normal avec le texte saisi comme titre.
      setTitle(naturalText.trim());
      setNaturalText("");
      setAiMode("idle");
      setAiError(
        err instanceof Error
          ? err.message
          : "Analyse IA indisponible — on garde ta phrase comme titre.",
      );
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !household) return;
    setError(null);
    setSubmitting(true);
    try {
      const dueDate = buildDueDate(whenChoice, customDate);
      await createTask(household.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category ?? undefined,
        assigneeId: assigneeId ?? undefined,
        effort: effort ?? undefined,
        priority,
        dueDate,
        recurrenceRule: recurrenceRule ?? undefined,
        createdBy: user.uid,
      });
      router.replace("/tasks");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer la tâche. Réessaie.",
      );
      setSubmitting(false);
    }
  }

  const canSubmit = title.trim().length > 0 && !submitting;

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
        <h1 className="text-[15px] font-medium">Nouvelle tâche</h1>
        <button
          type="submit"
          form="new-task-form"
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
                « Donner le traitement à Mochi demain matin »
              </span>
            </div>
          </button>
        ) : (
          <div className="rounded-[14px] border border-[rgba(255,107,36,0.4)] bg-gradient-to-br from-[rgba(255,107,36,0.12)] to-[rgba(255,200,69,0.06)] px-4 py-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Sparkles
                size={16}
                className="text-primary drop-shadow-[0_0_8px_rgba(255,107,36,0.6)]"
              />
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
              className="rounded-[10px] bg-surface/60 border border-border px-3 py-2 text-[14px] text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary resize-none disabled:opacity-50"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setAiMode("idle");
                  setNaturalText("");
                  setAiError(null);
                }}
                disabled={aiMode === "analyzing"}
                className="px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={
                  aiMode === "analyzing" || naturalText.trim().length < 3
                }
                className="px-4 py-2 rounded-[10px] bg-primary text-primary-foreground text-[13px] font-semibold shadow-[0_0_14px_rgba(255,107,36,0.4)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiMode === "analyzing" ? "Analyse…" : "Analyser ✨"}
              </button>
            </div>
          </div>
        )}
        {aiError ? (
          <p className="text-[12px] text-muted-foreground mt-2">
            {aiError}
          </p>
        ) : null}
      </div>

      <form
        id="new-task-form"
        onSubmit={handleSubmit}
        className={`flex-1 flex flex-col gap-7 px-5 py-6 max-w-md w-full mx-auto transition-opacity ${
          aiMode === "editing" ? "opacity-40 pointer-events-none" : ""
        }`}
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="task-title"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Titre
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex. Donner le traitement à Mochi"
            required
            autoFocus
            disabled={submitting}
            className="font-display text-[22px] font-semibold bg-transparent border-b border-border focus:border-primary outline-none py-2 placeholder:text-foreground-faint placeholder:font-normal placeholder:font-sans placeholder:text-[16px]"
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Pour qui
          </span>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const label = m.uid === user?.uid ? "Moi" : m.displayName;
              const emoji = m.avatarEmoji;
              return (
                <Pill
                  key={m.uid}
                  active={assigneeId === m.uid}
                  onClick={() =>
                    setAssigneeId(assigneeId === m.uid ? null : m.uid)
                  }
                  disabled={submitting}
                >
                  {emoji ? (
                    <span className="mr-1.5">{emoji}</span>
                  ) : null}
                  {label}
                </Pill>
              );
            })}
            <Pill
              active={assigneeId === null}
              onClick={() => setAssigneeId(null)}
              disabled={submitting}
            >
              Non assignée
            </Pill>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Quand
          </span>
          <div className="flex flex-wrap gap-2">
            <Pill
              active={whenChoice === "today"}
              onClick={() => setWhenChoice("today")}
              disabled={submitting}
            >
              Aujourd&apos;hui
            </Pill>
            <Pill
              active={whenChoice === "tomorrow"}
              onClick={() => setWhenChoice("tomorrow")}
              disabled={submitting}
            >
              Demain
            </Pill>
            <Pill
              active={whenChoice === "thisWeek"}
              onClick={() => setWhenChoice("thisWeek")}
              disabled={submitting}
            >
              Cette semaine
            </Pill>
            <Pill
              active={whenChoice === "custom"}
              onClick={() => setWhenChoice("custom")}
              disabled={submitting}
            >
              Choisir
            </Pill>
            <Pill
              active={whenChoice === "none"}
              onClick={() => setWhenChoice("none")}
              disabled={submitting}
            >
              Sans échéance
            </Pill>
          </div>
          {whenChoice === "custom" ? (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              disabled={submitting}
              className="rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] mt-1 self-start"
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Catégorie
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Pill
                key={cat}
                active={category === cat}
                onClick={() => setCategory(category === cat ? null : cat)}
                disabled={submitting}
              >
                {cat}
              </Pill>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Effort estimé
          </span>
          <div className="flex flex-wrap gap-2">
            {EFFORTS.map((e) => (
              <Pill
                key={e.value}
                active={effort === e.value}
                onClick={() => setEffort(effort === e.value ? null : e.value)}
                disabled={submitting}
              >
                {e.label}
              </Pill>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setPriority((p) => !p)}
            aria-pressed={priority}
            disabled={submitting}
            className={`rounded-[12px] border px-4 py-3 flex items-center gap-3 transition-all ${
              priority
                ? "border-[var(--secondary)] bg-[rgba(255,200,69,0.08)]"
                : "border-border bg-surface hover:bg-surface-elevated"
            } disabled:opacity-50`}
          >
            <Star
              size={20}
              strokeWidth={priority ? 2.4 : 2}
              fill={priority ? "var(--secondary)" : "none"}
              className={priority ? "text-[var(--secondary)]" : "text-muted-foreground"}
            />
            <div className="flex-1 flex flex-col items-start min-w-0">
              <span className="text-[14px] font-medium">
                {priority ? "Tâche prioritaire" : "Marquer comme prioritaire"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Remonte en haut de liste et du dashboard
              </span>
            </div>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="task-description"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Description (facultatif)
          </label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes, détails, contexte…"
            rows={3}
            disabled={submitting}
            className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[14px] text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(255,107,36,0.18)] disabled:opacity-50 resize-none"
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Récurrence
          </span>
          <RecurrencePicker
            value={recurrenceRule}
            onChange={setRecurrenceRule}
            disabled={submitting}
          />
        </div>

        {error ? (
          <p role="alert" className="text-[13px] text-destructive leading-[1.5]">
            {error}
          </p>
        ) : null}
      </form>
    </main>
  );
}
