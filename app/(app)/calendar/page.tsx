"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useCalendarEvents } from "@/hooks/use-calendar";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useTasks } from "@/hooks/use-tasks";
import type { CalendarEvent, Task, WithId } from "@/types/cocon";

const WEEKDAY_HEADERS = ["L", "M", "M", "J", "V", "S", "D"];

/* Helpers purs (sans timezone surprises : on travaille en local) */

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

function getMondayBefore(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthGridDays(monthAnchor: Date): Date[] {
  const first = startOfMonth(monthAnchor);
  const start = getMondayBefore(first);
  return Array.from({ length: 42 }, (_, i) => {
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
  });
}

function formatMonthHeader(d: Date): string {
  return d
    .toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
}

function formatDayHeader(d: Date): string {
  return d
    .toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .replace(/^./, (c) => c.toUpperCase());
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* Composants */

interface MonthGridProps {
  monthAnchor: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  eventsByDay: Map<string, WithId<CalendarEvent>[]>;
  tasksByDay: Map<string, WithId<Task>[]>;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function MonthGrid({
  monthAnchor,
  selectedDate,
  onSelectDate,
  eventsByDay,
  tasksByDay,
}: MonthGridProps) {
  const days = useMemo(() => getMonthGridDays(monthAnchor), [monthAnchor]);
  const today = new Date();
  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEKDAY_HEADERS.map((label, i) => (
        <div
          key={i}
          className="text-center text-[10px] uppercase tracking-[0.1em] text-foreground-faint pb-1"
        >
          {label}
        </div>
      ))}
      {days.map((d, i) => {
        const isCurrentMonth = d.getMonth() === monthAnchor.getMonth();
        const isToday = isSameDay(d, today);
        const isSelected = isSameDay(d, selectedDate);
        const key = dayKey(d);
        const evs = eventsByDay.get(key) ?? [];
        const tasks = tasksByDay.get(key) ?? [];
        const hasContent = evs.length > 0 || tasks.length > 0;
        const hasAllDay = evs.some((e) => e.allDay);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelectDate(d)}
            aria-pressed={isSelected}
            aria-label={d.toLocaleDateString("fr-FR")}
            className={`aspect-square flex flex-col items-center justify-center rounded-[10px] text-[13px] transition-all ${
              isSelected
                ? "bg-primary text-primary-foreground"
                : isToday
                  ? "bg-[rgba(255,107,36,0.12)] text-primary"
                  : isCurrentMonth
                    ? "text-foreground hover:bg-surface"
                    : "text-foreground-faint hover:bg-surface-elevated"
            }`}
          >
            <span className={isToday && !isSelected ? "font-semibold" : ""}>
              {d.getDate()}
            </span>
            {hasContent ? (
              <span className="flex gap-0.5 mt-0.5">
                {hasAllDay ? (
                  <span className="w-1 h-1 rounded-full bg-highlight" />
                ) : null}
                {evs.length > 0 ? (
                  <span className="w-1 h-1 rounded-full bg-primary" />
                ) : null}
                {tasks.length > 0 ? (
                  <span className="w-1 h-1 rounded-full bg-secondary" />
                ) : null}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();

  const [monthAnchor, setMonthAnchor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // Fenêtre étendue : du lundi avant le 1er du mois affiché au samedi après
  // le dernier jour du mois affiché (6 semaines = 42 jours).
  const { rangeStart, rangeEnd } = useMemo(() => {
    const days = getMonthGridDays(monthAnchor);
    const start = new Date(
      days[0].getFullYear(),
      days[0].getMonth(),
      days[0].getDate(),
    );
    const last = days[days.length - 1];
    const end = new Date(
      last.getFullYear(),
      last.getMonth(),
      last.getDate(),
      23,
      59,
      59,
    );
    return { rangeStart: start, rangeEnd: end };
  }, [monthAnchor]);

  const { events } = useCalendarEvents(household?.id, rangeStart, rangeEnd);
  const { tasks } = useTasks(household?.id);

  // Index par jour pour rendu rapide du mini-mois
  const eventsByDay = useMemo(() => {
    const map = new Map<string, WithId<CalendarEvent>[]>();
    for (const e of events) {
      const d = e.startTime.toDate();
      const k = dayKey(d);
      const list = map.get(k) ?? [];
      list.push(e);
      map.set(k, list);
    }
    return map;
  }, [events]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, WithId<Task>[]>();
    for (const t of tasks) {
      if (!t.dueDate || t.status === "done" || t.status === "cancelled")
        continue;
      const k = dayKey(t.dueDate.toDate());
      const list = map.get(k) ?? [];
      list.push(t);
      map.set(k, list);
    }
    return map;
  }, [tasks]);

  const selectedKey = dayKey(selectedDate);
  const selectedEvents = (eventsByDay.get(selectedKey) ?? []).slice().sort(
    (a, b) => a.startTime.toMillis() - b.startTime.toMillis(),
  );
  const selectedTasks = tasksByDay.get(selectedKey) ?? [];

  function previousMonth() {
    setMonthAnchor(
      new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1),
    );
  }
  function nextMonth() {
    setMonthAnchor(
      new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1),
    );
  }
  function jumpToday() {
    const today = new Date();
    setMonthAnchor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-6">
      <div className="w-full max-w-md mx-auto flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={previousMonth}
              aria-label="Mois précédent"
              className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-surface transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={jumpToday}
              className="font-display text-[20px] font-semibold leading-tight px-2 py-1 rounded-[8px] hover:bg-surface transition-colors"
            >
              {formatMonthHeader(monthAnchor)}
            </button>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Mois suivant"
              className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-surface transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <Link
            href={`/calendar/new?date=${selectedDate.toISOString().slice(0, 10)}`}
            aria-label="Créer un événement"
            className="w-10 h-10 rounded-[10px] bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_14px_rgba(255,107,36,0.45)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus size={20} strokeWidth={2.4} />
          </Link>
        </header>

        <MonthGrid
          monthAnchor={monthAnchor}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          eventsByDay={eventsByDay}
          tasksByDay={tasksByDay}
        />

        <section className="flex flex-col gap-3">
          <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            {formatDayHeader(selectedDate)}
          </h2>
          {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
            <div className="rounded-[12px] border border-border-subtle bg-transparent px-4 py-6 flex flex-col items-center gap-1 text-center">
              <span className="text-[14px] text-muted-foreground">
                Journée libre comme l&apos;air
              </span>
              <span className="text-[12px] text-foreground-faint">
                Aucun rendez-vous, aucun rappel.
              </span>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedEvents.map((e) => (
                <li key={e.id}>
                  <CalendarEventRow event={e} userId={user?.uid ?? ""} />
                </li>
              ))}
              {selectedTasks.map((t) => (
                <li key={`task-${t.id}`}>
                  <TaskInCalendarRow task={t} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function CalendarEventRow({
  event,
  userId,
}: {
  event: WithId<CalendarEvent>;
  userId: string;
}) {
  const isMine = event.createdBy === userId;
  const isExternal = event.source !== "local";
  const startD = event.startTime.toDate();
  const endD = event.endTime?.toDate();
  const timeLabel = event.allDay
    ? "Toute la journée"
    : endD
      ? `${formatTime(startD)} – ${formatTime(endD)}`
      : formatTime(startD);

  const barColor = isExternal
    ? "bg-foreground-faint"
    : isMine
      ? "bg-primary"
      : "bg-secondary";

  return (
    <Link
      href={`/calendar/${event.id}`}
      className="rounded-[12px] border border-border bg-surface flex items-stretch overflow-hidden hover:bg-surface-elevated transition-colors"
    >
      <span className={`w-1 ${barColor}`} aria-hidden />
      <div className="flex-1 flex flex-col gap-0.5 px-4 py-3 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-foreground truncate">
            {event.title}
          </span>
          {isExternal ? (
            <span className="text-[10px] uppercase tracking-[0.1em] text-foreground-faint">
              {event.source}
            </span>
          ) : null}
        </div>
        <span className="text-[12px] text-muted-foreground">
          {timeLabel}
          {event.location ? ` · ${event.location}` : ""}
        </span>
      </div>
    </Link>
  );
}

function TaskInCalendarRow({ task }: { task: WithId<Task> }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="rounded-[12px] border border-dashed border-[rgba(255,107,36,0.55)] bg-surface flex items-stretch overflow-hidden hover:bg-surface-elevated transition-colors"
    >
      <div className="flex-1 flex flex-col gap-0.5 px-4 py-3 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.1em] text-primary">
            Tâche
          </span>
          <span className="text-[14px] font-medium text-foreground truncate">
            {task.title}
          </span>
        </div>
        {task.category ? (
          <span className="text-[12px] text-muted-foreground">
            {task.category}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
