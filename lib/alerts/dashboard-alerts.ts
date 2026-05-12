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
  | "warranty-expiring"
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

  // Note sprint 5 polish : on n'ajoute plus les stocks (low/empty) ni les
  // préparations en cours ici car ils ont leur propre DashCard sur le
  // dashboard. La section "Alertes" reste pour ce qui n'a pas de card
  // dédiée : garanties qui expirent + tâches récurrentes demain.

  // 1) Garanties qui expirent dans < 30 jours
  // Convention : on stocke la date d'expiration dans structuredData.expiresAt
  // (string ISO ou yyyy-mm-dd, voir /memory/new flow).
  for (const e of memoryEntries) {
    if (e.type !== "warranty") continue;
    const expRaw = e.structuredData?.expiresAt;
    if (typeof expRaw !== "string" || !expRaw) continue;
    const exp = new Date(expRaw);
    if (Number.isNaN(exp.getTime())) continue;
    const daysUntil = Math.floor((exp.getTime() - now.getTime()) / ONE_DAY_MS);
    if (daysUntil < 0) continue; // déjà expirée, on ne notifie pas (trop tard)
    if (daysUntil > 30) continue;
    alerts.push({
      kind: "warranty-expiring",
      title:
        daysUntil <= 1
          ? `Garantie « ${e.title} » expire ${daysUntil === 0 ? "aujourd'hui" : "demain"}`
          : `Garantie « ${e.title} » expire dans ${daysUntil}j`,
      emoji: e.emoji ?? "📜",
      href: `/memory/${e.id}`,
      weight: daysUntil <= 7 ? 80 : 40,
    });
  }

  // 2) Tâches récurrentes prévues demain (utile pour anticiper le soir)
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
