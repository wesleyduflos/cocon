import type { Task, TaskEffort, WithId } from "@/types/cocon";

export type BalanceWindow = "7d" | "30d";

export interface MemberStats {
  count: number;
  weight: number;
  categories: string[];
}

export interface BalanceResult {
  perMember: Record<string, MemberStats>;
  /** 0 = parfaitement équilibré, 1 = totalement déséquilibré. */
  balanceRatio: number;
  /** Texte chaleureux pré-formaté selon le ratio. */
  message: string;
  /** Total des weights agrégés (utile pour rendre une jauge). */
  totalWeight: number;
}

const EFFORT_WEIGHT: Record<TaskEffort, number> = {
  quick: 1,
  normal: 2,
  long: 4,
};

const DEFAULT_WEIGHT = 2;

function windowToDays(window: BalanceWindow): number {
  return window === "7d" ? 7 : 30;
}

/**
 * Calcule le score d'équilibre sur les tâches complétées dans la fenêtre.
 *
 * - Une tâche complétée par un non-membre (ex: ex-membre) est ignorée.
 * - Effort par défaut "normal" si absent.
 * - Le ratio est calculé comme (max - min) / max sur le poids total
 *   de chaque membre. Si un seul membre actif → 1 (extrême).
 * - Si aucune tâche → ratio 0 et message neutre.
 */
export function calculateBalance(
  tasks: WithId<Task>[],
  memberIds: string[],
  window: BalanceWindow,
  now: Date = new Date(),
): BalanceResult {
  const cutoffMs =
    now.getTime() - windowToDays(window) * 24 * 60 * 60 * 1000;

  const perMember: Record<string, MemberStats> = {};
  for (const uid of memberIds) {
    perMember[uid] = { count: 0, weight: 0, categories: [] };
  }

  for (const t of tasks) {
    if (t.status !== "done") continue;
    if (!t.completedBy || !t.completedAt) continue;
    if (!perMember[t.completedBy]) continue; // ex-membre
    if (t.completedAt.toMillis() < cutoffMs) continue;

    const w = EFFORT_WEIGHT[t.effort ?? "normal"] ?? DEFAULT_WEIGHT;
    const stats = perMember[t.completedBy];
    stats.count += 1;
    stats.weight += w;
    if (t.category && !stats.categories.includes(t.category)) {
      stats.categories.push(t.category);
    }
  }

  const weights = memberIds.map((uid) => perMember[uid].weight);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;
  const minWeight = weights.length > 0 ? Math.min(...weights) : 0;

  let balanceRatio = 0;
  if (totalWeight === 0) {
    balanceRatio = 0;
  } else if (memberIds.length <= 1) {
    balanceRatio = 0;
  } else if (maxWeight === 0) {
    balanceRatio = 0;
  } else {
    balanceRatio = (maxWeight - minWeight) / maxWeight;
  }

  const message = buildMessage(balanceRatio, perMember, totalWeight);

  return { perMember, balanceRatio, message, totalWeight };
}

/**
 * Renvoie un message bienveillant, calibré pour ne jamais culpabiliser.
 * Les seuils correspondent à la spec sprint 4 §D.2.
 */
export function buildMessage(
  ratio: number,
  perMember: Record<string, MemberStats>,
  totalWeight: number,
): string {
  if (totalWeight === 0) {
    return "Pas encore d'activité sur cette période.";
  }
  if (ratio < 0.15) {
    return "Vous formez une équipe au top !";
  }
  if (ratio < 0.3) {
    return "Bon équilibre cette semaine.";
  }
  // Identifier celui qui a porté la maison (plus gros poids)
  const top = Object.entries(perMember).sort(
    ([, a], [, b]) => b.weight - a.weight,
  )[0];
  if (!top) return "Bon équilibre cette semaine.";
  if (ratio < 0.5) {
    return `Un membre a fait un peu plus cette semaine.`;
  }
  return `Un membre a porté la maison cette semaine.`;
}

/**
 * Version messages qui personnalise avec le displayName du top contributor.
 * Le hook UI passe une map `displayNameByUid` pour rendre le message humain
 * (sinon on retombe sur la version anonyme de `buildMessage`).
 */
export function buildPersonalizedMessage(
  ratio: number,
  perMember: Record<string, MemberStats>,
  totalWeight: number,
  displayNameByUid: Record<string, string>,
): string {
  if (totalWeight === 0) {
    return "Pas encore d'activité sur cette période.";
  }
  if (ratio < 0.15) {
    return "Vous formez une équipe au top !";
  }
  if (ratio < 0.3) {
    return "Bon équilibre cette semaine.";
  }
  const top = Object.entries(perMember).sort(
    ([, a], [, b]) => b.weight - a.weight,
  )[0];
  const topName = top ? displayNameByUid[top[0]] ?? "Un membre" : "Un membre";
  if (ratio < 0.5) {
    return `${topName} a fait un peu plus cette semaine.`;
  }
  return `${topName} a porté la maison cette semaine.`;
}
