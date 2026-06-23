import { Timestamp } from "firebase/firestore";

import { createTask } from "@/lib/firebase/firestore";
import { getNextOccurrence } from "@/lib/recurrence";

import type { MaintenancePreset } from "./presets";

/**
 * Sprint 7 — instancie un preset en tâche récurrente.
 *
 * - catégorie « Entretien »
 * - dueDate = première occurrence à partir d'aujourd'hui (calculée via
 *   `getNextOccurrence`)
 * - maintenancePresetId = lien vers le preset (pour détecter les
 *   activations dans la bibliothèque)
 *
 * Retourne l'id de la tâche créée.
 */
export async function activateMaintenancePreset(
  householdId: string,
  preset: MaintenancePreset,
  createdBy: string,
): Promise<string> {
  const now = new Date();
  // Cherche la prochaine occurrence après aujourd'hui (exclusif) — sinon
  // la dueDate serait dans le passé pour les RRULE WEEKLY si on tombe
  // pile sur le bon jour.
  const next = getNextOccurrence(preset.recurrenceRule, now, now);
  const dueDate = next ? Timestamp.fromDate(next) : undefined;
  return createTask(householdId, {
    title: preset.title,
    description: preset.hint,
    category: "Entretien",
    createdBy,
    priority: preset.priority ?? false,
    dueDate,
    recurrenceRule: preset.recurrenceRule,
    maintenancePresetId: preset.id,
  });
}
