"use client";

import { onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import { subtasksCollection } from "@/lib/firebase/firestore";
import type { Subtask, WithId } from "@/types/cocon";

interface State {
  subtasks: WithId<Subtask>[];
  loading: boolean;
}

/**
 * Sprint 6 — bloc F. Stream les sous-tâches d'une tâche via onSnapshot.
 *
 * Renvoie `{ subtasks: [], loading: false }` quand `taskId` ou
 * `householdId` est vide, pour éviter une souscription inutile.
 */
export function useSubtasks(
  householdId: string | undefined,
  taskId: string | undefined,
): State {
  const [state, setState] = useState<State>({
    subtasks: [],
    loading: true,
  });

  useEffect(() => {
    if (!householdId || !taskId) {
      setState({ subtasks: [], loading: false });
      return;
    }
    const unsubscribe = onSnapshot(
      query(subtasksCollection(householdId, taskId), orderBy("position", "asc")),
      (snap) => {
        setState({
          subtasks: snap.docs.map((d) => ({ ...d.data(), id: d.id })),
          loading: false,
        });
      },
      () => setState({ subtasks: [], loading: false }),
    );
    return unsubscribe;
  }, [householdId, taskId]);

  return state;
}
