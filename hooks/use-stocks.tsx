"use client";

import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { stocksCollection } from "@/lib/firebase/firestore";
import type { StockItem, WithId } from "@/types/cocon";

export function useStocks(householdId: string | undefined): {
  stocks: WithId<StockItem>[];
  loading: boolean;
} {
  const [state, setState] = useState<{
    stocks: WithId<StockItem>[];
    loading: boolean;
  }>({ stocks: [], loading: true });

  useEffect(() => {
    if (!householdId) {
      setState({ stocks: [], loading: false });
      return;
    }
    const unsubscribe = onSnapshot(
      stocksCollection(householdId),
      (snap) => {
        setState({
          stocks: snap.docs.map((d) => ({ ...d.data(), id: d.id })),
          loading: false,
        });
      },
      () => setState({ stocks: [], loading: false }),
    );
    return unsubscribe;
  }, [householdId]);

  return state;
}
