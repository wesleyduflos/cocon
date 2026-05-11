"use client";

import { onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import {
  quickAddItemsCollection,
  shoppingItemsCollection,
} from "@/lib/firebase/firestore";
import type { QuickAddItem, ShoppingItem, WithId } from "@/types/cocon";

interface ShoppingItemsState {
  items: WithId<ShoppingItem>[];
  loading: boolean;
}

export function useShoppingItems(
  householdId: string | undefined,
): ShoppingItemsState {
  const [state, setState] = useState<ShoppingItemsState>({
    items: [],
    loading: true,
  });

  useEffect(() => {
    if (!householdId) {
      setState({ items: [], loading: false });
      return;
    }
    const unsubscribe = onSnapshot(
      shoppingItemsCollection(householdId),
      (snap) => {
        setState({
          items: snap.docs.map((d) => ({ ...d.data(), id: d.id })),
          loading: false,
        });
      },
      () => setState({ items: [], loading: false }),
    );
    return unsubscribe;
  }, [householdId]);

  return state;
}

interface QuickAddItemsState {
  items: WithId<QuickAddItem>[];
  loading: boolean;
}

export function useQuickAddItems(
  householdId: string | undefined,
): QuickAddItemsState {
  const [state, setState] = useState<QuickAddItemsState>({
    items: [],
    loading: true,
  });

  useEffect(() => {
    if (!householdId) {
      setState({ items: [], loading: false });
      return;
    }
    const unsubscribe = onSnapshot(
      query(quickAddItemsCollection(householdId), orderBy("position", "asc")),
      (snap) => {
        setState({
          items: snap.docs.map((d) => ({ ...d.data(), id: d.id })),
          loading: false,
        });
      },
      () => setState({ items: [], loading: false }),
    );
    return unsubscribe;
  }, [householdId]);

  return state;
}
