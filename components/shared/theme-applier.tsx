"use client";

import { onSnapshot } from "firebase/firestore";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";
import { userDoc } from "@/lib/firebase/firestore";

/**
 * Applique la classe `.dark` ou `.light` sur l'élément <html> en fonction
 * de la préférence stockée dans `users/{uid}.preferences.theme`. Souscrit
 * en temps réel pour propager les changements immédiatement.
 *
 * Convention : dark par défaut (correspond au SSR via app/layout.tsx).
 * Si l'utilisateur choisit "light", on retire la classe dark.
 */
export function ThemeApplier() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(userDoc(user.uid), (snap) => {
      const theme = snap.data()?.preferences?.theme;
      const root = document.documentElement;
      if (theme === "light") {
        root.classList.remove("dark");
      } else {
        // "dark" ou "system" → on garde dark (sprint 1 ne fait pas le
        // detection prefers-color-scheme côté système ; sera fait en
        // sub-task ultérieure si besoin).
        root.classList.add("dark");
      }
    });
    return unsubscribe;
  }, [user]);

  return null;
}
