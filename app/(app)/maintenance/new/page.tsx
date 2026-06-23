"use client";

import { useRouter } from "next/navigation";

import {
  MaintenancePresetForm,
  type PresetFormValue,
} from "@/components/maintenance/preset-form";
import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { createMaintenancePreset } from "@/lib/firebase/firestore";

export default function NewMaintenancePresetPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { showToast } = useToast();

  async function handleSubmit(value: PresetFormValue) {
    if (!household || !user) return;
    await createMaintenancePreset(household.id, {
      ...value,
      custom: true,
      createdBy: user.uid,
    });
    showToast({ message: `${value.emoji} ${value.title} créé` });
    router.replace("/maintenance");
  }

  return (
    <MaintenancePresetForm
      submitLabel="Créer"
      topBarTitle="Nouveau preset"
      onSubmit={handleSubmit}
    />
  );
}
