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
 * existantes sur les seedId connus, et crée les manquants.
 *
 * À utiliser via un bouton « Synchroniser depuis les défauts » dans
 * l'UI quand l'utilisateur veut réinitialiser ses presets standards
 * (sans toucher aux customs, qui n'ont pas de seedId).
 *
 * Retourne le nombre de presets écrits.
 */
export async function forceResyncDefaultPresets(
  householdId: string,
  userId: string,
): Promise<number> {
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
