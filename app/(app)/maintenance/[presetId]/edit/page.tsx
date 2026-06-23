"use client";

import { onSnapshot } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  MaintenancePresetForm,
  type PresetFormValue,
} from "@/components/maintenance/preset-form";
import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import {
  deleteMaintenancePreset,
  maintenancePresetDoc,
  updateMaintenancePreset,
} from "@/lib/firebase/firestore";
import { deactivateMaintenancePreset } from "@/lib/maintenance/activate";
import type { MaintenancePreset, WithId } from "@/types/cocon";

export default function EditMaintenancePresetPage() {
  const router = useRouter();
  const params = useParams<{ presetId: string }>();
  const presetId = params.presetId;
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { showToast } = useToast();
  const [preset, setPreset] = useState<WithId<MaintenancePreset> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!household?.id || !presetId) return;
    const unsubscribe = onSnapshot(
      maintenancePresetDoc(household.id, presetId),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setPreset({ ...snap.data(), id: snap.id });
        setLoading(false);
      },
      () => {
        setNotFound(true);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [household?.id, presetId]);

  async function handleSubmit(value: PresetFormValue) {
    if (!household || !preset) return;
    await updateMaintenancePreset(household.id, preset.id, value);
    showToast({ message: "Preset mis à jour" });
    router.replace("/maintenance");
  }

  async function handleDelete() {
    if (!household || !preset || !user) return;
    // Si le preset est actif, on supprime aussi la tâche associée
    await deactivateMaintenancePreset(household.id, preset.id).catch(
      () => undefined,
    );
    await deleteMaintenancePreset(household.id, preset.id);
    router.replace("/maintenance");
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-7">
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  if (notFound || !preset) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-7 gap-4 text-center">
        <p className="text-[14px] text-muted-foreground">
          Preset d&apos;entretien introuvable.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/maintenance")}
          className="rounded-[12px] border border-border bg-transparent text-foreground px-4 py-2 text-[13px]"
        >
          Retour à l&apos;entretien
        </button>
      </main>
    );
  }

  return (
    <MaintenancePresetForm
      initial={{
        category: preset.category,
        title: preset.title,
        emoji: preset.emoji,
        hint: preset.hint,
        recurrenceRule: preset.recurrenceRule,
        frequencyLabel: preset.frequencyLabel,
        priority: preset.priority ?? false,
      }}
      submitLabel="Enregistrer"
      topBarTitle="Modifier preset"
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
}
