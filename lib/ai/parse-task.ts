import { Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { functions } from "@/lib/firebase/client";
import type { TaskEffort } from "@/types/cocon";

/* =========================================================================
   Types alignés sur la sortie de la Cloud Function parseTask
   ========================================================================= */

export type AssigneeHint = "me" | "partner" | "unassigned";
export type DueDateHint = "today" | "tomorrow" | "thisWeek" | "none";
export type EffortHint = "quick" | "normal" | "long";

export interface ParseTaskInput {
  text: string;
}

export interface ParseTaskOutput {
  title: string;
  category?: string;
  assigneeHint?: AssigneeHint;
  dueDateHint?: DueDateHint;
  effortHint?: EffortHint;
  confidence: number;
}

/* =========================================================================
   Wrapper de l'appel à la Cloud Function
   ========================================================================= */

const callable = httpsCallable<ParseTaskInput, ParseTaskOutput>(
  functions,
  "parseTask",
);

/**
 * Envoie une phrase libre à la Cloud Function parseTask et retourne un
 * objet structuré. La function exige une authentification utilisateur.
 */
export async function parseTaskNatural(
  text: string,
): Promise<ParseTaskOutput> {
  const result = await callable({ text });
  return result.data;
}

/* =========================================================================
   Convertisseurs purs hint → valeurs concrètes (testables)
   ========================================================================= */

export interface ApplyHintsContext {
  currentUserId: string;
  otherMemberId?: string;
}

export interface AppliedTaskFields {
  title: string;
  category?: string;
  assigneeId?: string;
  dueDate?: Timestamp;
  effort?: TaskEffort;
}

export function hintToAssigneeId(
  hint: AssigneeHint | undefined,
  context: ApplyHintsContext,
): string | undefined {
  if (hint === "me") return context.currentUserId;
  if (hint === "partner") return context.otherMemberId;
  return undefined;
}

export function hintToDueDate(
  hint: DueDateHint | undefined,
  now: Date,
): Timestamp | undefined {
  if (!hint || hint === "none") return undefined;
  if (hint === "today") {
    return Timestamp.fromDate(
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
    );
  }
  if (hint === "tomorrow") {
    return Timestamp.fromDate(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        23,
        59,
        59,
      ),
    );
  }
  if (hint === "thisWeek") {
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    return Timestamp.fromDate(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + daysUntilSunday,
        23,
        59,
        59,
      ),
    );
  }
  return undefined;
}

/**
 * Convertit la sortie brute de l'IA en valeurs prêtes à être posées
 * dans le formulaire de création de tâche. Fonction pure et testable.
 */
export function applyParseHints(
  output: ParseTaskOutput,
  context: ApplyHintsContext,
  now: Date,
): AppliedTaskFields {
  return {
    title: output.title,
    category: output.category,
    assigneeId: hintToAssigneeId(output.assigneeHint, context),
    dueDate: hintToDueDate(output.dueDateHint, now),
    effort: output.effortHint,
  };
}
