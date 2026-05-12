import type { JournalEntry, JournalEntryType, WithId } from "@/types/cocon";

/**
 * Génère le texte chaleureux d'une entry de journal selon son type.
 * Reste pur : pas d'accès Firestore, pas de Date.now().
 */
export function buildJournalText(
  entry: Pick<JournalEntry, "type" | "actorName" | "payload">,
): string {
  const actor = entry.actorName || "Quelqu'un";
  switch (entry.type) {
    case "task_completed":
      return `${actor} a terminé « ${entry.payload.taskTitle ?? "une tâche"} »`;
    case "preparation_launched": {
      const total = entry.payload.totalTasks ?? 0;
      return `${actor} a lancé la préparation ${entry.payload.templateEmoji ?? ""} ${entry.payload.templateName ?? "(sans nom)"} (${total} tâche${total !== 1 ? "s" : ""})`.trim();
    }
    case "preparation_completed": {
      const days = entry.payload.durationDays;
      const prefix = `Préparation ${entry.payload.templateEmoji ?? ""} ${entry.payload.templateName ?? "(sans nom)"} terminée`;
      if (typeof days === "number" && days > 0) {
        return `${prefix} en ${days} jour${days > 1 ? "s" : ""}`.trim();
      }
      return prefix.trim();
    }
    case "member_joined":
      return `${actor} a rejoint le cocon`;
    case "stock_renewed":
      return `${actor} a renouvelé le stock de ${entry.payload.stockName ?? "?"}`;
    case "memory_entry_added":
      return `${actor} a ajouté ${memoryArticle(entry.payload.memoryType as string | undefined)} « ${entry.payload.memoryTitle ?? "?"} »`;
    default:
      return `${actor} a fait quelque chose`;
  }
}

function memoryArticle(type: string | undefined): string {
  switch (type) {
    case "code":
      return "le code";
    case "object":
      return "l'objet";
    case "contact":
      return "le contact";
    case "manual":
      return "le manuel";
    case "warranty":
      return "la garantie";
    case "note":
      return "la note";
    default:
      return "l'entrée";
  }
}

export function iconForType(type: JournalEntryType): string {
  switch (type) {
    case "task_completed":
      return "✅";
    case "preparation_launched":
      return "🚀";
    case "preparation_completed":
      return "🎉";
    case "member_joined":
      return "🤝";
    case "stock_renewed":
      return "📦";
    case "memory_entry_added":
      return "📝";
    default:
      return "•";
  }
}

export interface JournalDayGroup {
  /** Clé "YYYY-MM-DD" (UTC évité, on reste en local). */
  key: string;
  label: string;
  entries: WithId<JournalEntry>[];
}

/**
 * Groupe les entries par jour calendaire local, plus récent en premier.
 * Le label utilise "Aujourd'hui" / "Hier" / "Lundi 12 mai" / "12 mai 2025".
 */
export function groupByDay(
  entries: WithId<JournalEntry>[],
  now: Date = new Date(),
): JournalDayGroup[] {
  const groups = new Map<string, JournalDayGroup>();
  for (const entry of entries) {
    const d = entry.createdAt.toDate();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, label: dayLabel(d, now), entries: [] };
      groups.set(key, group);
    }
    group.entries.push(entry);
  }
  return Array.from(groups.values()).sort((a, b) =>
    a.key < b.key ? 1 : a.key > b.key ? -1 : 0,
  );
}

const WEEKDAYS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];
const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dayLabel(d: Date, now: Date): string {
  const today = startOfDay(now);
  const target = startOfDay(d);
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays > 1 && diffDays < 7) {
    return `${WEEKDAYS[target.getDay()]} ${target.getDate()} ${MONTHS[target.getMonth()]}`;
  }
  if (target.getFullYear() === today.getFullYear()) {
    return `${target.getDate()} ${MONTHS[target.getMonth()]}`;
  }
  return `${target.getDate()} ${MONTHS[target.getMonth()]} ${target.getFullYear()}`;
}
