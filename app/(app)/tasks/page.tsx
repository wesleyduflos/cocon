"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { TaskRow } from "@/components/tasks/task-row";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useMembers } from "@/hooks/use-members";
import { useTasks } from "@/hooks/use-tasks";
import {
  isDueThisWeek,
  isDueToday,
  isOverdue,
  isRecentlyCompleted,
} from "@/lib/firebase/firestore";
import { sortByPriorityThenDue } from "@/lib/tasks/sort";
import type { Task, WithId } from "@/types/cocon";

type Filter = "all" | "me" | "other" | "unassigned";

function Section({
  title,
  subtitle,
  tasks,
  overdue,
  householdId,
  userId,
}: {
  title: string;
  subtitle?: string;
  tasks: WithId<Task>[];
  overdue?: WithId<Task>[];
  householdId: string;
  userId: string;
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
            <TaskRow
              task={t}
              overdue
              householdId={householdId}
              userId={userId}
            />
          </li>
        ))}
        {tasks.map((t) => (
          <li key={t.id}>
            <TaskRow task={t} householdId={householdId} userId={userId} />
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
  const { members } = useMembers(household?.memberIds);
  const otherMember = useMemo(
    () => members.find((m) => m.uid !== user?.uid) ?? null,
    [members, user?.uid],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "me")
      return tasks.filter((t) => t.assigneeId === user?.uid);
    if (filter === "other")
      return tasks.filter((t) => t.assigneeId === otherMember?.uid);
    return tasks.filter((t) => !t.assigneeId);
  }, [tasks, filter, user?.uid, otherMember]);

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
    // Sprint 5 B.4 : prioritaires en haut de chaque section temporelle
    return {
      today: sortByPriorityThenDue(today),
      overdue: sortByPriorityThenDue(overdue),
      week: sortByPriorityThenDue(week),
      later: sortByPriorityThenDue(later),
      recent,
    };
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
        {otherMember ? (
          <FilterChip
            active={filter === "other"}
            onClick={() => setFilter("other")}
          >
            À {otherMember.displayName}
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
      ) : household && user ? (
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
            householdId={household.id}
            userId={user.uid}
          />
          <Section
            title="Cette semaine"
            tasks={groups.week}
            householdId={household.id}
            userId={user.uid}
          />
          <Section
            title="Plus tard"
            tasks={groups.later}
            householdId={household.id}
            userId={user.uid}
          />
          <Section
            title="Fait récemment"
            tasks={groups.recent}
            householdId={household.id}
            userId={user.uid}
          />
        </div>
      ) : null}
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
