"use client";

import { onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import {
  householdTaskDoc,
  householdTasksCollection,
} from "@/lib/firebase/firestore";
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

interface TaskState {
  task: WithId<Task> | null;
  loading: boolean;
  notFound: boolean;
}

/**
 * Souscrit à une tâche unique en temps réel.
 * `notFound` passe à true si le doc n'existe pas (ou a été supprimé).
 */
export function useTask(
  householdId: string | undefined,
  taskId: string | undefined,
): TaskState {
  const [state, setState] = useState<TaskState>({
    task: null,
    loading: true,
    notFound: false,
  });

  useEffect(() => {
    if (!householdId || !taskId) {
      setState({ task: null, loading: false, notFound: true });
      return;
    }

    const unsubscribe = onSnapshot(
      householdTaskDoc(householdId, taskId),
      (snap) => {
        if (!snap.exists()) {
          setState({ task: null, loading: false, notFound: true });
          return;
        }
        setState({
          task: { ...snap.data(), id: snap.id },
          loading: false,
          notFound: false,
        });
      },
      () => {
        setState({ task: null, loading: false, notFound: true });
      },
    );

    return unsubscribe;
  }, [householdId, taskId]);

  return state;
}
