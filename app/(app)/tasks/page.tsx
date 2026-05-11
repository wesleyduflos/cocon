"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { useCurrentHousehold } from "@/hooks/use-household";
import { useTasks } from "@/hooks/use-tasks";
import type { Task, WithId } from "@/types/cocon";

function formatDueLabel(task: Pick<Task, "dueDate">): string | null {
  if (!task.dueDate) return null;
  return task.dueDate.toDate().toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function TaskRow({ task }: { task: WithId<Task> }) {
  const due = formatDueLabel(task);
  const isDone = task.status === "done";

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="rounded-[12px] border border-border bg-surface px-4 py-3.5 flex items-center gap-3.5 hover:bg-surface-elevated transition-colors"
    >
      <div
        className={`w-5 h-5 rounded-[6px] border-[1.5px] flex items-center justify-center ${
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

export default function TasksPage() {
  const { household } = useCurrentHousehold();
  const { tasks, loading } = useTasks(household?.id);

  const pendingCount = tasks.filter((t) => t.status === "pending").length;

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <header className="flex items-center justify-between mb-6">
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

      {loading ? (
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="text-[40px] leading-none">📝</div>
          <h2 className="font-display text-[22px] font-semibold leading-[1.1]">
            Rien à faire <span className="greeting-gradient">aujourd&apos;hui</span>
          </h2>
          <p className="text-[14px] text-muted-foreground max-w-[260px] leading-[1.5]">
            Profite — c&apos;est rare. On garde tout en mémoire pour demain.
          </p>
          <Link
            href="/tasks/new"
            className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors mt-2"
          >
            Créer une tâche →
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskRow task={task} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
