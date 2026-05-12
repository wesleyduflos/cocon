"use client";

import { Timestamp, getDoc } from "firebase/firestore";
import { Star, Trash2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { RecurrencePicker } from "@/components/tasks/recurrence-picker";
import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useTask } from "@/hooks/use-tasks";
import {
  deleteTask,
  updateTask,
  userDoc,
} from "@/lib/firebase/firestore";
import type { TaskEffort } from "@/types/cocon";

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
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59),
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

function whenChoiceFromDueDate(dueDate?: Timestamp): {
  choice: WhenChoice;
  custom: string;
} {
  if (!dueDate) return { choice: "none", custom: "" };
  const due = dueDate.toDate();
  const now = new Date();
  if (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  )
    return { choice: "today", custom: "" };
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
    return { choice: "tomorrow", custom: "" };
  // En edit, on bascule directement en custom pour preserver la valeur exacte
  const customDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
  return { choice: "custom", custom: customDate };
}

interface MemberOption {
  uid: string;
  displayName: string;
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

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams<{ taskId: string }>();
  const taskId = params.taskId;
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { task, loading, notFound } = useTask(household?.id, taskId);
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
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate le formulaire avec les valeurs courantes de la tâche
  useEffect(() => {
    if (!task || hydrated) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setAssigneeId(task.assigneeId ?? null);
    setCategory(task.category ?? null);
    setEffort(task.effort ?? null);
    setPriority(task.priority === true);
    setRecurrenceRule(task.recurrenceRule ?? null);
    const { choice, custom } = whenChoiceFromDueDate(task.dueDate);
    setWhenChoice(choice);
    setCustomDate(custom);
    setHydrated(true);
  }, [task, hydrated]);

  // Charge les membres du cocon pour le picker assignee
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !household || !task) return;
    setError(null);
    setSubmitting(true);
    try {
      const dueDate = buildDueDate(whenChoice, customDate);
      await updateTask(household.id, task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category ?? undefined,
        assigneeId: assigneeId ?? undefined,
        effort: effort ?? undefined,
        priority,
        dueDate: dueDate,
        recurrenceRule: recurrenceRule ?? undefined,
      });
      showToast({ message: "Tâche mise à jour" });
      router.replace(`/tasks/${task.id}`);
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
    if (!household || !task) return;
    if (
      !window.confirm(
        `Supprimer définitivement « ${task.title} » ? Cette action est irréversible.`,
      )
    )
      return;
    setDeleting(true);
    try {
      await deleteTask(household.id, task.id);
      showToast({ message: "Tâche supprimée" });
      router.replace("/tasks");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Suppression impossible.",
      );
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

  if (notFound || !task) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-7 gap-4 text-center">
        <p className="text-[14px] text-muted-foreground">
          Cette tâche n&apos;existe plus.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/tasks")}
          className="rounded-[12px] border border-border bg-transparent text-foreground px-4 py-2 text-[13px]"
        >
          Retour à la liste
        </button>
      </main>
    );
  }

  const canSubmit = title.trim().length > 0 && !submitting && !deleting;
  const isRecurrent = Boolean(task.recurrenceRule);

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
        <h1 className="text-[15px] font-medium">Modifier la tâche</h1>
        <button
          type="submit"
          form="edit-task-form"
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
        id="edit-task-form"
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-7 px-5 py-6 max-w-md w-full mx-auto"
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
            required
            disabled={submitting || deleting}
            className="font-display text-[22px] font-semibold bg-transparent border-b border-border focus:border-primary outline-none py-2"
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Pour qui
          </span>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <Pill
                key={m.uid}
                active={assigneeId === m.uid}
                onClick={() =>
                  setAssigneeId(assigneeId === m.uid ? null : m.uid)
                }
                disabled={submitting}
              >
                {m.uid === user?.uid ? "Moi" : m.displayName}
              </Pill>
            ))}
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
            className={
              priority ? "text-[var(--secondary)]" : "text-muted-foreground"
            }
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
            rows={3}
            disabled={submitting}
            className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[14px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(255,107,36,0.18)] disabled:opacity-50 resize-none"
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Récurrence
          </span>
          {isRecurrent ? (
            <p className="text-[12px] text-muted-foreground leading-snug">
              Cette tâche est récurrente. Les modifications s&apos;appliquent
              à toutes les occurrences futures de la série.
            </p>
          ) : null}
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

        <div className="pt-3 mt-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || submitting}
            className="flex items-center gap-2 text-[13px] text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
            {deleting ? "Suppression…" : "Supprimer la tâche"}
          </button>
        </div>
      </form>
    </main>
  );
}
