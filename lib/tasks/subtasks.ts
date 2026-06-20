import type { Subtask, WithId } from "@/types/cocon";

/**
 * Sprint 6 — bloc F. Helpers purs autour des sous-tâches.
 */

export function sortSubtasks(
  subtasks: WithId<Subtask>[],
): WithId<Subtask>[] {
  const copy = [...subtasks];
  copy.sort((a, b) => a.position - b.position);
  return copy;
}

export function areAllSubtasksDone(subtasks: WithId<Subtask>[]): boolean {
  if (subtasks.length === 0) return false;
  return subtasks.every((s) => s.status === "done");
}

export function countSubtasksDone(subtasks: WithId<Subtask>[]): {
  done: number;
  total: number;
  label: string;
} {
  const done = subtasks.filter((s) => s.status === "done").length;
  const total = subtasks.length;
  return { done, total, label: total > 0 ? `${done}/${total}` : "" };
}

/**
 * Position à attribuer à une nouvelle sous-tâche : max(positions) + 1,
 * ou 0 si liste vide. Garantit que la nouvelle se range à la fin.
 */
export function nextSubtaskPosition(subtasks: WithId<Subtask>[]): number {
  if (subtasks.length === 0) return 0;
  let max = -Infinity;
  for (const s of subtasks) {
    if (s.position > max) max = s.position;
  }
  return max + 1;
}

/**
 * Échange les positions de deux sous-tâches (déplacement haut/bas).
 * Retourne les paires `{id, position}` à persister.
 */
export function swapSubtaskPositions(
  subtasks: WithId<Subtask>[],
  fromIndex: number,
  toIndex: number,
): Array<{ id: string; position: number }> {
  const sorted = sortSubtasks(subtasks);
  if (
    fromIndex < 0 ||
    fromIndex >= sorted.length ||
    toIndex < 0 ||
    toIndex >= sorted.length
  ) {
    return [];
  }
  const a = sorted[fromIndex];
  const b = sorted[toIndex];
  return [
    { id: a.id, position: b.position },
    { id: b.id, position: a.position },
  ];
}
