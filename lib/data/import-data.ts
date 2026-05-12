import { Timestamp } from "firebase/firestore";
import { addDoc, getDocs, deleteDoc } from "firebase/firestore";

import {
  checklistRunsCollection,
  checklistTemplatesCollection,
  householdCalendarEventsCollection,
  householdTasksCollection,
  journalEntriesCollection,
  memoryEntriesCollection,
  quickAddItemsCollection,
  shoppingItemsCollection,
  stocksCollection,
  suggestionsCollection,
} from "@/lib/firebase/firestore";

/* =========================================================================
   Import / clear data — sprint 5 polish

   Format de fichier identique à celui généré par /settings/export :
   JSON top-level avec `{tasks, shoppingItems, stocks, memoryEntries,
   checklistTemplates, calendarEvents, ...}`. Les Timestamps Firestore
   y sont sérialisés en ISO strings — on les reconvertit ici.

   Stratégie :
   - addDoc (nouveau Firestore ID) plutôt que setDoc avec l'ID original.
     Ça évite les collisions si on importe sur un foyer existant.
   - Skip les sous-collections générées par triggers (journalEntries,
     suggestions, checklistRuns) — elles seront re-créées par les triggers
     serveur quand les events de base seront importés.
   - Conversion ISO string → Timestamp pour tous les champs *At.
   ========================================================================= */

interface ExportPayload {
  tasks?: Array<Record<string, unknown>>;
  shoppingItems?: Array<Record<string, unknown>>;
  quickAddItems?: Array<Record<string, unknown>>;
  stocks?: Array<Record<string, unknown>>;
  memoryEntries?: Array<Record<string, unknown>>;
  checklistTemplates?: Array<Record<string, unknown>>;
  calendarEvents?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ImportReport {
  tasks: number;
  shoppingItems: number;
  quickAddItems: number;
  stocks: number;
  memoryEntries: number;
  checklistTemplates: number;
  calendarEvents: number;
}

// Champs qu'on veut interpréter comme Timestamps Firestore. Si la valeur
// est une string parseable en date, on convertit.
const TIMESTAMP_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "completedAt",
  "dueDate",
  "boughtAt",
  "addedAt",
  "lastRenewedAt",
  "predictedNextRenewalAt",
  "changedAt",
  "lastViewedAt",
  "startTime",
  "endTime",
  "startedAt",
  "triggerEventDate",
  "actedAt",
  "reminderSentAt",
]);

function isIsoLike(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(s);
}

function rehydrate(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === "id") continue; // on ignore l'id, addDoc en génère un
    if (typeof v === "string" && TIMESTAMP_FIELDS.has(k) && isIsoLike(v)) {
      const d = new Date(v);
      out[k] = Number.isNaN(d.getTime()) ? v : Timestamp.fromDate(d);
    } else if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        typeof item === "object" && item !== null
          ? rehydrateNested(item as Record<string, unknown>)
          : item,
      );
    } else if (v && typeof v === "object") {
      out[k] = rehydrateNested(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Pour les objets imbriqués (ex: stocks.history[].changedAt). */
function rehydrateNested(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "string" && TIMESTAMP_FIELDS.has(k) && isIsoLike(v)) {
      const d = new Date(v);
      out[k] = Number.isNaN(d.getTime()) ? v : Timestamp.fromDate(d);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function importSection<T extends Record<string, unknown>>(
  items: Array<Record<string, unknown>> | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collectionFn: (householdId: string) => any,
  householdId: string,
): Promise<number> {
  if (!items || items.length === 0) return 0;
  let count = 0;
  for (const item of items) {
    try {
      await addDoc(collectionFn(householdId), rehydrate(item) as unknown as T);
      count++;
    } catch {
      // Une entrée corrompue ne doit pas planter tout l'import
    }
  }
  return count;
}

export async function importHouseholdData(
  householdId: string,
  payload: ExportPayload,
): Promise<ImportReport> {
  const report: ImportReport = {
    tasks: await importSection(
      payload.tasks,
      householdTasksCollection,
      householdId,
    ),
    shoppingItems: await importSection(
      payload.shoppingItems,
      shoppingItemsCollection,
      householdId,
    ),
    quickAddItems: await importSection(
      payload.quickAddItems,
      quickAddItemsCollection,
      householdId,
    ),
    stocks: await importSection(
      payload.stocks,
      stocksCollection,
      householdId,
    ),
    memoryEntries: await importSection(
      payload.memoryEntries,
      memoryEntriesCollection,
      householdId,
    ),
    checklistTemplates: await importSection(
      payload.checklistTemplates,
      checklistTemplatesCollection,
      householdId,
    ),
    calendarEvents: await importSection(
      payload.calendarEvents,
      householdCalendarEventsCollection,
      householdId,
    ),
  };
  return report;
}

/* =========================================================================
   Clear : supprime toutes les sous-collections du foyer.

   Ne touche PAS le document household lui-même ni les profils users.
   ========================================================================= */

export interface ClearReport {
  tasks: number;
  shoppingItems: number;
  quickAddItems: number;
  stocks: number;
  memoryEntries: number;
  checklistTemplates: number;
  checklistRuns: number;
  calendarEvents: number;
  suggestions: number;
  journalEntries: number;
}

async function clearSection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collectionFn: (householdId: string) => any,
  householdId: string,
): Promise<number> {
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await getDocs(collectionFn(householdId));
    if (snap.empty) break;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promises = snap.docs.map((d: any) => deleteDoc(d.ref));
    await Promise.all(promises);
    total += snap.size;
    if (snap.size < 100) break;
  }
  return total;
}

export async function clearHouseholdData(
  householdId: string,
): Promise<ClearReport> {
  return {
    tasks: await clearSection(householdTasksCollection, householdId),
    shoppingItems: await clearSection(shoppingItemsCollection, householdId),
    quickAddItems: await clearSection(quickAddItemsCollection, householdId),
    stocks: await clearSection(stocksCollection, householdId),
    memoryEntries: await clearSection(memoryEntriesCollection, householdId),
    checklistTemplates: await clearSection(
      checklistTemplatesCollection,
      householdId,
    ),
    checklistRuns: await clearSection(checklistRunsCollection, householdId),
    calendarEvents: await clearSection(
      householdCalendarEventsCollection,
      householdId,
    ),
    suggestions: await clearSection(suggestionsCollection, householdId),
    journalEntries: await clearSection(journalEntriesCollection, householdId),
  };
}
