import {
  Timestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  createTask,
  deleteTask,
  householdTasksCollection,
} from "@/lib/firebase/firestore";
import { getNextOccurrence } from "@/lib/recurrence";
import type { MaintenancePreset, WithId } from "@/types/cocon";

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
  preset: WithId<MaintenancePreset>,
  createdBy: string,
): Promise<string> {
  const now = new Date();
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
    emoji: preset.emoji,
  });
}

/**
 * Sprint 7 — désactive un preset (= supprime la / les Task pending
 * associées). Retourne le nombre de tâches supprimées.
 */
export async function deactivateMaintenancePreset(
  householdId: string,
  presetId: string,
): Promise<number> {
  const snap = await getDocs(
    query(
      householdTasksCollection(householdId),
      where("maintenancePresetId", "==", presetId),
      where("status", "==", "pending"),
    ),
  );
  const deletions = snap.docs.map((d) => deleteTask(householdId, d.id));
  await Promise.all(deletions);
  return deletions.length;
}
