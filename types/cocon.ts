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
  checklistRunId?: string; // sprint 3
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
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
