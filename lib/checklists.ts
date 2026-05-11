import type { Task, WithId } from "@/types/cocon";

/**
 * Calcule le compte de tâches complétées d'un checklist run.
 * Pur, prend une liste de tasks et un runId, retourne `{ total, completed }`.
 */
export function calculateRunProgress(
  tasks: WithId<Task>[],
  runId: string,
): { total: number; completed: number } {
  const runTasks = tasks.filter((t) => t.checklistRunId === runId);
  const completed = runTasks.filter((t) => t.status === "done").length;
  return { total: runTasks.length, completed };
}

/** Retourne true si toutes les tasks d'un run sont complétées. */
export function isRunComplete(
  tasks: WithId<Task>[],
  runId: string,
): boolean {
  const { total, completed } = calculateRunProgress(tasks, runId);
  return total > 0 && completed === total;
}
