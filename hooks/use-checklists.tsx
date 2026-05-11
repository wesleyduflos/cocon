"use client";

import { onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

import {
  checklistRunsCollection,
  checklistTemplateItemsCollection,
  checklistTemplatesCollection,
} from "@/lib/firebase/firestore";
import type {
  ChecklistRun,
  ChecklistTemplate,
  ChecklistTemplateItem,
  WithId,
} from "@/types/cocon";

export function useChecklistTemplates(householdId: string | undefined): {
  templates: WithId<ChecklistTemplate>[];
  loading: boolean;
} {
  const [state, setState] = useState<{
    templates: WithId<ChecklistTemplate>[];
    loading: boolean;
  }>({ templates: [], loading: true });

  useEffect(() => {
    if (!householdId) {
      setState({ templates: [], loading: false });
      return;
    }
    const unsubscribe = onSnapshot(
      checklistTemplatesCollection(householdId),
      (snap) => {
        setState({
          templates: snap.docs.map((d) => ({ ...d.data(), id: d.id })),
          loading: false,
        });
      },
      () => setState({ templates: [], loading: false }),
    );
    return unsubscribe;
  }, [householdId]);

  return state;
}

export function useTemplateItems(
  householdId: string | undefined,
  templateId: string | undefined,
): {
  items: WithId<ChecklistTemplateItem>[];
  loading: boolean;
} {
  const [state, setState] = useState<{
    items: WithId<ChecklistTemplateItem>[];
    loading: boolean;
  }>({ items: [], loading: true });

  useEffect(() => {
    if (!householdId || !templateId) {
      setState({ items: [], loading: false });
      return;
    }
    const unsubscribe = onSnapshot(
      query(
        checklistTemplateItemsCollection(householdId, templateId),
        orderBy("position", "asc"),
      ),
      (snap) => {
        setState({
          items: snap.docs.map((d) => ({ ...d.data(), id: d.id })),
          loading: false,
        });
      },
      () => setState({ items: [], loading: false }),
    );
    return unsubscribe;
  }, [householdId, templateId]);

  return state;
}

export function useActiveChecklistRuns(householdId: string | undefined): {
  runs: WithId<ChecklistRun>[];
  loading: boolean;
} {
  const [state, setState] = useState<{
    runs: WithId<ChecklistRun>[];
    loading: boolean;
  }>({ runs: [], loading: true });

  useEffect(() => {
    if (!householdId) {
      setState({ runs: [], loading: false });
      return;
    }
    const unsubscribe = onSnapshot(
      query(
        checklistRunsCollection(householdId),
        where("completedAt", "==", null),
      ),
      (snap) => {
        setState({
          runs: snap.docs.map((d) => ({ ...d.data(), id: d.id })),
          loading: false,
        });
      },
      () => setState({ runs: [], loading: false }),
    );
    return unsubscribe;
  }, [householdId]);

  return state;
}
