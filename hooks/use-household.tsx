"use client";

import { onSnapshot, query, where } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/hooks/use-auth";
import { householdsCollection } from "@/lib/firebase/firestore";
import type { Household, WithId } from "@/types/cocon";

interface HouseholdState {
  household: WithId<Household> | null;
  loading: boolean;
}

const HouseholdContext = createContext<HouseholdState>({
  household: null,
  loading: true,
});

/**
 * Provider qui souscrit au premier cocon du user authentifié via onSnapshot
 * (sync temps réel). Si le user n'a pas de cocon, `household` est null et
 * `loading` passe à false — le layout (app) redirige alors vers /onboarding.
 */
export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<HouseholdState>({
    household: null,
    loading: true,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ household: null, loading: false });
      return;
    }

    const q = query(
      householdsCollection(),
      where("memberIds", "array-contains", user.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const first = snap.docs[0];
        setState({
          household: first ? { ...first.data(), id: first.id } : null,
          loading: false,
        });
      },
      () => {
        setState({ household: null, loading: false });
      },
    );

    return unsubscribe;
  }, [user, authLoading]);

  return (
    <HouseholdContext.Provider value={state}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useCurrentHousehold(): HouseholdState {
  return useContext(HouseholdContext);
}
