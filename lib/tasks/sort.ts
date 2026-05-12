import type { Task, WithId } from "@/types/cocon";

/**
 * Tri des tâches : prioritaire d'abord, puis par due date croissante
 * (les sans due-date en dernier), puis par titre alphabétique.
 *
 * Helper pur, testable, utilisé sur le dashboard et /tasks pour faire
 * remonter les tâches importantes (sprint 5 B.4).
 */
export function sortByPriorityThenDue(
  tasks: WithId<Task>[],
): WithId<Task>[] {
  const copy = [...tasks];
  copy.sort((a, b) => {
    // 1) Priority desc
    const pa = a.priority === true ? 1 : 0;
    const pb = b.priority === true ? 1 : 0;
    if (pa !== pb) return pb - pa;
    // 2) Due date asc (les sans due-date en dernier)
    const ams = a.dueDate?.toMillis() ?? Number.POSITIVE_INFINITY;
    const bms = b.dueDate?.toMillis() ?? Number.POSITIVE_INFINITY;
    if (ams !== bms) return ams - bms;
    // 3) Titre alphabétique (collation française)
    return a.title.localeCompare(b.title, "fr");
  });
  return copy;
}
