import type { StockHistoryEntry } from "@/types/cocon";

/**
 * Prédit la date du prochain renouvellement basée sur les renouvellements
 * passés (transitions vers `full`). Algorithme : moyenne des intervalles
 * entre les 3 derniers renouvellements consécutifs.
 *
 * Retourne null si :
 * - aucun renouvellement enregistré
 * - moins de 2 renouvellements (pas assez de signal)
 * - intervalle moyen aberrant (< 1 jour ou > 1 an, on évite les outliers)
 *
 * @param history triée plus récente en premier (cohérent avec stockage Firestore)
 */
export function predictNextRenewal(
  history: Pick<StockHistoryEntry, "level" | "changedAt">[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _now: Date = new Date(),
): Date | null {
  const renewals = history
    .filter((h) => h.level === "full")
    .map((h) => h.changedAt.toDate());

  if (renewals.length < 2) return null;

  // intervals[i] = renewals[i] - renewals[i+1] (en ms)
  const intervals: number[] = [];
  for (let i = 0; i < renewals.length - 1; i++) {
    intervals.push(renewals[i].getTime() - renewals[i + 1].getTime());
  }

  const recent = intervals.slice(0, 3);
  const avgMs = recent.reduce((a, b) => a + b, 0) / recent.length;

  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneYearMs = 365 * oneDayMs;
  if (avgMs < oneDayMs || avgMs > oneYearMs) return null;

  return new Date(renewals[0].getTime() + avgMs);
}

/**
 * Cap une history à un maximum de N entries (plus récent en premier).
 * Helper pur — utilisé côté write pour éviter que la history grossisse
 * indéfiniment dans le doc Firestore.
 */
export function capHistory<T>(history: T[], maxLength = 50): T[] {
  if (history.length <= maxLength) return history;
  return history.slice(0, maxLength);
}

/** Niveaux qui déclenchent l'auto-ajout aux courses. */
export const LOW_LEVELS: ReadonlyArray<"low" | "empty"> = ["low", "empty"];

export function shouldAutoReorder(
  previousLevel: string | undefined,
  newLevel: string,
): boolean {
  const wasLow = LOW_LEVELS.includes(previousLevel as "low" | "empty");
  const isLow = LOW_LEVELS.includes(newLevel as "low" | "empty");
  return !wasLow && isLow;
}
