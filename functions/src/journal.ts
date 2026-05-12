import {
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

/* =========================================================================
   Journal du foyer — triggers Firestore qui matérialisent les événements
   significatifs en entries `journal-entries`.

   Règle anti-doublon : les tâches qui appartiennent à un checklist-run
   ne génèrent PAS de `task_completed` — la paire `preparation_launched` /
   `preparation_completed` couvre déjà ces moments dans le journal.

   Toggle : si `households/{id}.journalEnabled === false`, aucune entry
   n'est créée (mais les anciennes restent).
   ========================================================================= */

const REGION = "europe-west1";

interface JournalPayload {
  type:
    | "task_completed"
    | "preparation_launched"
    | "preparation_completed"
    | "member_joined"
    | "stock_renewed"
    | "memory_entry_added";
  actor: string;
  actorName: string;
  payload: Record<string, string | number | boolean>;
}

async function isJournalEnabled(householdId: string): Promise<boolean> {
  const snap = await getFirestore().doc(`households/${householdId}`).get();
  if (!snap.exists) return false;
  const enabled = snap.get("journalEnabled");
  // Off uniquement si explicitement à false (on par défaut)
  return enabled !== false;
}

async function fetchDisplayName(uid: string): Promise<string> {
  if (!uid) return "Quelqu'un";
  try {
    const snap = await getFirestore().doc(`users/${uid}`).get();
    const name = snap.get("displayName") as string | undefined;
    if (name && name.trim()) return name;
    const email = snap.get("email") as string | undefined;
    if (email) return email.split("@")[0];
  } catch {
    /* noop */
  }
  return "Quelqu'un";
}

async function writeJournalEntry(
  householdId: string,
  entry: JournalPayload,
): Promise<void> {
  if (!(await isJournalEnabled(householdId))) return;
  await getFirestore()
    .collection(`households/${householdId}/journal-entries`)
    .add({
      ...entry,
      createdAt: FieldValue.serverTimestamp(),
    });
}

/* =========================================================================
   task_completed : transition pending → done sur une tâche hors checklist-run
   ========================================================================= */

export const onTaskCompletedJournal = onDocumentUpdated(
  {
    document: "households/{householdId}/tasks/{taskId}",
    region: REGION,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status === "done" || after.status !== "done") return;
    // Filtre : tâches issues de checklist-runs → couvert par preparation_*
    if (after.checklistRunId) return;

    const householdId = event.params.householdId as string;
    const actor = (after.completedBy as string | undefined) ?? "";
    const actorName = await fetchDisplayName(actor);
    await writeJournalEntry(householdId, {
      type: "task_completed",
      actor,
      actorName,
      payload: {
        taskTitle: (after.title as string) ?? "(sans titre)",
        taskId: event.params.taskId as string,
      },
    });
  },
);

/* =========================================================================
   preparation_launched : nouveau checklist-run
   ========================================================================= */

export const onChecklistRunCreatedJournal = onDocumentCreated(
  {
    document: "households/{householdId}/checklist-runs/{runId}",
    region: REGION,
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const householdId = event.params.householdId as string;
    const actor = (data.startedBy as string | undefined) ?? "";
    const actorName = await fetchDisplayName(actor);
    await writeJournalEntry(householdId, {
      type: "preparation_launched",
      actor,
      actorName,
      payload: {
        templateName: (data.templateName as string) ?? "(sans nom)",
        templateEmoji: (data.templateEmoji as string) ?? "",
        totalTasks: (data.totalTasks as number) ?? 0,
        runId: event.params.runId as string,
      },
    });
  },
);

/* =========================================================================
   preparation_completed : checklist-run.completedAt vient d'être posé
   ========================================================================= */

export const onChecklistRunCompletedJournal = onDocumentUpdated(
  {
    document: "households/{householdId}/checklist-runs/{runId}",
    region: REGION,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.completedAt || !after.completedAt) return;

    const householdId = event.params.householdId as string;
    // Le "qui a complété" est celui qui a fini la dernière tâche : on
    // remonte vers le startedBy si on n'a pas mieux.
    const actor = (after.startedBy as string | undefined) ?? "";
    const actorName = await fetchDisplayName(actor);

    let durationDays = 0;
    const startedAt = after.startedAt as Timestamp | undefined;
    const completedAt = after.completedAt as Timestamp | undefined;
    if (startedAt && completedAt) {
      const ms = completedAt.toMillis() - startedAt.toMillis();
      durationDays = Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
    }

    await writeJournalEntry(householdId, {
      type: "preparation_completed",
      actor,
      actorName,
      payload: {
        templateName: (after.templateName as string) ?? "(sans nom)",
        templateEmoji: (after.templateEmoji as string) ?? "",
        durationDays,
        runId: event.params.runId as string,
      },
    });
  },
);

/* =========================================================================
   member_joined : nouveau membre dans households/{hid}/members
   ========================================================================= */

export const onMemberJoinedJournal = onDocumentCreated(
  {
    document: "households/{householdId}/members/{userId}",
    region: REGION,
  },
  async (event) => {
    const householdId = event.params.householdId as string;
    const userId = event.params.userId as string;
    // Ne journalise pas l'owner initial (créé au moment de la création
    // du household — pas vraiment un "joined").
    const householdSnap = await getFirestore()
      .doc(`households/${householdId}`)
      .get();
    const ownerId = householdSnap.get("ownerId") as string | undefined;
    const createdAt = householdSnap.get("createdAt") as Timestamp | undefined;
    if (ownerId === userId && createdAt) {
      // Si le membre est l'owner et le household a moins de 5 min,
      // c'est l'event "creation du cocon", on saute.
      const ageMs = Date.now() - createdAt.toMillis();
      if (ageMs < 5 * 60 * 1000) return;
    }
    const actorName = await fetchDisplayName(userId);
    await writeJournalEntry(householdId, {
      type: "member_joined",
      actor: userId,
      actorName,
      payload: {},
    });
  },
);

/* =========================================================================
   stock_renewed : stock.level passe à "full"
   ========================================================================= */

export const onStockRenewedJournal = onDocumentUpdated(
  {
    document: "households/{householdId}/stocks/{stockId}",
    region: REGION,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.level === "full" || after.level !== "full") return;

    const householdId = event.params.householdId as string;
    // L'auteur du changement de niveau est dans le premier élément
    // d'history (plus récent en premier — cf capHistory côté client).
    const history = (after.history as Array<Record<string, unknown>>) ?? [];
    const last = history[0];
    const actor = (last?.changedBy as string | undefined) ?? "";
    const actorName = await fetchDisplayName(actor);

    await writeJournalEntry(householdId, {
      type: "stock_renewed",
      actor,
      actorName,
      payload: {
        stockName: (after.name as string) ?? "(sans nom)",
        stockId: event.params.stockId as string,
      },
    });
  },
);

/* =========================================================================
   memory_entry_added : nouvelle entrée mémoire
   ========================================================================= */

export const onMemoryEntryAddedJournal = onDocumentCreated(
  {
    document: "households/{householdId}/memory-entries/{entryId}",
    region: REGION,
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const householdId = event.params.householdId as string;
    const actor = (data.createdBy as string | undefined) ?? "";
    const actorName = await fetchDisplayName(actor);
    await writeJournalEntry(householdId, {
      type: "memory_entry_added",
      actor,
      actorName,
      payload: {
        memoryTitle: (data.title as string) ?? "(sans titre)",
        memoryType: (data.type as string) ?? "note",
        entryId: event.params.entryId as string,
      },
    });
  },
);
