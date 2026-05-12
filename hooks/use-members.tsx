"use client";

import { getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

import { userDoc } from "@/lib/firebase/firestore";

export interface MemberProfile {
  uid: string;
  displayName: string;
  email: string;
  /** Emoji choisi par le membre (sprint 5 polish). Fallback : initiale. */
  avatarEmoji?: string;
}

/**
 * Charge les profils utilisateur pour une liste d'uid (typiquement
 * `household.memberIds`). Les résultats ne sont pas mis en cache —
 * usage typique : monter une fois par page qui en a besoin.
 *
 * En cas d'erreur sur un uid (rule denied par ex), on retourne quand
 * même une entrée avec un displayName fallback pour ne pas casser l'UI.
 */
export function useMembers(memberIds: string[] | undefined): {
  members: MemberProfile[];
  loading: boolean;
} {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Stable key for dependency (avoid re-running if array ref changes but content doesn't)
  const key = memberIds?.join(",") ?? "";

  useEffect(() => {
    if (!memberIds || memberIds.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(
      memberIds.map(async (uid): Promise<MemberProfile> => {
        try {
          const snap = await getDoc(userDoc(uid));
          const data = snap.data();
          return {
            uid,
            displayName:
              data?.displayName ?? data?.email?.split("@")[0] ?? "Membre",
            email: data?.email ?? "",
            avatarEmoji: data?.avatarEmoji,
          };
        } catch {
          return { uid, displayName: "Membre", email: "" };
        }
      }),
    ).then((result) => {
      if (cancelled) return;
      setMembers(result);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { members, loading };
}
