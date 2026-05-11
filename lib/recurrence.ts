import { RRule, type Weekday } from "rrule";

/* =========================================================================
   Récurrence iCal RRULE — helpers purs et testables
   =========================================================================

   Format de référence : RFC 5545 / iCal.
   Exemples valides :
     - "FREQ=DAILY"
     - "FREQ=WEEKLY;BYDAY=TU"
     - "FREQ=WEEKLY;BYDAY=MO,WE,FR"
     - "FREQ=MONTHLY;BYMONTHDAY=15"

   Convention : nos RRULE n'ont pas de DTSTART ni UNTIL — la `dueDate` de
   la tâche est le point d'ancrage, la prochaine occurrence se calcule
   strictement APRÈS la dueDate courante.
   ========================================================================= */

export type RecurrencePreset = "daily" | "weekly" | "monthly" | "custom";

/** Jours de semaine façon RRULE (BYDAY values). */
export type RecurrenceWeekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

const WEEKDAY_RRULE_MAP: Record<RecurrenceWeekday, Weekday> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

const WEEKDAY_FR: Record<RecurrenceWeekday, string> = {
  MO: "lundi",
  TU: "mardi",
  WE: "mercredi",
  TH: "jeudi",
  FR: "vendredi",
  SA: "samedi",
  SU: "dimanche",
};

/* ------------------------------------------------------------------------- */
/*  Builders                                                                 */
/* ------------------------------------------------------------------------- */

export interface BuildRRuleInput {
  preset: RecurrencePreset;
  /** Pour "weekly" : jours d'occurrence (au moins un). */
  byDay?: RecurrenceWeekday[];
  /** Pour "monthly" : numéro du jour du mois (1-31). */
  byMonthDay?: number;
}

/**
 * Construit une chaîne RRULE à partir d'un preset UI. Retourne null si
 * le preset est "custom" sans paramètres (l'appelant doit fournir une
 * chaîne RRULE manuelle dans ce cas).
 */
export function buildRRule(input: BuildRRuleInput): string | null {
  switch (input.preset) {
    case "daily":
      return "FREQ=DAILY";
    case "weekly": {
      if (!input.byDay || input.byDay.length === 0) return null;
      return `FREQ=WEEKLY;BYDAY=${input.byDay.join(",")}`;
    }
    case "monthly": {
      const day = input.byMonthDay;
      if (!day || day < 1 || day > 31) return null;
      return `FREQ=MONTHLY;BYMONTHDAY=${day}`;
    }
    case "custom":
      return null;
  }
}

/* ------------------------------------------------------------------------- */
/*  Parsing                                                                  */
/* ------------------------------------------------------------------------- */

/**
 * Formate une Date en chaîne ICS sans timezone (format "floating" UTC).
 * Exemple : 2026-05-11T12:00:00Z → 20260511T120000Z
 */
function formatICSDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * Parse une RRULE en objet RRule. La chaîne `rule` est attendue au format
 * fragment ("FREQ=WEEKLY;BYDAY=TU"). On compose une string ICS complète
 * avec un DTSTART en UTC pour que rrule calcule de manière déterministe.
 */
function parseRRule(rule: string, anchor: Date): RRule {
  const fragment = rule.replace(/^RRULE:/, "");
  const ics = `DTSTART:${formatICSDate(anchor)}\nRRULE:${fragment}`;
  return RRule.fromString(ics);
}

/* ------------------------------------------------------------------------- */
/*  Calcul de la prochaine occurrence                                        */
/* ------------------------------------------------------------------------- */

/**
 * Retourne la prochaine date d'occurrence STRICTEMENT après `after`.
 * `anchor` est la dueDate courante de la tâche (point d'ancrage de la
 * série). Retourne null si la règle est invalide.
 */
export function getNextOccurrence(
  rule: string,
  anchor: Date,
  after: Date,
): Date | null {
  try {
    const r = parseRRule(rule, anchor);
    const next = r.after(after, false);
    return next ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------------- */
/*  Description humaine de la règle                                          */
/* ------------------------------------------------------------------------- */

/** Décrit une RRULE en français court ("Tous les mardis", "Le 15 du mois"). */
export function describeRRule(rule: string): string {
  // On parse à la main les composants courants — pas besoin de la lib
  // entière (rrule.toText est en anglais et l'i18n est lourde).
  const parts = rule.replace(/^RRULE:/, "").split(";");
  const params: Record<string, string> = {};
  for (const p of parts) {
    const [key, value] = p.split("=");
    if (key && value) params[key.trim().toUpperCase()] = value.trim();
  }

  const freq = params["FREQ"];
  if (freq === "DAILY") return "Tous les jours";
  if (freq === "WEEKLY") {
    const days = (params["BYDAY"] ?? "").split(",").filter(Boolean);
    if (days.length === 0) return "Toutes les semaines";
    if (days.length === 1) {
      const d = days[0] as RecurrenceWeekday;
      const name = WEEKDAY_FR[d] ?? d;
      // « Tous les mardis » — pluriel pour la récurrence en français
      return `Tous les ${name}s`;
    }
    return `Les ${days.map((d) => WEEKDAY_FR[d as RecurrenceWeekday] ?? d).join(", ")}`;
  }
  if (freq === "MONTHLY") {
    const day = params["BYMONTHDAY"];
    if (day) return `Le ${day} du mois`;
    return "Tous les mois";
  }
  return "Récurrente";
}

/* ------------------------------------------------------------------------- */
/*  Extraction des composants depuis une RRULE existante                     */
/*  (utile pour pré-remplir le formulaire d'édition)                         */
/* ------------------------------------------------------------------------- */

export interface RRuleComponents {
  preset: RecurrencePreset;
  byDay?: RecurrenceWeekday[];
  byMonthDay?: number;
}

export function extractRRuleComponents(rule: string): RRuleComponents {
  const parts = rule.replace(/^RRULE:/, "").split(";");
  const params: Record<string, string> = {};
  for (const p of parts) {
    const [key, value] = p.split("=");
    if (key && value) params[key.trim().toUpperCase()] = value.trim();
  }

  const freq = params["FREQ"];
  if (freq === "DAILY") return { preset: "daily" };
  if (freq === "WEEKLY") {
    const byDay = (params["BYDAY"] ?? "")
      .split(",")
      .filter(Boolean) as RecurrenceWeekday[];
    return { preset: "weekly", byDay };
  }
  if (freq === "MONTHLY") {
    const day = params["BYMONTHDAY"];
    return {
      preset: "monthly",
      byMonthDay: day ? Number(day) : undefined,
    };
  }
  return { preset: "custom" };
}

// On expose le mapping interne pour qu'un consommateur typé puisse traverser
// les jours sans dupliquer la liste.
export const WEEKDAY_VALUES: RecurrenceWeekday[] = [
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
  "SU",
];

// Helper interne exposé pour les tests éventuels — non utilisé directement
// hors du module.
export const _rruleWeekdayMap = WEEKDAY_RRULE_MAP;
