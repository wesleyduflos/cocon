import type {
  ChecklistRun,
  MemoryEntry,
  StockItem,
  Task,
  WithId,
} from "@/types/cocon";

/* =========================================================================
   computeDashboardAlerts — sprint 5 bloc F.6

   Helper pur, testable, qui agrège les "moments à savoir" du foyer
   pour la section Alertes du dashboard.

   Types d'alertes :
   - stock-low / stock-empty : stocks bas ou épuisés
   - prep-in-progress : checklist-runs non terminés
   - warranty-expiring : garanties (memory-entries type=warranty) qui
     expirent dans < 30 jours
   - tomorrow-recurring : tâches récurrentes prévues demain
     (pour l'utilisateur s'il veut anticiper la veille au soir)

   La liste est cappée à 5 par défaut (au-delà, l'UI affiche "+ N autres").
   ========================================================================= */

export type AlertKind =
  | "stock-low"
  | "stock-empty"
  | "prep-in-progress"
  | "tomorrow-recurring";

export interface DashboardAlert {
  kind: AlertKind;
  title: string;
  emoji: string;
  /** Lien Next.js cible (route ou route avec query). */
  href: string;
  /** Score de priorité interne pour le tri (descendant). */
  weight: number;
}

interface ComputeInput {
  stocks: WithId<StockItem>[];
  runs: WithId<ChecklistRun>[];
  memoryEntries: WithId<MemoryEntry>[];
  tasks: WithId<Task>[];
  now: Date;
  /** Limite d'alertes retournées (default 5). */
  limit?: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function computeDashboardAlerts({
  stocks: _stocks,
  runs: _runs,
  memoryEntries,
  tasks,
  now,
  limit = 5,
}: ComputeInput): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  // Note sprint 5 polish :
  // - Plus de stocks (low/empty) ni préparations en cours ici (DashCard
  //   dédiées sur le dashboard).
  // - Plus de garanties qui expirent : le type "warranty" a été retiré
  //   de MemoryEntryType. Les entries legacy avec type=warranty existent
  //   peut-être encore en DB mais ne sont plus matchées par le typage TS.
  // → Reste : tâches récurrentes prévues demain.

  // Récupère les anciennes garanties legacy via un cast (entries DB qui
  // peuvent encore avoir type="warranty" mais le type TS ne le reconnaît
  // plus). On ne les notifie plus.
  void memoryEntries;

  // 1) Tâches récurrentes prévues demain (utile pour anticiper le soir)
  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const endOfTomorrow = new Date(startOfTomorrow.getTime() + ONE_DAY_MS - 1);
  for (const t of tasks) {
    if (t.status !== "pending") continue;
    if (!t.recurrenceRule) continue;
    if (!t.dueDate) continue;
    const ms = t.dueDate.toMillis();
    if (ms < startOfTomorrow.getTime() || ms > endOfTomorrow.getTime())
      continue;
    alerts.push({
      kind: "tomorrow-recurring",
      title: `Demain : ${t.title}`,
      emoji: "🔁",
      href: `/tasks/${t.id}`,
      weight: 30,
    });
  }

  // Tri par poids décroissant, cap à `limit`
  alerts.sort((a, b) => b.weight - a.weight);
  return alerts.slice(0, limit);
}
