import {
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";

import {
  householdTasksCollection,
  maintenancePresetsCollection,
  setMaintenancePreset,
} from "@/lib/firebase/firestore";

import {
  DEFAULT_MAINTENANCE_PRESETS,
  type MaintenancePresetSeed,
} from "./presets";

/**
 * Sprint 7 — seed les 32 presets par défaut SI la collection est vide
 * pour ce cocon. Idempotent : on lit 1 doc pour savoir s'il faut seeder.
 */
export async function seedDefaultPresetsIfEmpty(
  householdId: string,
  userId: string,
): Promise<number> {
  const probe = await getDocs(
    query(maintenancePresetsCollection(householdId), limit(1)),
  );
  if (!probe.empty) return 0;
  for (const preset of DEFAULT_MAINTENANCE_PRESETS) {
    await writeOne(householdId, preset, userId);
  }
  return DEFAULT_MAINTENANCE_PRESETS.length;
}

/**
 * Sprint 7 — UPSERT TOUS les presets par défaut. Écrase les valeurs
 * existantes sur les seedId connus, et crée les manquants. Backfille
 * aussi l'emoji + le title sur les Task actives associées (qui ne
 * connaissent pas forcément les nouvelles valeurs si elles ont été
 * créées avant le sprint emoji).
 *
 * Retourne `{ presets: N, tasksUpdated: M }`.
 */
export async function forceResyncDefaultPresets(
  householdId: string,
  userId: string,
): Promise<{ presets: number; tasksUpdated: number }> {
  for (const preset of DEFAULT_MAINTENANCE_PRESETS) {
    await writeOne(householdId, preset, userId);
  }
  const tasksUpdated = await backfillActiveTasks(householdId);
  return { presets: DEFAULT_MAINTENANCE_PRESETS.length, tasksUpdated };
}

async function backfillActiveTasks(householdId: string): Promise<number> {
  let count = 0;
  for (const preset of DEFAULT_MAINTENANCE_PRESETS) {
    const snap = await getDocs(
      query(
        householdTasksCollection(householdId),
        where("maintenancePresetId", "==", preset.seedId),
        where("status", "==", "pending"),
      ),
    );
    for (const d of snap.docs) {
      await updateDoc(d.ref, {
        emoji: preset.emoji,
        title: preset.title,
        description: preset.hint,
        recurrenceRule: preset.recurrenceRule,
        priority: preset.priority ?? false,
        updatedAt: serverTimestamp() as unknown as Timestamp,
      });
      count++;
    }
  }
  return count;
}

async function writeOne(
  householdId: string,
  preset: MaintenancePresetSeed,
  userId: string,
): Promise<void> {
  await setMaintenancePreset(householdId, preset.seedId, {
    category: preset.category,
    title: preset.title,
    emoji: preset.emoji,
    hint: preset.hint,
    recurrenceRule: preset.recurrenceRule,
    frequencyLabel: preset.frequencyLabel,
    priority: preset.priority ?? false,
    position: preset.position ?? 0,
    custom: false,
    createdBy: userId,
  });
}
