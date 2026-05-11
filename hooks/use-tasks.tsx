"use client";

import { onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import { householdTasksCollection } from "@/lib/firebase/firestore";
import type { Task, WithId } from "@/types/cocon";

interface TasksState {
  tasks: WithId<Task>[];
  loading: boolean;
}

/**
 * Souscrit en temps réel (onSnapshot) à toutes les tâches d'un cocon,
 * triées par createdAt descendant (les plus récentes d'abord). Le tri par
 * dueDate / status sera fait côté UI dans les sous-tâches suivantes.
 *
 * Retourne tableau vide + loading=false si pas de householdId.
 */
export function useTasks(householdId: string | undefined): TasksState {
  const [state, setState] = useState<TasksState>({ tasks: [], loading: true });

  useEffect(() => {
    if (!householdId) {
      setState({ tasks: [], loading: false });
      return;
    }

    const q = query(
      householdTasksCollection(householdId),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const tasks = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        setState({ tasks, loading: false });
      },
      () => {
        setState({ tasks: [], loading: false });
      },
    );

    return unsubscribe;
  }, [householdId]);

  return state;
}
