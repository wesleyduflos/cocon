"use client";

import { getDoc } from "firebase/firestore";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useTasks } from "@/hooks/use-tasks";
import {
  isDueThisWeek,
  isDueToday,
  isOverdue,
  isRecentlyCompleted,
  userDoc,
} from "@/lib/firebase/firestore";
import type { Task, WithId } from "@/types/cocon";

type Filter = "all" | "me" | "other" | "unassigned";

function formatDueLabel(task: Pick<Task, "dueDate">): string | null {
  if (!task.dueDate) return null;
  return task.dueDate.toDate().toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function TaskRow({
  task,
  overdue,
}: {
  task: WithId<Task>;
  overdue?: boolean;
}) {
  const due = formatDueLabel(task);
  const isDone = task.status === "done";

  return (
    <Link
      href={`/tasks/${task.id}`}
      className={`rounded-[12px] border bg-surface px-4 py-3.5 flex items-center gap-3.5 hover:bg-surface-elevated transition-colors ${
        overdue ? "border-l-2 border-l-destructive border-y-border border-r-border" : "border-border"
      }`}
    >
      <div
        className={`w-5 h-5 rounded-[6px] border-[1.5px] flex items-center justify-center shrink-0 ${
          isDone
            ? "bg-secondary border-secondary"
            : "border-[#5C3D2C] bg-transparent"
        }`}
      >
        {isDone ? (
          <span className="text-[12px] text-secondary-foreground">✓</span>
        ) : null}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <span
          className={`text-[15px] font-medium truncate ${
            isDone ? "line-through text-muted-foreground" : "text-foreground"
          }`}
        >
          {task.title}
        </span>
        {task.category || due ? (
          <span className="text-[12px] text-muted-foreground truncate">
            {[task.category, due].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function Section({
  title,
  subtitle,
  tasks,
  overdue,
}: {
  title: string;
  subtitle?: string;
  tasks: WithId<Task>[];
  overdue?: WithId<Task>[];
}) {
  if (tasks.length === 0 && (!overdue || overdue.length === 0)) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-[11px] text-destructive">{subtitle}</p>
        ) : null}
      </div>
      <ul className="flex flex-col gap-2">
        {overdue?.map((t) => (
          <li key={t.id}>
            <TaskRow task={t} overdue />
          </li>
        ))}
        {tasks.map((t) => (
          <li key={t.id}>
            <TaskRow task={t} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { tasks, loading } = useTasks(household?.id);

  const [filter, setFilter] = useState<Filter>("all");
  const [otherMemberName, setOtherMemberName] = useState<string | null>(null);
  const otherMemberId = useMemo(
    () => household?.memberIds.find((uid) => uid !== user?.uid) ?? null,
    [household?.memberIds, user?.uid],
  );

  useEffect(() => {
    if (!otherMemberId) {
      setOtherMemberName(null);
      return;
    }
    let cancelled = false;
    getDoc(userDoc(otherMemberId))
      .then((snap) => {
        if (cancelled) return;
        const data = snap.data();
        setOtherMemberName(
          data?.displayName ?? data?.email?.split("@")[0] ?? "L'autre",
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [otherMemberId]);

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "me")
      return tasks.filter((t) => t.assigneeId === user?.uid);
    if (filter === "other")
      return tasks.filter((t) => t.assigneeId === otherMemberId);
    return tasks.filter((t) => !t.assigneeId);
  }, [tasks, filter, user?.uid, otherMemberId]);

  const groups = useMemo(() => {
    const now = new Date();
    const today: WithId<Task>[] = [];
    const overdue: WithId<Task>[] = [];
    const week: WithId<Task>[] = [];
    const later: WithId<Task>[] = [];
    const recent: WithId<Task>[] = [];
    for (const t of filtered) {
      if (t.status === "done") {
        if (isRecentlyCompleted(t, now)) recent.push(t);
        continue;
      }
      if (t.status === "cancelled") continue;
      if (isOverdue(t, now)) {
        overdue.push(t);
        continue;
      }
      if (isDueToday(t, now)) {
        today.push(t);
        continue;
      }
      if (isDueThisWeek(t, now)) {
        week.push(t);
        continue;
      }
      later.push(t);
    }
    return { today, overdue, week, later, recent };
  }, [filtered]);

  const pendingCount = useMemo(
    () => tasks.filter((t) => t.status === "pending").length,
    [tasks],
  );

  const hasAnyVisible =
    groups.today.length +
      groups.overdue.length +
      groups.week.length +
      groups.later.length +
      groups.recent.length >
    0;

  return (
    <main className="flex flex-1 flex-col px-5 py-6">
      <header className="flex items-center justify-between mb-5">
        <div className="flex flex-col gap-1">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            À faire
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
            Tâches{" "}
            <span className="text-muted-foreground font-normal text-[20px]">
              · {pendingCount}
            </span>
          </h1>
        </div>
        <Link
          href="/tasks/new"
          aria-label="Créer une tâche"
          className="w-10 h-10 rounded-[10px] bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_14px_rgba(255,107,36,0.45)] hover:bg-[var(--primary-hover)] transition-colors"
        >
          <Plus size={20} strokeWidth={2.4} />
        </Link>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-5 px-5 scrollbar-hide">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
        >
          Toutes
        </FilterChip>
        <FilterChip active={filter === "me"} onClick={() => setFilter("me")}>
          À moi
        </FilterChip>
        {otherMemberId && otherMemberName ? (
          <FilterChip
            active={filter === "other"}
            onClick={() => setFilter("other")}
          >
            À {otherMemberName}
          </FilterChip>
        ) : null}
        <FilterChip
          active={filter === "unassigned"}
          onClick={() => setFilter("unassigned")}
        >
          Non assignées
        </FilterChip>
      </div>

      {loading ? (
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      ) : !hasAnyVisible ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="text-[40px] leading-none">📝</div>
          <h2 className="font-display text-[22px] font-semibold leading-[1.1]">
            Rien à faire{" "}
            <span className="greeting-gradient">aujourd&apos;hui</span>
          </h2>
          <p className="text-[14px] text-muted-foreground max-w-[260px] leading-[1.5]">
            {filter === "all"
              ? "Profite — c'est rare. On garde tout en mémoire pour demain."
              : "Aucune tâche dans ce filtre."}
          </p>
          {filter === "all" ? (
            <Link
              href="/tasks/new"
              className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors mt-2"
            >
              Créer une tâche →
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Section
            title="Aujourd'hui"
            subtitle={
              groups.overdue.length > 0
                ? `${groups.overdue.length} en retard`
                : undefined
            }
            tasks={groups.today}
            overdue={groups.overdue}
          />
          <Section title="Cette semaine" tasks={groups.week} />
          <Section title="Plus tard" tasks={groups.later} />
          <Section title="Fait récemment" tasks={groups.recent} />
        </div>
      )}
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full whitespace-nowrap px-3.5 py-1.5 text-[13px] font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(255,107,36,0.4)]"
          : "bg-surface border border-border text-muted-foreground hover:bg-surface-elevated"
      }`}
    >
      {children}
    </button>
  );
}
