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
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  DEFAULT_USER_PREFERENCES,
  type Household,
  type HouseholdMember,
  type Invitation,
  type Task,
  type User,
  type WithId,
} from "@/types/cocon";

import { db } from "./client";

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
    dueDate: input.dueDate,
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
