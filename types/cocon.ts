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
  /** Sprint 5 — géolocalisation pour la météo (Bloc F.9). */
  location?: {
    lat: number;
    lng: number;
    /** Nom optionnel pour affichage (« Paris », « Lyon »...). */
    label?: string;
  };
  /** Sprint 5 — consent géoloc : null = pas encore demandé. */
  locationConsent?: "granted" | "denied";
  /** Sprint 6 — true si l'utilisateur a déjà utilisé l'ajout rapide sticky
   *  de courses (cache le hint « tape juste lait — Cocon range tout »). */
  shoppingQuickAddHintShown?: boolean;
}

export interface User {
  email: string;
  displayName: string;
  avatarUrl?: string;
  /** Sprint 5 polish — emoji choisi par l'utilisateur pour représenter
   *  son avatar dans le cocon (assignation de tâches, score d'équilibre,
   *  liste des membres). Fallback : initiale du displayName. */
  avatarEmoji?: string;
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
  emoji?: string; // legacy — plus modifiable depuis le sprint 5 polish
  createdAt: Timestamp;
  ownerId: string;
  memberIds: string[];
  /** Map des invitations actives, keyed par token. */
  invitations: Record<string, HouseholdInvitation>;
  /** Sprint 4 — score d'équilibre opt-in, off par défaut. */
  balanceEnabled?: boolean;
  /** Sprint 4 — journal du foyer. On par défaut, désactivable. */
  journalEnabled?: boolean;
  /** Sprint 5 polish — code court alphanumérique pour rejoindre le cocon
   *  en tapant le code (alternative au lien d'invitation UUID). 6 chars
   *  uppercase, sans 0/O/I/L pour éviter les confusions. */
  inviteCode?: string;
}

/** Document `invite-codes/{code}` — résolveur top-level pour code → cocon. */
export interface InviteCode {
  code: string;
  householdId: string;
  /** Pour affichage rapide à l'arrivée (le user voit le nom avant de join). */
  householdName: string;
  createdAt: Timestamp;
  createdBy: string;
  active: boolean;
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
  /** Sprint 5 — flag binaire prioritaire, remonte en haut de liste. */
  priority?: boolean;
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
  /** Sprint 6 — ordre manuel défini par l'utilisateur via le mode
   *  « Ordonner ». Plus bas = en haut de section. Les tâches sans
   *  manualOrder restent triées par défaut (priorité puis due). */
  manualOrder?: number;
  /** Sprint 7 — id du preset d'entretien si la tâche a été créée
   *  depuis la bibliothèque /maintenance. Permet de savoir si un
   *  preset est déjà activé. */
  maintenancePresetId?: string;
  /** Sprint 7 — emoji affiché en tête de la ligne dans /tasks.
   *  Posé à l'activation d'un preset d'entretien (et resynchronisé
   *  lors d'un sync défauts). Optionnel : aucune décoration sinon. */
  emoji?: string;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
}

/**
 * Sprint 7 — Preset d'entretien stocké par cocon. Initialement seedé
 * avec les 32 presets par défaut, l'utilisateur peut ensuite modifier,
 * supprimer, en créer des custom.
 */
export type MaintenanceCategory =
  | "trash"
  | "appliance"
  | "filter"
  | "seasonal"
  | "safety"
  | "exterior";

export interface MaintenancePreset {
  category: MaintenanceCategory;
  title: string;
  emoji: string;
  hint: string;
  /** RRULE iCal — voir lib/recurrence.ts pour les exemples valides. */
  recurrenceRule: string;
  frequencyLabel: string;
  priority?: boolean;
  /** true si l'utilisateur l'a créé lui-même (vs preset par défaut). */
  custom?: boolean;
  /** Position d'affichage dans sa catégorie. ASC. */
  position?: number;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
}

/**
 * Sprint 6 — bloc F. Sous-tâche d'une tâche parente. Hérite
 * implicitement de la parente (assignee, dueDate, category) — non
 * dupliqué dans le document, lu depuis la tâche parente côté UI.
 */
export interface Subtask {
  title: string;
  status: TaskStatus;
  /** Ordre dans la liste, ASC. Auto-attribué (max+1) à la création. */
  position: number;
  completedAt?: Timestamp;
  completedBy?: string;
  createdAt: Timestamp;
  createdBy: string;
}

// ---------- Shopping ----------

export type ShoppingStatus = "pending" | "bought";

export type ShoppingRayon =
  | "Fruits & légumes"
  | "Boulangerie"
  | "Viandes"
  | "Poisson"
  | "Produits laitiers"
  | "Frais"
  | "Conserves"
  | "Épicerie"
  | "Boissons"
  | "Hygiène"
  | "Maison"
  | "Animalerie"
  | "Autre";

/**
 * Sprint 5 polish — historique persistant des articles achetés.
 * Un doc par paire unique (rayon, nameKey). Mis à jour à chaque check d'un
 * shopping-item. Survit aux nettoyages de la liste active.
 */
export interface ShoppingHistoryEntry {
  /** Nom affiché (peut différer du nameKey en casse / accents). */
  name: string;
  /** Clé normalisée (lowercase sans accents) — sert d'id du doc avec rayon. */
  nameKey: string;
  emoji?: string;
  rayon: ShoppingRayon;
  unit?: string;
  /** Dernière fois où l'article a été coché (acheté). */
  lastBoughtAt: Timestamp;
  /** Nombre de fois acheté depuis la création de l'entrée. */
  buyCount: number;
  /** Sprint 5 polish — épinglé en haut de l'historique pour accès rapide. */
  favorite?: boolean;
}

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

export type MemoryEntryType = "code" | "object" | "note";

/**
 * Legacy types retirés en sprint 5 polish ("contact", "manual", "warranty").
 * Les entries existantes avec ces types sont remappées en "note" côté UI
 * (sans migration de DB — le filtrage par type ne les retrouve plus dans
 *  les anciennes catégories mais elles restent accessibles via recherche).
 */
export type LegacyMemoryEntryType = "contact" | "manual" | "warranty";

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
