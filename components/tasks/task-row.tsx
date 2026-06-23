"use client";

import { ChevronDown, ChevronUp, MessageSquare, Repeat, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { TaskCommentModal } from "@/components/tasks/task-comment-modal";
import { TaskSubtasksInline } from "@/components/tasks/task-subtasks-inline";
import { useSubtasks } from "@/hooks/use-subtasks";
import {
  completeRecurringTask,
  completeTask,
  uncompleteTask,
} from "@/lib/firebase/firestore";
import { describeRRule, getNextOccurrence } from "@/lib/recurrence";
import { countSubtasksDone } from "@/lib/tasks/subtasks";
import type { Task, WithId } from "@/types/cocon";

function formatDueLabel(task: Pick<Task, "dueDate">): string | null {
  if (!task.dueDate) return null;
  return task.dueDate.toDate().toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

interface TaskRowProps {
  task: WithId<Task>;
  householdId: string;
  userId: string;
  overdue?: boolean;
  /** Variante compacte alignée sur les items des DashSection (alertes,
   *  stocks, agenda). Padding et tailles réduits. */
  compact?: boolean;
}

export function TaskRow({
  task,
  householdId,
  userId,
  overdue,
  compact,
}: TaskRowProps) {
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  const due = formatDueLabel(task);
  const isDone = task.status === "done";
  const hasComment =
    Boolean(task.description?.trim()) || Boolean(task.notes?.trim());
  // Sprint 6 — F.3 : subscribe aux sous-tâches pour pouvoir afficher
  // le compteur X/Y et permettre l'expand inline. À petite échelle
  // (Cocon = ~20 tâches max), 20 listeners restent raisonnables.
  const { subtasks } = useSubtasks(householdId, task.id);
  const counter = countSubtasksDone(subtasks);
  const showSubtasksToggle = counter.total > 0;

  async function handleToggle() {
    if (pending) return;
    setPending(true);
    try {
      if (isDone) {
        await uncompleteTask(householdId, task.id);
        return;
      }

      // Tâche récurrente : on clone en done + on avance la dueDate
      if (task.recurrenceRule && task.dueDate) {
        const due = task.dueDate.toDate();
        const next = getNextOccurrence(task.recurrenceRule, due, due);
        if (next) {
          await completeRecurringTask(householdId, task, userId, next);
          const nextLabel = next.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          showToast({
            message: `Fait ✓ Prochaine : ${nextLabel}`,
          });
          return;
        }
      }

      // Cas standard : complétion simple + toast undo
      await completeTask(householdId, task.id, userId);
      showToast({
        message: "Tâche complétée",
        action: {
          label: "Annuler",
          onClick: () => uncompleteTask(householdId, task.id),
        },
      });
    } finally {
      setPending(false);
    }
  }

  // Tailles harmonisees avec les autres items des DashSection (px-3 py-2.5).
  const rootRadius = compact ? "rounded-[10px]" : "rounded-[12px]";
  const checkboxPad = compact ? "pl-3 pr-1 py-2.5" : "pl-4 pr-1 py-3.5";
  const checkboxSize = compact ? "w-[18px] h-[18px]" : "w-5 h-5";
  const linkPad = compact ? "py-2.5 pr-3" : "py-3.5 pr-4";
  const titleSize = compact ? "text-[13px]" : "text-[15px]";
  const metaSize = compact ? "text-[11px]" : "text-[12px]";
  const iconSize = compact ? 12 : 13;
  // Bordure : transparent en compact pour fondre dans la DashSection,
  // border-border en mode standard (autres ecrans).
  const rootBorder = compact ? "border-transparent" : "border-border";
  // Background plus discret en compact (subtle glass sur le gradient).
  const rootBg = compact
    ? "bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)]"
    : "bg-surface hover:bg-surface-elevated";

  return (
    <div
      className={`relative ${rootRadius} border ${rootBg} flex flex-col transition-colors ${
        overdue
          ? "border-l-2 border-l-destructive border-y-transparent border-r-transparent"
          : rootBorder
      }`}
    >
      <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        aria-label={isDone ? "Décocher la tâche" : "Marquer comme faite"}
        aria-pressed={isDone}
        className={`shrink-0 ${checkboxPad} flex items-center`}
      >
        <span
          className={`${checkboxSize} rounded-[6px] border-[1.5px] flex items-center justify-center transition-all ${
            isDone
              ? "bg-secondary border-secondary"
              : "border-[#5C3D2C] bg-transparent hover:border-primary"
          }`}
        >
          {isDone ? (
            <span className="text-[11px] text-secondary-foreground">✓</span>
          ) : null}
        </span>
      </button>
      <Link
        href={`/tasks/${task.id}/edit`}
        className={`flex-1 flex flex-col min-w-0 ${linkPad}`}
      >
        <span
          className={`flex items-center gap-1.5 ${titleSize} font-medium truncate ${
            isDone ? "line-through text-muted-foreground" : "text-foreground"
          }`}
        >
          {task.emoji ? (
            <span
              className={`shrink-0 ${compact ? "text-[14px]" : "text-[16px]"} leading-none`}
              aria-hidden
            >
              {task.emoji}
            </span>
          ) : null}
          {task.priority ? (
            <Star
              size={iconSize}
              fill="var(--secondary)"
              className="shrink-0 text-[var(--secondary)]"
              aria-label="Tâche prioritaire"
            />
          ) : null}
          {task.recurrenceRule ? (
            <Repeat
              size={iconSize}
              className="shrink-0 text-muted-foreground"
              aria-label={describeRRule(task.recurrenceRule)}
            />
          ) : null}
          <span className="truncate">{task.title}</span>
        </span>
        {task.category || due ? (
          <span className={`${metaSize} text-muted-foreground truncate`}>
            {[task.category, due].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </Link>
      {hasComment ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setCommentOpen(true);
          }}
          aria-label="Voir le commentaire"
          title="Voir le commentaire"
          className={`shrink-0 w-8 h-8 rounded-[8px] flex items-center justify-center text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors`}
        >
          <MessageSquare size={14} />
        </button>
      ) : null}
      {showSubtasksToggle ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSubtasksExpanded((v) => !v);
          }}
          aria-label={
            subtasksExpanded ? "Replier sous-tâches" : "Déplier sous-tâches"
          }
          aria-expanded={subtasksExpanded}
          className="shrink-0 mr-2 px-2 h-8 rounded-[8px] flex items-center gap-1 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
        >
          {counter.label ? (
            <span className="text-[12px] font-semibold">{counter.label}</span>
          ) : null}
          {subtasksExpanded ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
        </button>
      ) : null}
      </div>
      {subtasksExpanded ? (
        <TaskSubtasksInline
          householdId={householdId}
          task={task}
          userId={userId}
        />
      ) : null}
      {commentOpen ? (
        <TaskCommentModal
          taskId={task.id}
          title={task.title}
          description={task.description}
          notes={task.notes}
          onClose={() => setCommentOpen(false)}
        />
      ) : null}
    </div>
  );
}
