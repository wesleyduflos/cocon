"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { TaskSection } from "@/components/tasks/task-section";
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
import {
  countTasksMatching,
  filterTasks,
  filtersEqual,
  type TaskFilter,
} from "@/lib/tasks/filters";
import { sortTasksWithManualOrder } from "@/lib/tasks/sort";
import type { Task, WithId } from "@/types/cocon";


export default function TasksPage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { tasks, loading } = useTasks(household?.id);

  const [activeFilters, setActiveFilters] = useState<TaskFilter[]>([]);
  const { members } = useMembers(household?.memberIds);
  const otherMember = useMemo(
    () => members.find((m) => m.uid !== user?.uid) ?? null,
    [members, user?.uid],
  );

  const filtered = useMemo(
    () => filterTasks(tasks, activeFilters),
    [tasks, activeFilters],
  );

  const toggleFilter = (f: TaskFilter) => {
    setActiveFilters((prev) =>
      prev.some((p) => filtersEqual(p, f))
        ? prev.filter((p) => !filtersEqual(p, f))
        : [...prev, f],
    );
  };

  const isFilterActive = (f: TaskFilter) =>
    activeFilters.some((p) => filtersEqual(p, f));

  const meFilter: TaskFilter | null = user
    ? { kind: "me", uid: user.uid }
    : null;
  const otherFilter: TaskFilter | null = otherMember
    ? { kind: "member", uid: otherMember.uid }
    : null;
  const unassignedFilter: TaskFilter = { kind: "unassigned" };

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
    // Sprint 6 D.6 : manualOrder en premier, puis fallback prio + due
    return {
      today: sortTasksWithManualOrder(today),
      overdue: sortTasksWithManualOrder(overdue),
      week: sortTasksWithManualOrder(week),
      later: sortTasksWithManualOrder(later),
      recent,
    };
  }, [filtered]);

  // Sprint 6 D.2 — quand une section est en mode ordonner, les autres se grisent.
  const [activeReorderSection, setActiveReorderSection] = useState<
    "today" | "week" | "later" | null
  >(null);

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
    <main className="flex flex-1 flex-col">
      {/* Header + filtres sticky pour rester visibles au scroll */}
      <div
        className="sticky top-0 z-20 px-5 pt-6 pb-3 bg-background/90 backdrop-blur-xl border-b border-border-subtle"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 18px)" }}
      >
        <header className="flex items-center justify-between mb-4">
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

        <div className="flex gap-2 overflow-x-auto -mx-5 px-5 scrollbar-hide">
          {meFilter ? (
            <FilterChip
              active={isFilterActive(meFilter)}
              onClick={() => toggleFilter(meFilter)}
              count={countTasksMatching(tasks, meFilter)}
            >
              À moi
            </FilterChip>
          ) : null}
          {otherFilter && otherMember ? (
            <FilterChip
              active={isFilterActive(otherFilter)}
              onClick={() => toggleFilter(otherFilter)}
              count={countTasksMatching(tasks, otherFilter)}
            >
              À {otherMember.displayName}
            </FilterChip>
          ) : null}
          <FilterChip
            active={isFilterActive(unassignedFilter)}
            onClick={() => toggleFilter(unassignedFilter)}
            count={countTasksMatching(tasks, unassignedFilter)}
          >
            Non assignées
          </FilterChip>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 pt-5 pb-6">
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
            {activeFilters.length === 0
              ? "Profite — c'est rare. On garde tout en mémoire pour demain."
              : "Aucune tâche ne correspond aux filtres actifs."}
          </p>
          {activeFilters.length === 0 ? (
            <Link
              href="/tasks/new"
              className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors mt-2"
            >
              Créer une tâche →
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setActiveFilters([])}
              className="rounded-[12px] border border-border bg-surface text-foreground font-sans font-medium text-[13px] px-4 py-2 hover:bg-surface-elevated transition-colors mt-2"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      ) : household && user ? (
        <div className="flex flex-col gap-6">
          <TaskSection
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
            dimmed={
              activeReorderSection !== null &&
              activeReorderSection !== "today"
            }
            onReorderStart={() => setActiveReorderSection("today")}
            onReorderEnd={() => setActiveReorderSection(null)}
          />
          <TaskSection
            title="Cette semaine"
            tasks={groups.week}
            householdId={household.id}
            userId={user.uid}
            dimmed={
              activeReorderSection !== null &&
              activeReorderSection !== "week"
            }
            onReorderStart={() => setActiveReorderSection("week")}
            onReorderEnd={() => setActiveReorderSection(null)}
          />
          <TaskSection
            title="Plus tard"
            tasks={groups.later}
            householdId={household.id}
            userId={user.uid}
            dimmed={
              activeReorderSection !== null &&
              activeReorderSection !== "later"
            }
            onReorderStart={() => setActiveReorderSection("later")}
            onReorderEnd={() => setActiveReorderSection(null)}
          />
          <TaskSection
            title="Fait récemment"
            tasks={groups.recent}
            householdId={household.id}
            userId={user.uid}
            reorderable={false}
            dimmed={activeReorderSection !== null}
          />
        </div>
      ) : null}
      </div>
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
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
      {typeof count === "number" ? (
        <span
          className={`ml-1.5 text-[11px] font-semibold ${
            active ? "opacity-80" : "opacity-70"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
