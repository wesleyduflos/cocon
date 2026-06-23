import { getDocs, limit, query } from "firebase/firestore";

import {
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
 *
 * Utilise setMaintenancePreset (= setDoc avec un id stable) plutôt que
 * createMaintenancePreset (= addDoc avec id random) pour que les seedId
 * restent référençables si on veut re-seeder un preset supprimé un
 * jour.
 */
export async function seedDefaultPresetsIfEmpty(
  householdId: string,
  userId: string,
): Promise<number> {
  const probe = await getDocs(
    query(maintenancePresetsCollection(householdId), limit(1)),
  );
  if (!probe.empty) return 0;
  // On séquence les écritures pour éviter de saturer Firestore avec 32
  // setDoc en parallèle (et garder un comportement prévisible).
  for (const preset of DEFAULT_MAINTENANCE_PRESETS) {
    await writeOne(householdId, preset, userId);
  }
  return DEFAULT_MAINTENANCE_PRESETS.length;
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
