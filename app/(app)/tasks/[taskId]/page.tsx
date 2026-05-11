"use client";

import { getDoc } from "firebase/firestore";
import { ArrowLeft, Check, Trash2, Undo2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useTask } from "@/hooks/use-tasks";
import {
  completeTask,
  deleteTask,
  uncompleteTask,
  userDoc,
} from "@/lib/firebase/firestore";

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

  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      } else {
        await completeTask(household.id, task.id, user.uid);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Action impossible. Réessaie.",
      );
    } finally {
      setActionPending(false);
    }
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
        <button
          type="button"
          onClick={handleDelete}
          disabled={actionPending}
          aria-label="Supprimer"
          className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors disabled:opacity-50"
        >
          <Trash2 size={18} />
        </button>
      </header>

      <div className="flex flex-col gap-6 max-w-md w-full mx-auto">
        <section className="flex flex-col gap-3">
          {task.category ? (
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              {task.category}
            </p>
          ) : null}
          <h1
            className={`font-display text-[28px] font-semibold leading-[1.1] ${
              isDone ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
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
