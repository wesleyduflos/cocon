"use client";

import { Timestamp } from "firebase/firestore";
import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { RecurrencePicker } from "@/components/tasks/recurrence-picker";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { createCalendarEvent } from "@/lib/firebase/firestore";

function toDatetimeLocalString(d: Date): string {
  // Format compatible <input type="datetime-local"> sans secondes.
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function toDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export default function NewCalendarEventPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startDatetime, setStartDatetime] = useState("");
  const [endDatetime, setEndDatetime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pré-remplir avec ?date=YYYY-MM-DD ou avec la date d'aujourd'hui.
    const dateParam = searchParams.get("date");
    const base = dateParam ? parseDateString(dateParam) : new Date();
    const at9 = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      9,
      0,
    );
    const at10 = new Date(at9.getTime() + 60 * 60 * 1000);
    setStartDate(toDateString(base));
    setStartDatetime(toDatetimeLocalString(at9));
    setEndDatetime(toDatetimeLocalString(at10));
  }, [searchParams]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !household) return;
    setError(null);
    setSubmitting(true);
    try {
      const start = allDay
        ? new Date(`${startDate}T00:00:00`)
        : new Date(startDatetime);
      const end = allDay
        ? new Date(`${startDate}T23:59:59`)
        : endDatetime
          ? new Date(endDatetime)
          : undefined;

      if (Number.isNaN(start.getTime())) {
        setError("Date de début invalide.");
        setSubmitting(false);
        return;
      }
      if (end && Number.isNaN(end.getTime())) {
        setError("Date de fin invalide.");
        setSubmitting(false);
        return;
      }

      await createCalendarEvent(household.id, {
        title: title.trim(),
        allDay,
        startTime: Timestamp.fromDate(start),
        endTime: end ? Timestamp.fromDate(end) : undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        recurrenceRule: recurrenceRule ?? undefined,
        createdBy: user.uid,
      });
      router.replace("/calendar");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Création impossible. Réessaie.",
      );
      setSubmitting(false);
    }
  }

  const canSubmit = title.trim().length > 0 && !submitting;

  return (
    <main className="flex flex-1 flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-background/85 backdrop-blur-xl border-b border-border">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Fermer"
          className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
        >
          <X size={18} />
        </button>
        <h1 className="text-[15px] font-medium">Nouvel événement</h1>
        <button
          type="submit"
          form="new-event-form"
          disabled={!canSubmit}
          className={`px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-colors ${
            canSubmit
              ? "text-primary hover:text-[var(--primary-hover)]"
              : "text-foreground-faint cursor-not-allowed"
          }`}
        >
          {submitting ? "..." : "Enregistrer"}
        </button>
      </header>

      <form
        id="new-event-form"
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-6 px-5 py-6 max-w-md w-full mx-auto"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="event-title"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Titre
          </label>
          <input
            id="event-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex. RDV vétérinaire"
            required
            autoFocus
            disabled={submitting}
            className="font-display text-[22px] font-semibold bg-transparent border-b border-border focus:border-primary outline-none py-2 placeholder:text-foreground-faint placeholder:font-normal placeholder:font-sans placeholder:text-[16px]"
          />
        </div>

        <label className="flex items-center justify-between rounded-[12px] border border-border bg-surface px-4 py-3 cursor-pointer">
          <span className="text-[14px] font-medium">Toute la journée</span>
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            disabled={submitting}
            className="w-5 h-5 accent-primary"
          />
        </label>

        {allDay ? (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="event-date"
              className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
            >
              Date
            </label>
            <input
              id="event-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              disabled={submitting}
              className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[15px] focus:outline-none focus:border-primary"
            />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="event-start"
                className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
              >
                Début
              </label>
              <input
                id="event-start"
                type="datetime-local"
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
                required
                disabled={submitting}
                className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[15px] focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="event-end"
                className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
              >
                Fin (facultatif)
              </label>
              <input
                id="event-end"
                type="datetime-local"
                value={endDatetime}
                onChange={(e) => setEndDatetime(e.target.value)}
                disabled={submitting}
                className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[15px] focus:outline-none focus:border-primary"
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-2">
          <label
            htmlFor="event-location"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Lieu (facultatif)
          </label>
          <input
            id="event-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="ex. Cabinet du Dr Lefèvre"
            disabled={submitting}
            className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[15px] focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="event-description"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Description (facultatif)
          </label>
          <textarea
            id="event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={submitting}
            className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[14px] focus:outline-none focus:border-primary resize-none"
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Récurrence
          </span>
          <RecurrencePicker
            value={recurrenceRule}
            onChange={setRecurrenceRule}
            disabled={submitting}
          />
        </div>

        {error ? (
          <p role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </main>
  );
}
