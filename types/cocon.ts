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
  recurrenceRule?: string; // sprint 2 — RRULE iCal
  checklistRunId?: string; // sprint 3
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
}

// ---------- Préférences utilisateur par défaut ----------

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "dark",
  quietHoursStart: 22,
  quietHoursEnd: 7,
  notificationsEnabled: true,
  voiceCaptureEnabled: false,
};
