import { Timestamp } from "firebase/firestore";

/**
 * Sprint 6 — bloc I. Helpers de calcul de dueDate pour le swipe sur tâches
 * sans échéance. Toujours en timezone Europe/Paris (côté client, c'est le
 * timezone du navigateur, mais on l'explicite pour la robustesse).
 */

const TZ = "Europe/Paris";

/**
 * Retourne une Date représentant 23:59:59 du jour fourni dans la TZ Paris.
 * `dayOffset` est l'écart en jours par rapport à maintenant (0 = aujourd'hui,
 * 1 = demain).
 */
export function endOfDayInParis(reference: Date, dayOffset: number): Date {
  // On reconstruit la date locale (Paris) en parsant les composants Y/M/D
  // via Intl. Cela évite les bugs DST si l'utilisateur est en zone non-Paris.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(reference);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  // Construit en local — pour Cocon (utilisateurs en Paris), c'est correct.
  // Note : on accepte qu'un user à NY voie 23:59:59 dans son local time,
  // ce qui suffit pour les use-cases « today/tomorrow ».
  const target = new Date(year, month - 1, day + dayOffset, 23, 59, 59);
  return target;
}

export function dueDateToday(reference: Date = new Date()): Timestamp {
  return Timestamp.fromDate(endOfDayInParis(reference, 0));
}

export function dueDateTomorrow(reference: Date = new Date()): Timestamp {
  return Timestamp.fromDate(endOfDayInParis(reference, 1));
}
