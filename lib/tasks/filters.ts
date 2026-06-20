import type { Task, WithId } from "@/types/cocon";

/**
 * Identifiants des filtres dispos sur /tasks.
 *
 * - `unassigned` : aucune `assigneeId`
 * - `me` : assignée à `userId`
 * - `member:<uid>` : assignée à un membre précis (autre que moi)
 *
 * On évite un enum fermé pour pouvoir ajouter dynamiquement un filtre par
 * membre sans refactor.
 */
export type TaskFilter =
  | { kind: "unassigned" }
  | { kind: "me"; uid: string }
  | { kind: "member"; uid: string };

export function matchesFilter(
  task: WithId<Task>,
  filter: TaskFilter,
): boolean {
  if (filter.kind === "unassigned") return !task.assigneeId;
  if (filter.kind === "me") return task.assigneeId === filter.uid;
  return task.assigneeId === filter.uid;
}

/**
 * Filtre la liste de tâches avec une logique OR.
 *
 * - Aucun filtre actif → retourne `tasks` tel quel (équivalent ancien
 *   chip « Toutes »)
 * - Plusieurs filtres → garde les tâches qui matchent au moins un filtre
 */
export function filterTasks(
  tasks: WithId<Task>[],
  activeFilters: TaskFilter[],
): WithId<Task>[] {
  if (activeFilters.length === 0) return tasks;
  return tasks.filter((t) => activeFilters.some((f) => matchesFilter(t, f)));
}

/**
 * Compte les tâches non terminées qui matchent un filtre, indépendamment
 * des autres filtres actifs. Utilisé pour afficher « À moi (3) » sur les
 * chips.
 */
export function countTasksMatching(
  tasks: WithId<Task>[],
  filter: TaskFilter,
): number {
  return tasks.filter(
    (t) => t.status === "pending" && matchesFilter(t, filter),
  ).length;
}

export function filterKey(filter: TaskFilter): string {
  if (filter.kind === "unassigned") return "unassigned";
  if (filter.kind === "me") return `me:${filter.uid}`;
  return `member:${filter.uid}`;
}

export function filtersEqual(a: TaskFilter, b: TaskFilter): boolean {
  return filterKey(a) === filterKey(b);
}
