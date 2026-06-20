"use client";

import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { useSubtasks } from "@/hooks/use-subtasks";
import {
  completeTask,
  createSubtask,
  deleteSubtask,
  toggleSubtask,
  uncompleteTask,
  updateSubtaskPositions,
} from "@/lib/firebase/firestore";
import {
  areAllSubtasksDone,
  countSubtasksDone,
  nextSubtaskPosition,
  sortSubtasks,
  swapSubtaskPositions,
} from "@/lib/tasks/subtasks";
import type { Subtask, Task, WithId } from "@/types/cocon";

interface TaskSubtasksProps {
  householdId: string;
  task: WithId<Task>;
  userId: string;
}

/**
 * Section sous-tâches sur la page édition d'une tâche (sprint 6 — bloc F).
 *
 * - Liste avec checkbox + flèches haut/bas pour réordonner + supprimer
 * - Input d'ajout en bas (formulaire)
 * - Cascade : si toutes sous-tâches done → parent done auto.
 *   Si on décoche depuis parent done → parent repasse à pending.
 */
export function TaskSubtasks({
  householdId,
  task,
  userId,
}: TaskSubtasksProps) {
  const { subtasks, loading } = useSubtasks(householdId, task.id);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const sorted = sortSubtasks(subtasks);
  const counter = countSubtasksDone(sorted);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await createSubtask(householdId, task.id, {
        title: text.trim(),
        position: nextSubtaskPosition(sorted),
        createdBy: userId,
      });
      setText("");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(subtaskId: string, currentDone: boolean) {
    await toggleSubtask(householdId, task.id, subtaskId, !currentDone, userId);
    // Cascade — on re-calcule avec la nouvelle valeur car le snapshot
    // n'est pas encore arrivé.
    const projected = sorted.map((s) =>
      s.id === subtaskId
        ? { ...s, status: (!currentDone ? "done" : "pending") as Subtask["status"] }
        : s,
    );
    if (areAllSubtasksDone(projected) && task.status !== "done") {
      await completeTask(householdId, task.id, userId);
    } else if (
      !areAllSubtasksDone(projected) &&
      task.status === "done"
    ) {
      await uncompleteTask(householdId, task.id);
    }
  }

  async function handleDelete(subtaskId: string) {
    await deleteSubtask(householdId, task.id, subtaskId);
  }

  async function move(subtaskId: string, direction: "up" | "down") {
    const idx = sorted.findIndex((s) => s.id === subtaskId);
    const target = direction === "up" ? idx - 1 : idx + 1;
    const updates = swapSubtaskPositions(sorted, idx, target);
    if (updates.length === 0) return;
    await updateSubtaskPositions(householdId, task.id, updates);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          Sous-tâches{" "}
          {counter.label ? (
            <span className="text-foreground-faint font-normal">
              · {counter.label}
            </span>
          ) : null}
        </h2>
      </div>

      {loading ? (
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      ) : sorted.length === 0 ? (
        <p className="text-[12px] text-foreground-faint italic px-1">
          Aucune sous-tâche. Ajoutes-en pour découper le travail.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sorted.map((sub, idx) => {
            const isDone = sub.status === "done";
            return (
              <li
                key={sub.id}
                className="flex items-center gap-2 rounded-[10px] border border-border-subtle bg-surface px-2.5 py-2"
              >
                <button
                  type="button"
                  onClick={() => handleToggle(sub.id, isDone)}
                  aria-label={isDone ? "Décocher" : "Cocher"}
                  aria-pressed={isDone}
                  className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 transition-all ${
                    isDone
                      ? "bg-secondary border-secondary"
                      : "border-[#5C3D2C] hover:border-primary"
                  }`}
                >
                  {isDone ? (
                    <span className="text-[10px] text-secondary-foreground">
                      ✓
                    </span>
                  ) : null}
                </button>
                <span
                  className={`flex-1 text-[14px] truncate ${
                    isDone
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {sub.title}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => move(sub.id, "up")}
                    disabled={idx === 0}
                    aria-label="Monter"
                    className="w-7 h-7 rounded-[6px] flex items-center justify-center text-foreground-faint hover:bg-surface-elevated disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(sub.id, "down")}
                    disabled={idx === sorted.length - 1}
                    aria-label="Descendre"
                    className="w-7 h-7 rounded-[6px] flex items-center justify-center text-foreground-faint hover:bg-surface-elevated disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(sub.id)}
                    aria-label={`Supprimer ${sub.title}`}
                    className="w-7 h-7 rounded-[6px] flex items-center justify-center text-foreground-faint hover:bg-destructive/20 hover:text-destructive transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex items-center gap-2 mt-1">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nouvelle sous-tâche…"
          disabled={busy}
          className="flex-1 rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!text.trim() || busy}
          aria-label="Ajouter une sous-tâche"
          className="w-9 h-9 rounded-[10px] bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-[var(--primary-hover)] transition-colors"
        >
          <Plus size={16} strokeWidth={2.4} />
        </button>
      </form>
    </section>
  );
}
