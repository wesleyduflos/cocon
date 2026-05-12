import type { Timestamp } from "firebase/firestore";

/* =========================================================================
   Types data model — Cocon
   Source de vérité : docs/architecture-cocon.md §3.2
   Convention : Timestamp Firestore partout (jamais Date JS direct).
   Champs optionnels (`?: T`) = absents du document Firestore.
   ========================================================================= */

// ---------- Utilitaires génériques ----------

/** Attache un id de document à un type de payload. */
export type WithId<T> = T & { id: string };

/** Retire les champs gérés automatiquement à la création. */
export type CreatePayload<T> = Omit<T, "createdAt" | "updatedAt">;

// ---------- User ----------

export type Theme = "dark" | "light" | "system";

export interface UserPreferences {
  theme: Theme;
  quietHoursStart: number; // 0-23, défaut 22
  quietHoursEnd: number; // 0-23, défaut 7
  notificationsEnabled: boolean;
  voiceCaptureEnabled: boolean;
}

export interface User {
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: Timestamp;
  preferences: UserPreferences;
}

// ---------- Household ----------

export interface HouseholdInvitation {
  email: string;
  invitedBy: string;
  invitedAt: Timestamp;
  expiresAt: Timestamp;
}

export interface Household {
  name: string;
  emoji?: string; // "🏠" par défaut côté UI
  createdAt: Timestamp;
  ownerId: string;
  memberIds: string[];
  /** Map des invitations actives, keyed par token. */
  invitations: Record<string, HouseholdInvitation>;
  /** Sprint 4 — score d'équilibre opt-in, off par défaut. */
  balanceEnabled?: boolean;
  /** Sprint 4 — journal du foyer. On par défaut, désactivable. */
  journalEnabled?: boolean;
}

export type HouseholdMemberRole = "owner" | "member";

export interface HouseholdMember {
  userId: string;
  role: HouseholdMemberRole;
  joinedAt: Timestamp;
  displayNameInHousehold?: string;
}

// ---------- Invitation ----------

export type InvitationStatus = "pending" | "accepted" | "expired";

/**
 * Documents dans la collection top-level `invitations/{token}`.
 * On diverge de l'archi originale (qui prévoyait une map dans household)
 * car Firestore ne sait pas query une map keyée par token pour retrouver
 * un cocon. Une collection top-level rend `getDoc(invitationDoc(token))`
 * trivial. La sécurité repose sur le secret du token (UUIDv4 = 122 bits
 * d'entropie). Voir `firestore.rules` pour les contrôles d'accès.
 */
export interface Invitation {
  token: string;
  householdId: string;
  householdName: string; // dénormalisé pour affichage rapide à l'arrivée
  ownerDisplayName: string; // dénormalisé : « Tu rejoins le cocon de Wesley »
  email: string; // email du destinataire (informatif, pas vérifié)
  invitedBy: string; // uid de l'invitant
  invitedAt: Timestamp;
  expiresAt: Timestamp; // +7 jours par défaut
  status: InvitationStatus;
  acceptedBy?: string;
  acceptedAt?: Timestamp;
}

// ---------- Task ----------

export type TaskStatus = "pending" | "done" | "cancelled";
export type TaskEffort = "quick" | "normal" | "long";

export interface Task {
  title: string;
  description?: string;
  category?: string; // "maison" | "animaux" | "voiture" | ...
  assigneeId?: string;
  effort?: TaskEffort;
  status: TaskStatus;
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  completedBy?: string;
  // Champs anticipés pour sprints 2-4 — déclarés dès maintenant pour
  // éviter les refactorings (cf. screens-spec §8.2).
  notes?: string; // sprint 3 — notes contextuelles partagées
  attachmentIds?: string[]; // sprint 3
  recurrenceRule?: string; // sprint 2 — RRULE iCal (ex: "FREQ=WEEKLY;BYDAY=TU")
  /** Id du doc actif de la série (la tâche complétée pointe vers son original). */
  recurrenceSeriesId?: string; // sprint 2
  /** Sprint 2 — dernière fois qu'une notification de rappel a été envoyée pour cette tâche. */
  reminderSentAt?: Timestamp;
  checklistRunId?: string; // sprint 3
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
}

// ---------- Shopping ----------

export type ShoppingStatus = "pending" | "bought";

export type ShoppingRayon =
  | "Frais"
  | "Épicerie"
  | "Hygiène"
  | "Boulangerie"
  | "Boissons"
  | "Animalerie"
  | "Maison"
  | "Autre";

export interface ShoppingItem {
  name: string;
  emoji?: string;
  quantity: number;
  unit?: string; // "pcs", "kg", "L", etc.
  rayon: ShoppingRayon;
  notes?: string;
  attachmentIds?: string[];
  status: ShoppingStatus;
  boughtAt?: Timestamp;
  boughtBy?: string;
  stockItemId?: string;
  /** True si l'item a été ajouté via une tap sur la grille des essentiels. */
  fromQuickAdd: boolean;
  /** Auto-ajouté quand un stock lié est passé à low/empty. */
  fromStockAuto?: boolean;
  /** UID des membres qui ont vu la note depuis sa dernière modification. */
  noteSeenBy?: string[];
  addedAt: Timestamp;
  addedBy: string;
}

export interface QuickAddItem {
  name: string;
  emoji: string;
  defaultRayon: ShoppingRayon;
  defaultUnit?: string;
  position: number;
}

// ---------- Attachment (polymorphe) ----------

export type AttachmentKind = "image" | "url" | "voice-note" | "document";
export type AttachmentItemType =
  | "task"
  | "shopping-item"
  | "memory-entry";

export interface Attachment {
  itemType: AttachmentItemType;
  itemId: string;
  kind: AttachmentKind;
  url: string;
  thumbnailUrl?: string;
  label?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: Timestamp;
  createdBy: string;
}

// ---------- Checklist templates & runs ----------

export interface ChecklistTrigger {
  /** Mot-clé à matcher dans le titre/description des événements (insensible accents/casse). */
  keyword: string;
  /** Nombre de jours avant l'événement où la suggestion doit apparaître. */
  daysBefore: number;
}

export interface ChecklistTemplate {
  name: string;
  emoji: string;
  description?: string;
  isSeeded: boolean;
  /** Sprint 4 : triggers pour suggestions automatiques depuis l'agenda. */
  triggers?: ChecklistTrigger[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChecklistTemplateItem {
  position: number;
  title: string;
  defaultAssigneeId?: string;
  estimatedMinutes?: number;
  notes?: string;
}

export interface ChecklistRun {
  templateId: string;
  templateName: string;
  templateEmoji: string;
  startedAt: Timestamp;
  startedBy: string;
  completedAt?: Timestamp;
  totalTasks: number;
  completedTasks: number;
}

// ---------- Memory entry ----------

export type MemoryEntryType =
  | "code"
  | "object"
  | "contact"
  | "manual"
  | "warranty"
  | "note";

export interface MemoryEntry {
  type: MemoryEntryType;
  title: string;
  emoji?: string;
  pinned: boolean;
  pinnedOrder?: number;
  /** Champ libre dont la structure dépend du `type`. */
  structuredData: Record<string, string | number | boolean | undefined>;
  tags: string[];
  /** Calculés à l'écriture, utilisés pour la recherche `array-contains-any`. */
  searchTokens: string[];
  attachmentIds?: string[];
  isSensitive: boolean;
  lastViewedAt?: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
}

// ---------- Journal (sprint 4) ----------

export type JournalEntryType =
  | "task_completed"
  | "preparation_launched"
  | "preparation_completed"
  | "member_joined"
  | "stock_renewed"
  | "memory_entry_added";

export interface JournalEntry {
  type: JournalEntryType;
  actor: string;
  actorName: string;
  /** Contenu dépendant du `type`. Voir lib/journal/journal.ts. */
  payload: Record<string, string | number | boolean>;
  createdAt: Timestamp;
}

// ---------- Suggestion (sprint 4) ----------

export type SuggestionStatus = "pending" | "accepted" | "dismissed";
export type SuggestionType = "preparation";

export interface Suggestion {
  type: SuggestionType;
  templateId: string;
  templateName: string;
  templateEmoji: string;
  triggerEventId: string;
  triggerEventTitle: string;
  triggerEventDate: Timestamp;
  matchedKeyword: string;
  status: SuggestionStatus;
  createdAt: Timestamp;
  dismissedBy?: string;
  actedBy?: string;
  actedAt?: Timestamp;
}

// ---------- Stock ----------

export type StockLevel = "full" | "half" | "low" | "empty";

export interface StockHistoryEntry {
  level: StockLevel;
  changedAt: Timestamp;
  changedBy: string;
}

export interface StockItem {
  name: string;
  emoji?: string;
  level: StockLevel;
  lastRenewedAt?: Timestamp;
  predictedNextRenewalAt?: Timestamp;
  /** Pour le couplage courses ↔ stocks : id d'un quick-add-item. */
  linkedQuickAddItemId?: string;
  /** Cappée à 50 entries, plus récente en premier. */
  history: StockHistoryEntry[];
  createdAt: Timestamp;
  createdBy: string;
}

// ---------- Calendar event ----------

export type CalendarSource = "local" | "google" | "outlook";

/**
 * Documents dans `households/{hid}/calendar-events/{eventId}`.
 * Cf. architecture-cocon.md §3.2.
 */
export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  allDay: boolean;
  assigneeIds?: string[];
  source: CalendarSource;
  externalEventId?: string;
  recurrenceRule?: string; // sprint 2 — RRULE iCal pour les événements récurrents
  createdAt: Timestamp;
  createdBy: string;
}

// ---------- Préférences utilisateur par défaut ----------

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "dark",
  quietHoursStart: 22,
  quietHoursEnd: 7,
  notificationsEnabled: true,
  voiceCaptureEnabled: false,
};
