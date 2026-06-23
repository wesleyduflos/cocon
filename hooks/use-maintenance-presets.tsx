"use client";

import { onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import { maintenancePresetsCollection } from "@/lib/firebase/firestore";
import type { MaintenancePreset, WithId } from "@/types/cocon";

interface State {
  presets: WithId<MaintenancePreset>[];
  loading: boolean;
}

/**
 * Sprint 7. Stream les presets d'entretien d'un cocon via onSnapshot.
 *
 * Tri secondaire par category déjà géré côté UI (groupe par category).
 * Ici on tri par position ASC (puis Firestore ordonnance les égalités).
 */
export function useMaintenancePresets(
  householdId: string | undefined,
): State {
  const [state, setState] = useState<State>({
    presets: [],
    loading: true,
  });

  useEffect(() => {
    if (!householdId) {
      setState({ presets: [], loading: false });
      return;
    }
    const unsubscribe = onSnapshot(
      query(
        maintenancePresetsCollection(householdId),
        orderBy("position", "asc"),
      ),
      (snap) => {
        setState({
          presets: snap.docs.map((d) => ({ ...d.data(), id: d.id })),
          loading: false,
        });
      },
      () => setState({ presets: [], loading: false }),
    );
    return unsubscribe;
  }, [householdId]);

  return state;
}
