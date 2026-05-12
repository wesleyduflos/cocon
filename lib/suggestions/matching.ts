import type { ChecklistTrigger } from "@/types/cocon";

export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Vérifie qu'un événement déclenche un trigger donné.
 * - Le keyword doit apparaître (normalisé) dans le titre + description
 * - L'événement doit être dans la fenêtre [now, now + daysBefore] (inclusif)
 *
 * Note : on n'inclut PAS les événements passés. Le trigger porte une
 * fenêtre d'anticipation, pas de rappel après l'événement.
 */
export function eventMatchesTrigger(
  event: {
    title: string;
    description?: string;
    startTime: Date;
  },
  trigger: ChecklistTrigger,
  now: Date,
): boolean {
  const haystack = normalizeForMatch(
    `${event.title} ${event.description ?? ""}`,
  );
  const needle = normalizeForMatch(trigger.keyword);
  if (!haystack.includes(needle)) return false;

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const daysUntil = Math.floor(
    (event.startTime.getTime() - startOfToday.getTime()) /
      (24 * 60 * 60 * 1000),
  );
  return daysUntil >= 0 && daysUntil <= trigger.daysBefore;
}

/**
 * Retourne le premier trigger du template qui match l'événement, ou null.
 */
export function findMatchingTrigger(
  event: {
    title: string;
    description?: string;
    startTime: Date;
  },
  triggers: ChecklistTrigger[] | undefined,
  now: Date,
): ChecklistTrigger | null {
  if (!triggers || triggers.length === 0) return null;
  return triggers.find((t) => eventMatchesTrigger(event, t, now)) ?? null;
}

/**
 * Déduplication : retourne true si une suggestion existante (en pending)
 * pour le même eventId + templateId existe déjà. On évite ainsi de créer
 * un doublon à chaque exécution du cron tant que la suggestion n'est pas
 * traitée par l'utilisateur.
 */
export function suggestionAlreadyExists(
  existing: Array<{
    triggerEventId: string;
    templateId: string;
    status: string;
  }>,
  eventId: string,
  templateId: string,
): boolean {
  return existing.some(
    (s) =>
      s.triggerEventId === eventId &&
      s.templateId === templateId &&
      s.status === "pending",
  );
}
