"use client";

import { onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

import { suggestionsCollection } from "@/lib/firebase/firestore";
import type { Suggestion, WithId } from "@/types/cocon";

export function usePendingSuggestions(householdId: string | undefined): {
  suggestions: WithId<Suggestion>[];
  loading: boolean;
} {
  const [state, setState] = useState<{
    suggestions: WithId<Suggestion>[];
    loading: boolean;
  }>({ suggestions: [], loading: true });

  useEffect(() => {
    if (!householdId) {
      setState({ suggestions: [], loading: false });
      return;
    }
    const unsubscribe = onSnapshot(
      query(
        suggestionsCollection(householdId),
        where("status", "==", "pending"),
      ),
      (snap) => {
        setState({
          suggestions: snap.docs.map((d) => ({ ...d.data(), id: d.id })),
          loading: false,
        });
      },
      () => setState({ suggestions: [], loading: false }),
    );
    return unsubscribe;
  }, [householdId]);

  return state;
}
