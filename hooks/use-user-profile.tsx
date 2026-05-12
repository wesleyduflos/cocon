"use client";

import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { userDoc } from "@/lib/firebase/firestore";
import type { User } from "@/types/cocon";

/* =========================================================================
   useCurrentUserProfile

   Source de verite : le document Firestore `users/{uid}`.

   Pourquoi pas Firebase Auth (`user.displayName`) ? Parce qu'Auth ne se
   met pas a jour automatiquement quand on modifie le nom dans Settings —
   il faut appeler `updateProfile()` explicitement. Le code Cocon n'a
   jamais fait ca, donc Auth contient l'ancien (souvent vide) et tous
   les composants qui lisent `user.displayName` voient un nom stale.

   Avec ce hook + `onSnapshot`, toute mise a jour du doc Firestore se
   propage instantanement a tous les composants abonnes (dashboard,
   /settings, journal personnalise, etc).

   Capture comme gotcha #24 dans feedback_firebase_gotchas.md.
   ========================================================================= */

export interface CurrentUserProfile {
  uid: string;
  email: string;
  displayName: string;
  /** Premier prenom (split sur l'espace) — pratique pour les greetings. */
  firstName: string;
  raw: User | null;
}

interface State {
  profile: CurrentUserProfile | null;
  loading: boolean;
}

export function useCurrentUserProfile(): State {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<State>({ profile: null, loading: true });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ profile: null, loading: false });
      return;
    }
    const unsubscribe = onSnapshot(
      userDoc(user.uid),
      (snap) => {
        const data = snap.data();
        if (!data) {
          // Doc Firestore manquant (rare — devrait avoir ete cree au signup).
          // Fallback gracieux : on utilise l'email pour ne pas casser l'UI.
          const fallbackEmail = user.email ?? "";
          const fallbackName =
            fallbackEmail.split("@")[0] || "Membre du cocon";
          setState({
            profile: {
              uid: user.uid,
              email: fallbackEmail,
              displayName: fallbackName,
              firstName: fallbackName,
              raw: null,
            },
            loading: false,
          });
          return;
        }
        const displayName = data.displayName ?? data.email?.split("@")[0] ?? "";
        const firstName = displayName.split(" ")[0] || "toi";
        setState({
          profile: {
            uid: user.uid,
            email: data.email ?? user.email ?? "",
            displayName,
            firstName,
            raw: data,
          },
          loading: false,
        });
      },
      () => {
        setState((s) => ({ ...s, loading: false }));
      },
    );
    return unsubscribe;
  }, [user, authLoading]);

  return state;
}
