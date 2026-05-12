"use client";

import { getDoc } from "firebase/firestore";
import { ArrowLeft, Check, Pencil, Repeat, Star, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { RecurrencePicker } from "@/components/tasks/recurrence-picker";
import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useTask } from "@/hooks/use-tasks";
import {
  completeRecurringTask,
  completeTask,
  deleteTask,
  uncompleteTask,
  updateTask,
  userDoc,
} from "@/lib/firebase/firestore";
import { describeRRule, getNextOccurrence } from "@/lib/recurrence";

const EFFORT_LABEL: Record<string, string> = {
  quick: "Rapide",
  normal: "Normal",
  long: "Long",
};

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams<{ taskId: string }>();
  const taskId = params.taskId;
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { task, loading, notFound } = useTask(household?.id, taskId);

  const { showToast } = useToast();
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRecurrence, setEditingRecurrence] = useState(false);
  const [draftRecurrence, setDraftRecurrence] = useState<string | null>(null);

  useEffect(() => {
    if (!task?.assigneeId) {
      setAssigneeName(null);
      return;
    }
    let cancelled = false;
    getDoc(userDoc(task.assigneeId))
      .then((snap) => {
        if (cancelled) return;
        const data = snap.data();
        setAssigneeName(
          data?.displayName ?? data?.email?.split("@")[0] ?? "Membre",
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [task?.assigneeId]);

  async function handleToggleComplete() {
    if (!household || !task || !user) return;
    setError(null);
    setActionPending(true);
    try {
      if (task.status === "done") {
        await uncompleteTask(household.id, task.id);
        return;
      }
      // Tâche récurrente : clone+update next, sinon completion classique
      if (task.recurrenceRule && task.dueDate) {
        const due = task.dueDate.toDate();
        const next = getNextOccurrence(task.recurrenceRule, due, due);
        if (next) {
          await completeRecurringTask(household.id, task, user.uid, next);
          const label = next.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          showToast({ message: `Fait ✓ Prochaine : ${label}` });
          return;
        }
      }
      await completeTask(household.id, task.id, user.uid);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Action impossible. Réessaie.",
      );
    } finally {
      setActionPending(false);
    }
  }

  async function handleSaveRecurrence() {
    if (!household || !task) return;
    setActionPending(true);
    try {
      await updateTask(household.id, task.id, {
        recurrenceRule: draftRecurrence ?? undefined,
      });
      showToast({ message: "Récurrence mise à jour" });
      setEditingRecurrence(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de mise à jour.");
    } finally {
      setActionPending(false);
    }
  }

  function startEditRecurrence() {
    setDraftRecurrence(task?.recurrenceRule ?? null);
    setEditingRecurrence(true);
  }

  async function handleDelete() {
    if (!household || !task) return;
    if (!window.confirm("Supprimer cette tâche définitivement ?")) return;
    setError(null);
    setActionPending(true);
    try {
      await deleteTask(household.id, task.id);
      router.replace("/tasks");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Suppression impossible. Réessaie.",
      );
      setActionPending(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  if (notFound || !task) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 gap-4">
        <p className="text-[14px] text-muted-foreground">
          Tâche introuvable ou supprimée.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/tasks")}
          className="rounded-[12px] border border-border bg-transparent text-foreground font-sans font-semibold text-[14px] px-[16px] py-2 hover:bg-surface-elevated transition-colors"
        >
          Retour aux tâches
        </button>
      </main>
    );
  }

  const isDone = task.status === "done";
  const dueLabel = task.dueDate
    ? task.dueDate.toDate().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <main className="flex flex-1 flex-col px-5 py-4">
      <header className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Link
            href={`/tasks/${task.id}/edit`}
            aria-label="Modifier"
            className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={actionPending}
            aria-label="Supprimer"
            className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors disabled:opacity-50"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-6 max-w-md w-full mx-auto">
        <section className="flex flex-col gap-3">
          {task.category ? (
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              {task.category}
            </p>
          ) : null}
          <h1
            className={`font-display text-[28px] font-semibold leading-[1.1] flex items-start gap-2 ${
              isDone ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.priority ? (
              <Star
                size={24}
                strokeWidth={2.2}
                fill="var(--secondary)"
                className="text-[var(--secondary)] mt-1 shrink-0"
                aria-label="Tâche prioritaire"
              />
            ) : null}
            <span>{task.title}</span>
          </h1>
          {task.description ? (
            <p className="text-[15px] text-muted-foreground leading-[1.5] whitespace-pre-wrap">
              {task.description}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-3">
          <div className="rounded-[14px] border border-border bg-surface px-4 py-3 flex flex-col gap-2">
            <div className="flex justify-between gap-3">
              <span className="text-[12px] text-muted-foreground">Pour</span>
              <span className="text-[13px] text-foreground font-medium">
                {assigneeName ?? (task.assigneeId ? "…" : "Non assignée")}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[12px] text-muted-foreground">Quand</span>
              <span className="text-[13px] text-foreground font-medium capitalize">
                {dueLabel ?? "Sans échéance"}
              </span>
            </div>
            {task.effort ? (
              <div className="flex justify-between gap-3">
                <span className="text-[12px] text-muted-foreground">Effort</span>
                <span className="text-[13px] text-foreground font-medium">
                  {EFFORT_LABEL[task.effort]}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <span className="text-[12px] text-muted-foreground">Statut</span>
              <span
                className={`text-[13px] font-medium ${
                  isDone ? "text-secondary" : "text-primary"
                }`}
              >
                {isDone ? "Faite" : "À faire"}
              </span>
            </div>
          </div>
        </section>

        {/* Récurrence */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Récurrence
            </h2>
            {!editingRecurrence ? (
              <button
                type="button"
                onClick={startEditRecurrence}
                className="text-[12px] text-primary hover:text-[var(--primary-hover)] transition-colors flex items-center gap-1"
              >
                <Pencil size={11} />
                Modifier
              </button>
            ) : null}
          </div>
          {editingRecurrence ? (
            <div className="rounded-[14px] border border-border bg-surface px-4 py-4 flex flex-col gap-4">
              <RecurrencePicker
                value={draftRecurrence}
                onChange={setDraftRecurrence}
                disabled={actionPending}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingRecurrence(false)}
                  disabled={actionPending}
                  className="px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveRecurrence}
                  disabled={actionPending}
                  className="px-3 py-1.5 rounded-[10px] bg-primary text-primary-foreground text-[13px] font-semibold shadow-[0_0_10px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
              <p className="text-[11px] text-foreground-faint leading-[1.5]">
                S&apos;applique à toutes les futures occurrences.
              </p>
            </div>
          ) : task.recurrenceRule ? (
            <div className="rounded-[14px] border border-border bg-surface px-4 py-3 flex items-center gap-2.5">
              <Repeat size={16} className="text-primary shrink-0" />
              <span className="text-[14px] text-foreground">
                {describeRRule(task.recurrenceRule)}
              </span>
            </div>
          ) : (
            <div className="rounded-[14px] border border-border-subtle bg-transparent px-4 py-3">
              <span className="text-[13px] text-muted-foreground">
                Tâche unique
              </span>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleToggleComplete}
            disabled={actionPending}
            className={`rounded-[12px] font-sans font-semibold text-[15px] px-[18px] py-3 transition-colors flex items-center justify-center gap-2 ${
              isDone
                ? "border border-border bg-transparent text-foreground hover:bg-surface-elevated"
                : "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isDone ? (
              <>
                <Undo2 size={16} /> Décocher
              </>
            ) : (
              <>
                <Check size={16} /> Marquer comme faite
              </>
            )}
          </button>
          {error ? (
            <p
              role="alert"
              className="text-[13px] text-destructive leading-[1.5]"
            >
              {error}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
