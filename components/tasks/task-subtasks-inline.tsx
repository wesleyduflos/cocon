"use client";

import { useSubtasks } from "@/hooks/use-subtasks";
import {
  areAllSubtasksDone,
  sortSubtasks,
} from "@/lib/tasks/subtasks";
import {
  completeTask,
  toggleSubtask,
  uncompleteTask,
} from "@/lib/firebase/firestore";
import type { Subtask, Task, WithId } from "@/types/cocon";

interface Props {
  householdId: string;
  task: WithId<Task>;
  userId: string;
}

/**
 * Sprint 6 — bloc F.3. Affichage inline des sous-tâches sous une tâche
 * dans la liste /tasks. Cochables sans aller en édition. Cascade
 * complétion comme sur la page d'édition.
 */
export function TaskSubtasksInline({ householdId, task, userId }: Props) {
  const { subtasks, loading } = useSubtasks(householdId, task.id);
  const sorted = sortSubtasks(subtasks);

  async function handleToggle(id: string, currentDone: boolean) {
    await toggleSubtask(householdId, task.id, id, !currentDone, userId);
    const projected = sorted.map((s) =>
      s.id === id
        ? { ...s, status: (!currentDone ? "done" : "pending") as Subtask["status"] }
        : s,
    );
    if (areAllSubtasksDone(projected) && task.status !== "done") {
      await completeTask(householdId, task.id, userId);
    } else if (!areAllSubtasksDone(projected) && task.status === "done") {
      await uncompleteTask(householdId, task.id);
    }
  }

  if (loading) {
    return (
      <div className="px-4 pb-2 text-[12px] text-muted-foreground">
        Chargement…
      </div>
    );
  }
  if (sorted.length === 0) {
    return (
      <div className="px-4 pb-2 text-[12px] text-foreground-faint italic">
        Aucune sous-tâche.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1 pl-9 pr-3 pb-2.5">
      {sorted.map((sub) => {
        const isDone = sub.status === "done";
        return (
          <li
            key={sub.id}
            className="flex items-center gap-2 py-1 group"
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleToggle(sub.id, isDone);
              }}
              aria-label={isDone ? "Décocher" : "Cocher"}
              aria-pressed={isDone}
              className={`w-[16px] h-[16px] rounded-[4px] border-[1.5px] flex items-center justify-center shrink-0 transition-all ${
                isDone
                  ? "bg-secondary border-secondary"
                  : "border-[#5C3D2C] hover:border-primary"
              }`}
            >
              {isDone ? (
                <span className="text-[9px] text-secondary-foreground">
                  ✓
                </span>
              ) : null}
            </button>
            <span
              className={`text-[13px] truncate ${
                isDone
                  ? "line-through text-muted-foreground"
                  : "text-foreground"
              }`}
            >
              {sub.title}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
