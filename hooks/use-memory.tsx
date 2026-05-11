"use client";

import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { memoryEntriesCollection } from "@/lib/firebase/firestore";
import type { MemoryEntry, WithId } from "@/types/cocon";

export function useMemoryEntries(householdId: string | undefined): {
  entries: WithId<MemoryEntry>[];
  loading: boolean;
} {
  const [state, setState] = useState<{
    entries: WithId<MemoryEntry>[];
    loading: boolean;
  }>({ entries: [], loading: true });

  useEffect(() => {
    if (!householdId) {
      setState({ entries: [], loading: false });
      return;
    }
    const unsubscribe = onSnapshot(
      memoryEntriesCollection(householdId),
      (snap) => {
        setState({
          entries: snap.docs.map((d) => ({ ...d.data(), id: d.id })),
          loading: false,
        });
      },
      () => setState({ entries: [], loading: false }),
    );
    return unsubscribe;
  }, [householdId]);

  return state;
}
