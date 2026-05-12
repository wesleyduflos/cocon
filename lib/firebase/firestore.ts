import {
  type CollectionReference,
  type DocumentReference,
  type FirestoreDataConverter,
  type Query,
  type QueryDocumentSnapshot,
  type Timestamp,
  Timestamp as FirestoreTimestamp,
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  DEFAULT_USER_PREFERENCES,
  type Attachment,
  type CalendarEvent,
  type ChecklistRun,
  type ChecklistTemplate,
  type ChecklistTemplateItem,
  type Household,
  type HouseholdMember,
  type Invitation,
  type JournalEntry,
  type MemoryEntry,
  type MemoryEntryType,
  type QuickAddItem,
  type ShoppingItem,
  type ShoppingRayon,
  type StockItem,
  type StockLevel,
  type Suggestion,
  type Task,
  type User,
  type UserPreferences,
  type WithId,
} from "@/types/cocon";

import { tokenize } from "@/lib/memory/tokenize";
import { capHistory, predictNextRenewal, shouldAutoReorder } from "@/lib/stocks";

import { auth, db } from "./client";
import { updateProfile } from "firebase/auth";

/* =========================================================================
   Converters Firestore — strict typing à la lecture/écriture
   ========================================================================= */

function makeConverter<T extends object>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T): Record<string, unknown> {
      return data as Record<string, unknown>;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      return snapshot.data() as T;
    },
  };
}

export const userConverter = makeConverter<User>();
export const householdConverter = makeConverter<Household>();
export const householdMemberConverter = makeConverter<HouseholdMember>();
export const taskConverter = makeConverter<Task>();
export const invitationConverter = makeConverter<Invitation>();
export const calendarEventConverter = makeConverter<CalendarEvent>();
export const shoppingItemConverter = makeConverter<ShoppingItem>();
export const quickAddItemConverter = makeConverter<QuickAddItem>();
export const attachmentConverter = makeConverter<Attachment>();
export const stockItemConverter = makeConverter<StockItem>();
export const memoryEntryConverter = makeConverter<MemoryEntry>();
export const checklistTemplateConverter = makeConverter<ChecklistTemplate>();
export const checklistTemplateItemConverter =
  makeConverter<ChecklistTemplateItem>();
export const checklistRunConverter = makeConverter<ChecklistRun>();
export const suggestionConverter = makeConverter<Suggestion>();
export const journalEntryConverter = makeConverter<JournalEntry>();

/* =========================================================================
   References typées
   ========================================================================= */

export function usersCollection(): CollectionReference<User> {
  return collection(db, "users").withConverter(userConverter);
}

export function userDoc(userId: string): DocumentReference<User> {
  return doc(db, "users", userId).withConverter(userConverter);
}

export function householdsCollection(): CollectionReference<Household> {
  return collection(db, "households").withConverter(householdConverter);
}

export function householdDoc(householdId: string): DocumentReference<Household> {
  return doc(db, "households", householdId).withConverter(householdConverter);
}

export function householdMembersCollection(
  householdId: string,
): CollectionReference<HouseholdMember> {
  return collection(db, "households", householdId, "members").withConverter(
    householdMemberConverter,
  );
}

export function householdMemberDoc(
  householdId: string,
  userId: string,
): DocumentReference<HouseholdMember> {
  return doc(
    db,
    "households",
    householdId,
    "members",
    userId,
  ).withConverter(householdMemberConverter);
}

export function householdTasksCollection(
  householdId: string,
): CollectionReference<Task> {
  return collection(db, "households", householdId, "tasks").withConverter(
    taskConverter,
  );
}

export function householdTaskDoc(
  householdId: string,
  taskId: string,
): DocumentReference<Task> {
  return doc(
    db,
    "households",
    householdId,
    "tasks",
    taskId,
  ).withConverter(taskConverter);
}

export function invitationsCollection(): CollectionReference<Invitation> {
  return collection(db, "invitations").withConverter(invitationConverter);
}

export function invitationDoc(token: string): DocumentReference<Invitation> {
  return doc(db, "invitations", token).withConverter(invitationConverter);
}

export function householdCalendarEventsCollection(
  householdId: string,
): CollectionReference<CalendarEvent> {
  return collection(
    db,
    "households",
    householdId,
    "calendar-events",
  ).withConverter(calendarEventConverter);
}

export function householdCalendarEventDoc(
  householdId: string,
  eventId: string,
): DocumentReference<CalendarEvent> {
  return doc(
    db,
    "households",
    householdId,
    "calendar-events",
    eventId,
  ).withConverter(calendarEventConverter);
}

export function shoppingItemsCollection(
  householdId: string,
): CollectionReference<ShoppingItem> {
  return collection(
    db,
    "households",
    householdId,
    "shopping-items",
  ).withConverter(shoppingItemConverter);
}

export function shoppingItemDoc(
  householdId: string,
  itemId: string,
): DocumentReference<ShoppingItem> {
  return doc(
    db,
    "households",
    householdId,
    "shopping-items",
    itemId,
  ).withConverter(shoppingItemConverter);
}

export function quickAddItemsCollection(
  householdId: string,
): CollectionReference<QuickAddItem> {
  return collection(
    db,
    "households",
    householdId,
    "quick-add-items",
  ).withConverter(quickAddItemConverter);
}

export function quickAddItemDoc(
  householdId: string,
  itemId: string,
): DocumentReference<QuickAddItem> {
  return doc(
    db,
    "households",
    householdId,
    "quick-add-items",
    itemId,
  ).withConverter(quickAddItemConverter);
}

export function attachmentsCollection(
  householdId: string,
): CollectionReference<Attachment> {
  return collection(
    db,
    "households",
    householdId,
    "attachments",
  ).withConverter(attachmentConverter);
}

export function stocksCollection(
  householdId: string,
): CollectionReference<StockItem> {
  return collection(db, "households", householdId, "stocks").withConverter(
    stockItemConverter,
  );
}

export function stockDoc(
  householdId: string,
  stockId: string,
): DocumentReference<StockItem> {
  return doc(db, "households", householdId, "stocks", stockId).withConverter(
    stockItemConverter,
  );
}

export function memoryEntriesCollection(
  householdId: string,
): CollectionReference<MemoryEntry> {
  return collection(
    db,
    "households",
    householdId,
    "memory-entries",
  ).withConverter(memoryEntryConverter);
}

export function memoryEntryDoc(
  householdId: string,
  entryId: string,
): DocumentReference<MemoryEntry> {
  return doc(
    db,
    "households",
    householdId,
    "memory-entries",
    entryId,
  ).withConverter(memoryEntryConverter);
}

export function checklistTemplatesCollection(
  householdId: string,
): CollectionReference<ChecklistTemplate> {
  return collection(
    db,
    "households",
    householdId,
    "checklist-templates",
  ).withConverter(checklistTemplateConverter);
}

export function checklistTemplateDoc(
  householdId: string,
  templateId: string,
): DocumentReference<ChecklistTemplate> {
  return doc(
    db,
    "households",
    householdId,
    "checklist-templates",
    templateId,
  ).withConverter(checklistTemplateConverter);
}

export function checklistTemplateItemsCollection(
  householdId: string,
  templateId: string,
): CollectionReference<ChecklistTemplateItem> {
  return collection(
    db,
    "households",
    householdId,
    "checklist-templates",
    templateId,
    "items",
  ).withConverter(checklistTemplateItemConverter);
}

export function checklistRunsCollection(
  householdId: string,
): CollectionReference<ChecklistRun> {
  return collection(
    db,
    "households",
    householdId,
    "checklist-runs",
  ).withConverter(checklistRunConverter);
}

export function checklistRunDoc(
  householdId: string,
  runId: string,
): DocumentReference<ChecklistRun> {
  return doc(
    db,
    "households",
    householdId,
    "checklist-runs",
    runId,
  ).withConverter(checklistRunConverter);
}

export function suggestionsCollection(
  householdId: string,
): CollectionReference<Suggestion> {
  return collection(
    db,
    "households",
    householdId,
    "suggestions",
  ).withConverter(suggestionConverter);
}

export function suggestionDoc(
  householdId: string,
  suggestionId: string,
): DocumentReference<Suggestion> {
  return doc(
    db,
    "households",
    householdId,
    "suggestions",
    suggestionId,
  ).withConverter(suggestionConverter);
}

export function journalEntriesCollection(
  householdId: string,
): CollectionReference<JournalEntry> {
  return collection(
    db,
    "households",
    householdId,
    "journal-entries",
  ).withConverter(journalEntryConverter);
}

export function journalEntryDoc(
  householdId: string,
  entryId: string,
): DocumentReference<JournalEntry> {
  return doc(
    db,
    "households",
    householdId,
    "journal-entries",
    entryId,
  ).withConverter(journalEntryConverter);
}

export async function dismissSuggestion(
  householdId: string,
  suggestionId: string,
  userId: string,
): Promise<void> {
  await updateDoc(suggestionDoc(householdId, suggestionId), {
    status: "dismissed",
    dismissedBy: userId,
  });
}

export async function acceptSuggestion(
  householdId: string,
  suggestionId: string,
  userId: string,
): Promise<void> {
  await updateDoc(suggestionDoc(householdId, suggestionId), {
    status: "accepted",
    actedBy: userId,
    actedAt: serverTimestamp(),
  });
}

/**
 * Charge une page d'entries du journal (chronologique inversé).
 * Si `before` est fourni, retourne les entries strictement plus anciennes.
 */
export async function listJournalEntries(
  householdId: string,
  options: { limit?: number; before?: Timestamp } = {},
): Promise<WithId<JournalEntry>[]> {
  const base = query(
    journalEntriesCollection(householdId),
    orderBy("createdAt", "desc"),
  );
  const constrained = options.before
    ? query(base, where("createdAt", "<", options.before))
    : base;
  const limited = query(constrained, limit(options.limit ?? 30));
  const snap = await getDocs(limited);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

/**
 * Efface toutes les entries du journal d'un cocon.
 * Utilisé par "Effacer le journal" dans les paramètres (double opt-in côté UI).
 */
export async function clearJournalEntries(
  householdId: string,
): Promise<number> {
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await getDocs(
      query(
        journalEntriesCollection(householdId),
        orderBy("createdAt", "desc"),
        limit(400),
      ),
    );
    if (snap.empty) break;
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    total += snap.size;
    if (snap.size < 400) break;
  }
  return total;
}

/* =========================================================================
   Helpers de création / mise à jour
   ========================================================================= */

export interface CreateUserInput {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

/**
 * Crée le document `users/{uid}` à la première connexion.
 * `serverTimestamp()` est utilisé pour `createdAt` (cohérence multi-clients).
 */
export async function createUserDoc(input: CreateUserInput): Promise<void> {
  const userRef = userDoc(input.uid);
  await setDoc(userRef, {
    email: input.email,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    createdAt: serverTimestamp() as unknown as Timestamp,
    preferences: DEFAULT_USER_PREFERENCES,
  });
}

/**
 * Met à jour le displayName d'un user.
 *
 * Firestore est la source de vérité (lue par useCurrentUserProfile via
 * onSnapshot), mais on synchronise aussi Firebase Auth en best-effort
 * pour les anciens composants qui pourraient lire `auth.currentUser.displayName`
 * (cf gotcha #24).
 */
export async function updateUserDisplayName(
  uid: string,
  displayName: string,
): Promise<void> {
  await updateDoc(userDoc(uid), { displayName });
  // Sync best-effort Firebase Auth si on update le current user
  if (auth.currentUser?.uid === uid) {
    try {
      await updateProfile(auth.currentUser, { displayName });
    } catch {
      // Si ça plante, pas grave — Firestore reste source de vérité
    }
  }
}

/**
 * Met à jour l'emoji avatar du user (sprint 5 polish).
 * Passe `""` ou `undefined` pour le retirer (fallback initiale ensuite).
 */
export async function updateUserAvatarEmoji(
  uid: string,
  emoji: string | undefined,
): Promise<void> {
  const value = emoji?.trim();
  await updateDoc(userDoc(uid), {
    avatarEmoji: value && value.length > 0 ? value : deleteField(),
  });
}

/**
 * Met à jour partiellement les préférences d'un user (theme, quiet hours,
 * etc.). Le doc est lu d'abord pour merger avec les préférences existantes.
 */
export async function updateUserPreferences(
  uid: string,
  patch: Partial<UserPreferences>,
): Promise<void> {
  const snap = await getDoc(userDoc(uid));
  const current = snap.data()?.preferences ?? DEFAULT_USER_PREFERENCES;
  await updateDoc(userDoc(uid), {
    preferences: { ...current, ...patch },
  });
}

/**
 * Met à jour le nom et/ou l'emoji d'un cocon. Seul l'owner peut le faire
 * (vérifié côté rules).
 */
export async function updateHousehold(
  householdId: string,
  patch: Partial<
    Pick<Household, "name" | "emoji" | "balanceEnabled" | "journalEnabled">
  >,
): Promise<void> {
  await updateDoc(householdDoc(householdId), patch);
}

export interface CreateHouseholdInput {
  name: string;
  emoji?: string;
  ownerId: string;
}

/**
 * Crée un nouveau cocon avec son owner comme premier membre.
 * Retourne le `householdId` généré.
 *
 * Note : on n'écrit pas la sous-collection `members/{ownerId}` ici — cela
 * sera fait dans un second appel (ou idéalement dans une transaction quand
 * on aura besoin de garantir l'atomicité). Pour le sprint 1, l'écriture
 * séquentielle est suffisante.
 */
export async function createHousehold(
  input: CreateHouseholdInput,
): Promise<string> {
  const ref = await addDoc(householdsCollection(), {
    name: input.name,
    emoji: input.emoji,
    ownerId: input.ownerId,
    memberIds: [input.ownerId],
    invitations: {},
    createdAt: serverTimestamp() as unknown as Timestamp,
  });

  await setDoc(householdMemberDoc(ref.id, input.ownerId), {
    userId: input.ownerId,
    role: "owner",
    joinedAt: serverTimestamp() as unknown as Timestamp,
  });

  // Seed des defaults (8 essentiels + 7 templates de préparation). On le
  // fait fire-and-forget : un échec ici ne doit pas casser la création
  // du cocon (les helpers reseed* depuis /settings/cocon permettent de
  // rattraper plus tard).
  Promise.all([
    seedQuickAddItems(ref.id),
    seedChecklistTemplates(ref.id),
  ]).catch((err) => {
    console.warn("[createHousehold] seed defaults failed:", err);
  });

  return ref.id;
}

export interface CreateTaskInput {
  title: string;
  createdBy: string;
  description?: string;
  category?: string;
  assigneeId?: string;
  effort?: Task["effort"];
  dueDate?: Timestamp;
  recurrenceRule?: string;
  priority?: boolean;
  notes?: string;
}

/**
 * Crée une tâche dans un cocon, avec `status: 'pending'` par défaut.
 * Retourne le `taskId` généré.
 */
export async function createTask(
  householdId: string,
  input: CreateTaskInput,
): Promise<string> {
  const ref = await addDoc(householdTasksCollection(householdId), {
    title: input.title,
    description: input.description,
    category: input.category,
    assigneeId: input.assigneeId,
    effort: input.effort,
    status: "pending",
    priority: input.priority ?? false,
    dueDate: input.dueDate,
    recurrenceRule: input.recurrenceRule,
    notes: input.notes,
    createdBy: input.createdBy,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  });
  return ref.id;
}

/**
 * Marque une tâche comme complétée (status + completedAt + completedBy + updatedAt).
 */
export async function completeTask(
  householdId: string,
  taskId: string,
  userId: string,
): Promise<void> {
  await updateDoc(householdTaskDoc(householdId, taskId), {
    status: "done",
    completedAt: serverTimestamp() as unknown as Timestamp,
    completedBy: userId,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  });
}

/**
 * Annule la complétion d'une tâche (status repasse à pending, on efface
 * completedAt / completedBy plutôt que de les laisser à des valeurs orphelines).
 */
export async function uncompleteTask(
  householdId: string,
  taskId: string,
): Promise<void> {
  await updateDoc(householdTaskDoc(householdId, taskId), {
    status: "pending",
    completedAt: deleteField(),
    completedBy: deleteField(),
    updatedAt: serverTimestamp() as unknown as Timestamp,
  });
}

/**
 * Complétion d'une tâche récurrente : crée un doc "done" figé pour
 * l'historique et avance la dueDate du doc actif sur la prochaine
 * occurrence calculée via RRULE. Si le calcul de la prochaine occurrence
 * échoue (ou pas de dueDate), retombe sur completeTask classique.
 *
 * Retourne la prochaine date d'occurrence (utile pour le toast).
 */
export async function completeRecurringTask(
  householdId: string,
  task: WithId<Task>,
  userId: string,
  nextOccurrence: Date,
): Promise<void> {
  if (!task.dueDate || !task.recurrenceRule) {
    await completeTask(householdId, task.id, userId);
    return;
  }

  await runTransaction(db, async (tx) => {
    const activeRef = householdTaskDoc(householdId, task.id);
    const cloneRef = doc(householdTasksCollection(householdId));

    // Doc figé pour l'historique : reprend les champs métier de la tâche
    // mais sans la RRULE (l'instance complétée n'a pas vocation à se
    // reproduire) et avec recurrenceSeriesId pointant vers le doc actif.
    tx.set(cloneRef, {
      title: task.title,
      description: task.description,
      category: task.category,
      assigneeId: task.assigneeId,
      effort: task.effort,
      status: "done",
      dueDate: task.dueDate,
      completedAt: serverTimestamp() as unknown as Timestamp,
      completedBy: userId,
      recurrenceSeriesId: task.id,
      notes: task.notes,
      attachmentIds: task.attachmentIds,
      createdAt: serverTimestamp() as unknown as Timestamp,
      createdBy: task.createdBy,
      updatedAt: serverTimestamp() as unknown as Timestamp,
    });

    // Doc actif : on avance la dueDate et on garde le statut pending.
    tx.update(activeRef, {
      dueDate: FirestoreTimestamp.fromDate(nextOccurrence),
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Met à jour un sous-ensemble des champs d'une tâche. `updatedAt` est
 * automatiquement positionné par serverTimestamp.
 */
export async function updateTask(
  householdId: string,
  taskId: string,
  partial: Partial<Omit<Task, "createdAt" | "createdBy">>,
): Promise<void> {
  await updateDoc(householdTaskDoc(householdId, taskId), {
    ...partial,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  });
}

/** Suppression définitive d'une tâche. */
export async function deleteTask(
  householdId: string,
  taskId: string,
): Promise<void> {
  await deleteDoc(householdTaskDoc(householdId, taskId));
}

/* =========================================================================
   Shopping items
   ========================================================================= */

export interface CreateShoppingItemInput {
  name: string;
  rayon: ShoppingRayon;
  addedBy: string;
  emoji?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  fromQuickAdd?: boolean;
  fromStockAuto?: boolean;
  stockItemId?: string;
}

export async function createShoppingItem(
  householdId: string,
  input: CreateShoppingItemInput,
): Promise<string> {
  const ref = await addDoc(shoppingItemsCollection(householdId), {
    name: input.name,
    emoji: input.emoji,
    quantity: input.quantity ?? 1,
    unit: input.unit,
    rayon: input.rayon,
    notes: input.notes,
    status: "pending",
    fromQuickAdd: input.fromQuickAdd ?? false,
    fromStockAuto: input.fromStockAuto,
    stockItemId: input.stockItemId,
    addedBy: input.addedBy,
    addedAt: serverTimestamp() as unknown as Timestamp,
  });
  return ref.id;
}

export async function incrementShoppingItemQuantity(
  householdId: string,
  itemId: string,
  by = 1,
): Promise<void> {
  // L'app affichant la liste en realtime, on lit puis on écrit ;
  // l'incrément Firestore est dispo mais on garde un set transactionnel
  // pour respecter ignoreUndefinedProperties.
  const ref = shoppingItemDoc(householdId, itemId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const current = snap.data().quantity ?? 1;
    tx.update(ref, { quantity: current + by });
  });
}

export async function checkShoppingItem(
  householdId: string,
  itemId: string,
  userId: string,
): Promise<void> {
  // 1) Marquer comme acheté
  await updateDoc(shoppingItemDoc(householdId, itemId), {
    status: "bought",
    boughtAt: serverTimestamp() as unknown as Timestamp,
    boughtBy: userId,
  });

  // 2) Si l'item est lié à un stock, repasser ce stock à 'full'.
  //    On lit le doc après l'update pour récupérer stockItemId (l'écriture
  //    précédente est déjà committée donc on a la donnée à jour).
  const snap = await getDoc(shoppingItemDoc(householdId, itemId));
  const stockItemId = snap.data()?.stockItemId;
  if (stockItemId) {
    try {
      await updateStockLevel(householdId, stockItemId, "full", userId);
    } catch {
      // Soft-fail : si le stock a été supprimé entre-temps, on n'empêche
      // pas la complétion du shopping-item.
    }
  }
}

export async function uncheckShoppingItem(
  householdId: string,
  itemId: string,
): Promise<void> {
  await updateDoc(shoppingItemDoc(householdId, itemId), {
    status: "pending",
    boughtAt: deleteField(),
    boughtBy: deleteField(),
  });
}

export async function deleteShoppingItem(
  householdId: string,
  itemId: string,
): Promise<void> {
  await deleteDoc(shoppingItemDoc(householdId, itemId));
}

export async function updateShoppingItemNotes(
  householdId: string,
  itemId: string,
  notes: string,
): Promise<void> {
  await updateDoc(shoppingItemDoc(householdId, itemId), {
    notes: notes.trim() || deleteField(),
    noteSeenBy: deleteField(), // reset les "vues" à chaque édition
  });
}

/**
 * Met à jour un sous-ensemble des champs d'un article de courses
 * (sprint 5 B.2). Le status (pending/bought) n'est pas modifiable ici —
 * on a checkShoppingItem / uncheckShoppingItem dédiés.
 */
export async function updateShoppingItem(
  householdId: string,
  itemId: string,
  patch: Partial<
    Pick<
      ShoppingItem,
      "name" | "emoji" | "quantity" | "unit" | "rayon" | "notes"
    >
  >,
): Promise<void> {
  await updateDoc(shoppingItemDoc(householdId, itemId), patch);
}

/* =========================================================================
   Stocks
   ========================================================================= */

export interface CreateStockInput {
  name: string;
  level: StockLevel;
  createdBy: string;
  emoji?: string;
  linkedQuickAddItemId?: string;
}

export async function createStockItem(
  householdId: string,
  input: CreateStockInput,
): Promise<string> {
  const now = serverTimestamp() as unknown as Timestamp;
  const ref = await addDoc(stocksCollection(householdId), {
    name: input.name,
    emoji: input.emoji,
    level: input.level,
    linkedQuickAddItemId: input.linkedQuickAddItemId,
    history: [],
    lastRenewedAt: input.level === "full" ? now : undefined,
    createdBy: input.createdBy,
    createdAt: now,
  });
  return ref.id;
}

/**
 * Met à jour le niveau d'un stock :
 * - append à `history` (capped 50)
 * - si new level === "full" : pose lastRenewedAt
 * - recalcule predictedNextRenewalAt
 * - si new level passe à low/empty (et que c'était pas déjà le cas) ET un
 *   linkedQuickAddItem est défini → auto-ajoute aux courses avec
 *   fromStockAuto=true et stockItemId=<this stock id>.
 *   N'auto-ajoute pas s'il y a déjà un shopping-item pending pour ce stock.
 */
export async function updateStockLevel(
  householdId: string,
  stockId: string,
  newLevel: StockLevel,
  userId: string,
): Promise<void> {
  const ref = stockDoc(householdId, stockId);

  let triggerAutoReorder = false;
  let linkedQuickAddItemId: string | undefined;
  let stockSnapshot: StockItem | undefined;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("Stock introuvable.");
    }
    const data = snap.data();
    stockSnapshot = data;

    const newEntry = {
      level: newLevel,
      changedAt: FirestoreTimestamp.now(),
      changedBy: userId,
    };
    const newHistory = capHistory([newEntry, ...(data.history ?? [])], 50);

    const update: Partial<StockItem> = {
      level: newLevel,
      history: newHistory,
    };
    if (newLevel === "full") {
      update.lastRenewedAt = FirestoreTimestamp.now();
    }
    const predicted = predictNextRenewal(newHistory);
    if (predicted) {
      update.predictedNextRenewalAt = FirestoreTimestamp.fromDate(predicted);
    }

    triggerAutoReorder = shouldAutoReorder(data.level, newLevel);
    linkedQuickAddItemId = data.linkedQuickAddItemId;

    tx.update(ref, update);
  });

  if (triggerAutoReorder && stockSnapshot) {
    // Vérifier qu'on n'a pas déjà un pending shopping-item pour ce stock
    const existing = await getDocs(
      query(
        shoppingItemsCollection(householdId),
        where("stockItemId", "==", stockId),
        where("status", "==", "pending"),
      ),
    );
    if (existing.empty) {
      // Résolution du rayon :
      // 1) Si linkedQuickAddItemId set → utilise le quick-add lié
      // 2) Sinon, essaie de trouver un quick-add avec le même nom
      // 3) Sinon, "Autre"
      let rayon: ShoppingRayon = "Autre";
      let unit: string | undefined;

      if (linkedQuickAddItemId) {
        const qaSnap = await getDoc(
          quickAddItemDoc(householdId, linkedQuickAddItemId),
        );
        const qa = qaSnap.data();
        if (qa) {
          rayon = qa.defaultRayon ?? "Autre";
          unit = qa.defaultUnit;
        }
      } else {
        // Fallback : matching par nom case-insensitive
        const allQa = await getDocs(quickAddItemsCollection(householdId));
        const normalizedStockName = stockSnapshot.name.toLowerCase().trim();
        for (const qaDoc of allQa.docs) {
          const qa = qaDoc.data();
          if (qa.name?.toLowerCase().trim() === normalizedStockName) {
            rayon = qa.defaultRayon ?? "Autre";
            unit = qa.defaultUnit;
            break;
          }
        }
      }

      await createShoppingItem(householdId, {
        name: stockSnapshot.name,
        emoji: stockSnapshot.emoji,
        rayon,
        unit,
        addedBy: userId,
        fromStockAuto: true,
        stockItemId: stockId,
      });
    }
  }
}

export async function deleteStockItem(
  householdId: string,
  stockId: string,
): Promise<void> {
  await deleteDoc(stockDoc(householdId, stockId));
}

/**
 * Mise à jour des champs métadata d'un stock (sprint 5 B.3) : nom,
 * emoji, lien à un quick-add. Le `level` passe TOUJOURS par
 * updateStockLevel pour préserver l'history et le mécanisme
 * d'auto-reorder.
 */
export async function updateStockItem(
  householdId: string,
  stockId: string,
  patch: Partial<
    Pick<StockItem, "name" | "emoji" | "linkedQuickAddItemId">
  >,
): Promise<void> {
  await updateDoc(stockDoc(householdId, stockId), patch);
}

/* =========================================================================
   Memory entries
   ========================================================================= */

export interface CreateMemoryEntryInput {
  type: MemoryEntryType;
  title: string;
  createdBy: string;
  emoji?: string;
  pinned?: boolean;
  structuredData?: MemoryEntry["structuredData"];
  tags?: string[];
  isSensitive?: boolean;
}

function buildSearchTokens(
  input: Pick<CreateMemoryEntryInput, "title" | "tags" | "structuredData">,
): string[] {
  const parts: string[] = [input.title];
  if (input.tags) parts.push(...input.tags);
  if (input.structuredData) {
    for (const value of Object.values(input.structuredData)) {
      if (typeof value === "string") parts.push(value);
    }
  }
  const tokens = parts.flatMap((p) => tokenize(p));
  return Array.from(new Set(tokens));
}

export async function createMemoryEntry(
  householdId: string,
  input: CreateMemoryEntryInput,
): Promise<string> {
  const now = serverTimestamp() as unknown as Timestamp;
  const ref = await addDoc(memoryEntriesCollection(householdId), {
    type: input.type,
    title: input.title,
    emoji: input.emoji,
    pinned: input.pinned ?? false,
    structuredData: input.structuredData ?? {},
    tags: input.tags ?? [],
    searchTokens: buildSearchTokens(input),
    isSensitive: input.isSensitive ?? false,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateMemoryEntry(
  householdId: string,
  entryId: string,
  patch: Partial<
    Pick<
      MemoryEntry,
      | "title"
      | "emoji"
      | "pinned"
      | "pinnedOrder"
      | "structuredData"
      | "tags"
      | "isSensitive"
    >
  >,
): Promise<void> {
  const update: Record<string, unknown> = {
    ...patch,
    updatedAt: serverTimestamp(),
  };
  // Recalculer les tokens si title, tags ou structuredData ont changé
  if (
    "title" in patch ||
    "tags" in patch ||
    "structuredData" in patch
  ) {
    const currentSnap = await getDoc(memoryEntryDoc(householdId, entryId));
    const current = currentSnap.data();
    if (current) {
      update.searchTokens = buildSearchTokens({
        title: patch.title ?? current.title,
        tags: patch.tags ?? current.tags,
        structuredData: patch.structuredData ?? current.structuredData,
      });
    }
  }
  await updateDoc(memoryEntryDoc(householdId, entryId), update);
}

export async function deleteMemoryEntry(
  householdId: string,
  entryId: string,
): Promise<void> {
  await deleteDoc(memoryEntryDoc(householdId, entryId));
}

export async function markMemoryEntryViewed(
  householdId: string,
  entryId: string,
): Promise<void> {
  await updateDoc(memoryEntryDoc(householdId, entryId), {
    lastViewedAt: serverTimestamp(),
  });
}

/* =========================================================================
   Quick-add items (grille des essentiels)
   ========================================================================= */

/* =========================================================================
   Checklist templates — seed des 7 défauts + lancement
   ========================================================================= */

interface SeedTemplate {
  name: string;
  emoji: string;
  description: string;
  items: string[];
  triggers?: Array<{ keyword: string; daysBefore: number }>;
}

const DEFAULT_CHECKLIST_TEMPLATES: SeedTemplate[] = [
  {
    name: "Avant les vacances",
    emoji: "🌴",
    description:
      "À faire dans les jours qui précèdent un départ pour ne rien oublier.",
    items: [
      "Arroser les plantes",
      "Vider le frigo",
      "Sortir les poubelles",
      "Fermer les volets",
      "Débrancher la box",
      "Vérifier les passeports",
      "Programmer le thermostat",
      "Prévenir la voisine",
    ],
    triggers: [
      { keyword: "vacances", daysBefore: 5 },
      { keyword: "départ", daysBefore: 5 },
    ],
  },
  {
    name: "Soirée à la maison",
    emoji: "🥂",
    description: "Préparer le salon et l'apéro pour recevoir.",
    items: [
      "Ranger le salon",
      "Faire les courses apéro",
      "Préparer une playlist",
      "Sortir les verres et la vaisselle",
      "Vérifier les toilettes",
      "Allumer les bougies",
    ],
    triggers: [
      { keyword: "soirée", daysBefore: 1 },
      { keyword: "apéro", daysBefore: 1 },
      { keyword: "dîner", daysBefore: 1 },
    ],
  },
  {
    name: "Week-end",
    emoji: "🎒",
    description: "Petits réflexes avant de partir 2-3 jours.",
    items: [
      "Préparer le sac",
      "Vérifier essence et billets",
      "Programmer l'alarme",
      "Sortir les poubelles",
    ],
    triggers: [
      { keyword: "week-end", daysBefore: 1 },
      { keyword: "weekend", daysBefore: 1 },
    ],
  },
  {
    name: "Routine du matin",
    emoji: "🌅",
    description: "Petits gestes pour bien démarrer.",
    items: ["Aérer la chambre", "Faire le lit", "Hydrater les plantes"],
  },
  {
    name: "Routine du soir",
    emoji: "🌙",
    description: "Pour se coucher l'esprit léger.",
    items: ["Vaisselle", "Fermer la maison", "Charger les téléphones"],
  },
  {
    name: "Réception d'invités",
    emoji: "🏠",
    description: "Préparer la chambre d'amis et les essentiels.",
    items: [
      "Préparer la chambre amis",
      "Draps propres",
      "Serviettes",
      "Papier toilettes",
      "Vider les poubelles",
    ],
    triggers: [
      { keyword: "invités", daysBefore: 2 },
      { keyword: "famille", daysBefore: 2 },
      { keyword: "amis", daysBefore: 2 },
    ],
  },
  {
    name: "Long voyage",
    emoji: "✈️",
    description: "En plus du contenu de Vacances.",
    items: [
      "Vérifier visa et vaccins",
      "Préparer les devises",
      "Suspendre abonnements",
      "Copie passeport scannée",
    ],
    triggers: [
      { keyword: "voyage", daysBefore: 7 },
      { keyword: "vol", daysBefore: 7 },
      { keyword: "avion", daysBefore: 7 },
      { keyword: "train", daysBefore: 7 },
    ],
  },
];

/**
 * Seed des 7 checklist templates par défaut (cf screens-spec §3.10.3).
 * Idempotent : retourne 0 si la collection contient déjà des templates,
 * sauf si `force=true` qui supprime tout et reseed.
 */
export async function seedChecklistTemplates(
  householdId: string,
  options: { force?: boolean } = {},
): Promise<{ created: number }> {
  const existing = await getDocs(checklistTemplatesCollection(householdId));
  if (existing.size > 0 && !options.force) {
    return { created: 0 };
  }
  if (existing.size > 0 && options.force) {
    // On supprime aussi les sous-collections items
    for (const t of existing.docs) {
      const items = await getDocs(
        checklistTemplateItemsCollection(householdId, t.id),
      );
      await Promise.all(items.docs.map((i) => deleteDoc(i.ref)));
      await deleteDoc(t.ref);
    }
  }

  await Promise.all(
    DEFAULT_CHECKLIST_TEMPLATES.map(async (t) => {
      const now = serverTimestamp() as unknown as Timestamp;
      const tRef = await addDoc(checklistTemplatesCollection(householdId), {
        name: t.name,
        emoji: t.emoji,
        description: t.description,
        triggers: t.triggers ?? [],
        isSeeded: true,
        createdAt: now,
        updatedAt: now,
      });
      await Promise.all(
        t.items.map((title, idx) =>
          addDoc(
            checklistTemplateItemsCollection(householdId, tRef.id),
            { position: idx, title },
          ),
        ),
      );
    }),
  );

  return { created: DEFAULT_CHECKLIST_TEMPLATES.length };
}

/**
 * Lance un template : crée un checklist-run + crée N tasks pending avec
 * checklistRunId set sur chacune. Retourne le runId.
 */
export async function launchChecklistRun(
  householdId: string,
  templateId: string,
  startedBy: string,
): Promise<string> {
  const [tSnap, itemsSnap] = await Promise.all([
    getDoc(checklistTemplateDoc(householdId, templateId)),
    getDocs(checklistTemplateItemsCollection(householdId, templateId)),
  ]);
  if (!tSnap.exists()) {
    throw new Error("Template introuvable.");
  }
  const template = tSnap.data();
  const items = itemsSnap.docs
    .map((d) => d.data())
    .sort((a, b) => a.position - b.position);

  // Créer le run
  const now = serverTimestamp() as unknown as Timestamp;
  const runRef = await addDoc(checklistRunsCollection(householdId), {
    templateId,
    templateName: template.name,
    templateEmoji: template.emoji,
    startedAt: now,
    startedBy,
    totalTasks: items.length,
    completedTasks: 0,
  });

  // Créer les tasks
  await Promise.all(
    items.map((item) =>
      addDoc(householdTasksCollection(householdId), {
        title: item.title,
        assigneeId: item.defaultAssigneeId,
        notes: item.notes,
        status: "pending",
        checklistRunId: runRef.id,
        createdBy: startedBy,
        createdAt: now,
        updatedAt: now,
      }),
    ),
  );

  return runRef.id;
}

export async function markRunCompleted(
  householdId: string,
  runId: string,
  completedTasks: number,
): Promise<void> {
  await updateDoc(checklistRunDoc(householdId, runId), {
    completedTasks,
    completedAt: serverTimestamp(),
  });
}

export async function updateRunProgress(
  householdId: string,
  runId: string,
  completedTasks: number,
): Promise<void> {
  await updateDoc(checklistRunDoc(householdId, runId), { completedTasks });
}

/** Les 8 essentiels seedés à la création d'un cocon. */
export const DEFAULT_QUICK_ADD_ITEMS: Omit<QuickAddItem, "position">[] = [
  { name: "Lait", emoji: "🥛", defaultRayon: "Frais", defaultUnit: "L" },
  { name: "Pain", emoji: "🥖", defaultRayon: "Boulangerie" },
  { name: "Œufs", emoji: "🥚", defaultRayon: "Frais", defaultUnit: "pcs" },
  { name: "Beurre", emoji: "🧈", defaultRayon: "Frais" },
  { name: "Yaourts", emoji: "🍶", defaultRayon: "Frais", defaultUnit: "pcs" },
  { name: "Fromage", emoji: "🧀", defaultRayon: "Frais" },
  { name: "Pâtes", emoji: "🍝", defaultRayon: "Épicerie" },
  { name: "Café", emoji: "☕", defaultRayon: "Épicerie" },
];

/**
 * Seed les 8 quick-add items par défaut. Idempotent : si la collection
 * contient déjà des items, ne fait rien sauf force=true qui efface puis re-seed.
 */
export async function seedQuickAddItems(
  householdId: string,
  options: { force?: boolean } = {},
): Promise<{ created: number }> {
  const existing = await getDocs(quickAddItemsCollection(householdId));
  if (existing.size > 0 && !options.force) {
    return { created: 0 };
  }
  if (existing.size > 0 && options.force) {
    await Promise.all(existing.docs.map((d) => deleteDoc(d.ref)));
  }
  await Promise.all(
    DEFAULT_QUICK_ADD_ITEMS.map((item, index) =>
      addDoc(quickAddItemsCollection(householdId), {
        ...item,
        position: index,
      }),
    ),
  );
  return { created: DEFAULT_QUICK_ADD_ITEMS.length };
}

/* =========================================================================
   Calendar events
   ========================================================================= */

export interface CreateCalendarEventInput {
  title: string;
  startTime: Timestamp;
  allDay: boolean;
  createdBy: string;
  description?: string;
  location?: string;
  endTime?: Timestamp;
  assigneeIds?: string[];
  recurrenceRule?: string;
}

export async function createCalendarEvent(
  householdId: string,
  input: CreateCalendarEventInput,
): Promise<string> {
  const ref = await addDoc(householdCalendarEventsCollection(householdId), {
    title: input.title,
    description: input.description,
    location: input.location,
    startTime: input.startTime,
    endTime: input.endTime,
    allDay: input.allDay,
    assigneeIds: input.assigneeIds,
    source: "local",
    recurrenceRule: input.recurrenceRule,
    createdBy: input.createdBy,
    createdAt: serverTimestamp() as unknown as Timestamp,
  });
  return ref.id;
}

export async function deleteCalendarEvent(
  householdId: string,
  eventId: string,
): Promise<void> {
  await deleteDoc(householdCalendarEventDoc(householdId, eventId));
}

/**
 * Query des événements d'un cocon dans une fenêtre temporelle (typiquement
 * 1 mois affiché dans la vue calendrier).
 */
export function calendarEventsInRangeQuery(
  householdId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Query<CalendarEvent> {
  return query(
    householdCalendarEventsCollection(householdId),
    where("startTime", ">=", FirestoreTimestamp.fromDate(rangeStart)),
    where("startTime", "<=", FirestoreTimestamp.fromDate(rangeEnd)),
  );
}

/* =========================================================================
   Invitations
   ========================================================================= */

const INVITATION_TTL_DAYS = 7;

export interface CreateInvitationInput {
  householdId: string;
  householdName: string;
  ownerDisplayName: string;
  email: string;
  invitedBy: string;
}

/**
 * Crée une invitation à rejoindre un cocon. Le `token` est généré côté
 * client (UUIDv4) et utilisé comme ID du document Firestore.
 * Retourne le token généré.
 */
export async function createInvitation(
  input: CreateInvitationInput,
): Promise<string> {
  const token = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await setDoc(invitationDoc(token), {
    token,
    householdId: input.householdId,
    householdName: input.householdName,
    ownerDisplayName: input.ownerDisplayName,
    email: input.email,
    invitedBy: input.invitedBy,
    invitedAt: serverTimestamp() as unknown as Timestamp,
    expiresAt: FirestoreTimestamp.fromDate(expiresAt),
    status: "pending",
  });

  return token;
}

export async function getInvitation(token: string): Promise<Invitation | null> {
  const snap = await getDoc(invitationDoc(token));
  return snap.exists() ? snap.data() : null;
}

export interface AcceptInvitationInput {
  token: string;
  userId: string;
}

/**
 * Accepte une invitation : ajoute le user à la liste des membres du cocon
 * et marque l'invitation comme acceptée. Tout en transaction pour garantir
 * la cohérence (ou les deux écritures réussissent, ou aucune).
 */
export async function acceptInvitation(
  input: AcceptInvitationInput,
): Promise<{ householdId: string }> {
  return runTransaction(db, async (tx) => {
    const inviteRef = invitationDoc(input.token);
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists()) {
      throw new Error("Cette invitation n'existe pas.");
    }
    const invitation = inviteSnap.data();
    if (invitation.status !== "pending") {
      throw new Error("Cette invitation a déjà été utilisée ou expirée.");
    }
    if (invitation.expiresAt.toMillis() < Date.now()) {
      throw new Error("Cette invitation est expirée.");
    }

    const householdRef = householdDoc(invitation.householdId);
    const memberRef = householdMemberDoc(invitation.householdId, input.userId);

    tx.update(householdRef, {
      memberIds: arrayUnion(input.userId),
    });

    tx.set(memberRef, {
      userId: input.userId,
      role: "member",
      joinedAt: serverTimestamp() as unknown as Timestamp,
    });

    tx.update(inviteRef, {
      status: "accepted",
      acceptedBy: input.userId,
      acceptedAt: serverTimestamp() as unknown as Timestamp,
    });

    return { householdId: invitation.householdId };
  });
}

/* =========================================================================
   Queries de cocons de l'utilisateur
   ========================================================================= */

export function householdsOfUserQuery(userId: string): Query<Household> {
  return query(
    householdsCollection(),
    where("memberIds", "array-contains", userId),
  );
}

export async function getHouseholdsOfUser(
  userId: string,
): Promise<WithId<Household>[]> {
  const snap = await getDocs(householdsOfUserQuery(userId));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

/* =========================================================================
   Queries pré-construites (utilisées par les hooks + écrans)
   ========================================================================= */

/**
 * Toutes les tâches non complétées d'un cocon, triées par due date.
 */
export function pendingTasksQuery(householdId: string): Query<Task> {
  return query(
    householdTasksCollection(householdId),
    where("status", "==", "pending"),
  );
}

/**
 * Tâches assignées à un utilisateur dans un cocon (toutes statuts confondus).
 */
export function tasksAssignedToQuery(
  householdId: string,
  userId: string,
): Query<Task> {
  return query(
    householdTasksCollection(householdId),
    where("assigneeId", "==", userId),
  );
}

/* =========================================================================
   Helpers purs (testables sans Firestore)
   ========================================================================= */

/**
 * Une tâche est en retard si elle a une dueDate dans le passé et n'est pas
 * encore complétée.
 */
export function isOverdue(
  task: Pick<Task, "status" | "dueDate">,
  now: Date,
): boolean {
  if (task.status !== "pending") return false;
  if (!task.dueDate) return false;
  return task.dueDate.toMillis() < now.getTime();
}

/**
 * Vérifie si une tâche est due aujourd'hui (entre minuit et 23h59 locaux).
 */
export function isDueToday(
  task: Pick<Task, "dueDate">,
  now: Date,
): boolean {
  if (!task.dueDate) return false;
  const dueDate = task.dueDate.toDate();
  return (
    dueDate.getFullYear() === now.getFullYear() &&
    dueDate.getMonth() === now.getMonth() &&
    dueDate.getDate() === now.getDate()
  );
}

/**
 * Construit un Timestamp à partir d'une Date (utile pour les tests et les
 * formulaires de création de tâche).
 */
export function timestampFromDate(date: Date): Timestamp {
  return FirestoreTimestamp.fromDate(date);
}

/**
 * Une invitation est expirée si sa date d'expiration est dans le passé,
 * indépendamment de son statut (un token expiré reste expiré même si
 * `status === 'pending'`).
 */
export function isInvitationExpired(
  invitation: Pick<Invitation, "expiresAt">,
  now: Date,
): boolean {
  return invitation.expiresAt.toMillis() < now.getTime();
}

/**
 * Une tâche est due cette semaine si sa dueDate est dans les 7 prochains
 * jours (à compter de minuit aujourd'hui, exclusif d'aujourd'hui-même —
 * `isDueToday` couvre déjà ce cas).
 */
export function isDueThisWeek(
  task: Pick<Task, "dueDate">,
  now: Date,
): boolean {
  if (!task.dueDate) return false;
  const due = task.dueDate.toDate();
  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const endOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 7,
    23,
    59,
    59,
  );
  return due >= startOfTomorrow && due <= endOfWeek;
}

/**
 * Une tâche est "récemment complétée" si elle est faite ET que sa
 * completedAt est dans les 7 derniers jours (utilisé pour la section
 * « Fait récemment » du dashboard et de la liste).
 */
export function isRecentlyCompleted(
  task: Pick<Task, "status" | "completedAt">,
  now: Date,
): boolean {
  if (task.status !== "done") return false;
  if (!task.completedAt) return false;
  const completed = task.completedAt.toDate();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return completed >= sevenDaysAgo;
}
