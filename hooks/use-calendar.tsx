"use client";

import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { calendarEventsInRangeQuery } from "@/lib/firebase/firestore";
import type { CalendarEvent, WithId } from "@/types/cocon";

interface CalendarEventsState {
  events: WithId<CalendarEvent>[];
  loading: boolean;
}

/**
 * Souscrit en temps réel aux événements d'un cocon dans une fenêtre
 * temporelle. Recommandé : ouvrir une fenêtre par mois affiché pour
 * limiter le coût de lecture.
 *
 * Les dépendances utilisent `.getTime()` pour comparer les Date en
 * primitive et éviter des re-subscriptions à chaque render.
 */
export function useCalendarEvents(
  householdId: string | undefined,
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEventsState {
  const [state, setState] = useState<CalendarEventsState>({
    events: [],
    loading: true,
  });

  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();

  useEffect(() => {
    if (!householdId) {
      setState({ events: [], loading: false });
      return;
    }

    const unsubscribe = onSnapshot(
      calendarEventsInRangeQuery(
        householdId,
        new Date(startMs),
        new Date(endMs),
      ),
      (snap) => {
        setState({
          events: snap.docs.map((d) => ({ ...d.data(), id: d.id })),
          loading: false,
        });
      },
      () => {
        setState({ events: [], loading: false });
      },
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, startMs, endMs]);

  return state;
}
