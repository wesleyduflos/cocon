"use client";

import { onSnapshot } from "firebase/firestore";
import { ArrowLeft, MapPin, Repeat, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useCurrentHousehold } from "@/hooks/use-household";
import {
  deleteCalendarEvent,
  householdCalendarEventDoc,
} from "@/lib/firebase/firestore";
import { describeRRule } from "@/lib/recurrence";
import type { CalendarEvent, WithId } from "@/types/cocon";

function formatDateLong(d: Date): string {
  return d
    .toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .replace(/^./, (c) => c.toUpperCase());
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function CalendarEventDetailPage() {
  const router = useRouter();
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const { household } = useCurrentHousehold();

  const [event, setEvent] = useState<WithId<CalendarEvent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    if (!household?.id || !eventId) return;
    const unsubscribe = onSnapshot(
      householdCalendarEventDoc(household.id, eventId),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setEvent({ ...snap.data(), id: snap.id });
        setLoading(false);
      },
      () => {
        setNotFound(true);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [household?.id, eventId]);

  async function handleDelete() {
    if (!household || !event) return;
    if (!window.confirm("Supprimer cet événement ?")) return;
    setActionPending(true);
    try {
      await deleteCalendarEvent(household.id, event.id);
      router.replace("/calendar");
    } catch {
      setActionPending(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  if (notFound || !event) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 gap-4">
        <p className="text-[14px] text-muted-foreground">
          Événement introuvable ou supprimé.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/calendar")}
          className="rounded-[12px] border border-border bg-transparent text-foreground font-sans font-semibold text-[14px] px-[16px] py-2 hover:bg-surface-elevated transition-colors"
        >
          Retour au calendrier
        </button>
      </main>
    );
  }

  const start = event.startTime.toDate();
  const end = event.endTime?.toDate();
  const isExternal = event.source !== "local";
  const dateStr = formatDateLong(start);
  const timeStr = event.allDay
    ? "Toute la journée"
    : end
      ? `${formatTime(start)} – ${formatTime(end)}`
      : formatTime(start);

  return (
    <main className="flex flex-1 flex-col px-5 py-4">
      <header className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        {!isExternal ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={actionPending}
            aria-label="Supprimer"
            className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors disabled:opacity-50"
          >
            <Trash2 size={18} />
          </button>
        ) : null}
      </header>

      <div className="flex flex-col gap-6 max-w-md w-full mx-auto">
        <section className="flex flex-col gap-3">
          {isExternal ? (
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-foreground-faint">
              Source : {event.source}
            </p>
          ) : null}
          <h1 className="font-display text-[28px] font-semibold leading-[1.1]">
            {event.title}
          </h1>
          {event.description ? (
            <p className="text-[15px] text-muted-foreground leading-[1.5] whitespace-pre-wrap">
              {event.description}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <div className="rounded-[14px] border border-border bg-surface px-4 py-3 flex flex-col gap-1">
            <p className="text-[14px] font-medium capitalize">{dateStr}</p>
            <p className="text-[13px] text-muted-foreground">{timeStr}</p>
          </div>
          {event.location ? (
            <div className="rounded-[14px] border border-border bg-surface px-4 py-3 flex items-center gap-3">
              <MapPin size={16} className="text-primary shrink-0" />
              <span className="text-[14px] text-foreground">
                {event.location}
              </span>
            </div>
          ) : null}
          {event.recurrenceRule ? (
            <div className="rounded-[14px] border border-border bg-surface px-4 py-3 flex items-center gap-3">
              <Repeat size={16} className="text-primary shrink-0" />
              <span className="text-[14px] text-foreground">
                {describeRRule(event.recurrenceRule)}
              </span>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
