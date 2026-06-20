"use client";

import { ArrowUpDown, Check, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { TaskRow } from "@/components/tasks/task-row";
import { useFlipAnimation } from "@/hooks/use-flip-animation";
import { setTaskManualOrders } from "@/lib/firebase/firestore";
import type { Task, WithId } from "@/types/cocon";

interface TaskSectionProps {
  title: string;
  subtitle?: string;
  tasks: WithId<Task>[];
  overdue?: WithId<Task>[];
  householdId: string;
  userId: string;
  /** Vrai quand une autre section est en mode ordonner — celle-ci se grise. */
  dimmed?: boolean;
  /** Notifie le parent qu'on entre/sort du mode (pour qu'il grise les autres). */
  onReorderStart?: () => void;
  onReorderEnd?: () => void;
  /** Sprint 6 — désactive le réordre (utilisé sur « Fait récemment »). */
  reorderable?: boolean;
}

/**
 * Section temporelle de tâches avec mode « Ordonner » (sprint 6 — bloc D).
 *
 * Au tap sur « Ordonner », chaque tâche tapée reçoit un numéro et remonte
 * en haut dans l'ordre des taps. Animation FLIP pendant le réordre live.
 * « Terminer » persiste l'ordre via `setTaskManualOrders` (batch Firestore).
 */
export function TaskSection({
  title,
  subtitle,
  tasks,
  overdue,
  householdId,
  userId,
  dimmed,
  onReorderStart,
  onReorderEnd,
  reorderable = true,
}: TaskSectionProps) {
  const [reorderMode, setReorderMode] = useState(false);
  const [tapOrder, setTapOrder] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  // Toutes les tâches visibles dans cette section (overdue d'abord)
  const allTasks = useMemo(() => [...(overdue ?? []), ...tasks], [tasks, overdue]);

  // Ordre affiché : en mode ordonner, on remonte les numérotées en haut
  const displayed = useMemo(() => {
    if (!reorderMode || tapOrder.length === 0) return allTasks;
    const numbered: WithId<Task>[] = [];
    const rest: WithId<Task>[] = [];
    const numberedIds = new Set(tapOrder);
    for (const t of allTasks) {
      if (!numberedIds.has(t.id)) rest.push(t);
    }
    // Préserve l'ordre des taps
    for (const id of tapOrder) {
      const t = allTasks.find((x) => x.id === id);
      if (t) numbered.push(t);
    }
    return [...numbered, ...rest];
  }, [allTasks, reorderMode, tapOrder]);

  const { register } = useFlipAnimation(displayed.map((t) => t.id));

  if (allTasks.length === 0) return null;

  function startReorder() {
    setReorderMode(true);
    setTapOrder([]);
    onReorderStart?.();
  }

  function cancelReorder() {
    setReorderMode(false);
    setTapOrder([]);
    onReorderEnd?.();
  }

  function toggleTaskInOrder(id: string) {
    setTapOrder((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function finishReorder() {
    if (saving) return;
    setSaving(true);
    try {
      await setTaskManualOrders(householdId, tapOrder);
      showToast({
        message: `Ordre sauvegardé · ${tapOrder.length} tâche${
          tapOrder.length > 1 ? "s" : ""
        }`,
      });
      setReorderMode(false);
      setTapOrder([]);
      onReorderEnd?.();
    } finally {
      setSaving(false);
    }
  }

  async function resetSectionOrder() {
    if (!window.confirm(`Réinitialiser l'ordre de « ${title} » ?`)) return;
    const idsToReset = allTasks
      .filter((t) => typeof t.manualOrder === "number")
      .map((t) => t.id);
    if (idsToReset.length === 0) {
      showToast({ message: "Rien à réinitialiser." });
      return;
    }
    setSaving(true);
    try {
      await setTaskManualOrders(householdId, [], idsToReset);
      showToast({ message: "Ordre par défaut restauré" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={`flex flex-col gap-2.5 transition-opacity ${
        dimmed ? "opacity-40 pointer-events-none" : ""
      }`}
    >
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          {reorderMode
            ? `Ordonner « ${title.toLowerCase()} » · tape dans l'ordre voulu`
            : title}
        </h2>
        <div className="flex items-center gap-3">
          {subtitle && !reorderMode ? (
            <p className="text-[11px] text-destructive">{subtitle}</p>
          ) : null}
          {reorderable && !reorderMode && allTasks.length >= 2 ? (
            <button
              type="button"
              onClick={startReorder}
              onContextMenu={(e) => {
                e.preventDefault();
                void resetSectionOrder();
              }}
              className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary transition-colors"
              title="Long-press / clic droit : réinitialiser"
            >
              <ArrowUpDown size={11} />
              <span className="font-sans font-semibold">Ordonner</span>
            </button>
          ) : null}
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {displayed.map((t) => {
          const isOverdue = overdue?.some((o) => o.id === t.id) ?? false;
          const numberIdx = tapOrder.indexOf(t.id);
          const isNumbered = numberIdx >= 0;
          return (
            <li
              key={t.id}
              ref={register(t.id)}
              onClick={
                reorderMode
                  ? (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleTaskInOrder(t.id);
                    }
                  : undefined
              }
              className={`relative ${
                reorderMode
                  ? "cursor-pointer [&_*]:pointer-events-none rounded-[12px] ring-1 ring-transparent hover:ring-primary/40 transition-shadow"
                  : ""
              } ${
                reorderMode && isNumbered
                  ? "ring-primary shadow-[0_0_12px_rgba(255,107,36,0.25)]"
                  : ""
              }`}
            >
              <TaskRow
                task={t}
                overdue={isOverdue}
                householdId={householdId}
                userId={userId}
              />
              {reorderMode && isNumbered ? (
                <span
                  className="absolute top-1.5 right-1.5 min-w-[22px] h-[22px] rounded-full bg-primary text-primary-foreground text-[12px] font-bold flex items-center justify-center px-1.5 shadow-[0_0_10px_rgba(255,107,36,0.5)]"
                  aria-label={`Position ${numberIdx + 1}`}
                >
                  {numberIdx + 1}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {reorderMode ? (
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={cancelReorder}
            disabled={saving}
            className="flex-1 rounded-[12px] border border-border bg-surface text-foreground text-[14px] font-medium py-2.5 hover:bg-surface-elevated transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <X size={14} />
            Annuler
          </button>
          <button
            type="button"
            onClick={finishReorder}
            disabled={saving || tapOrder.length === 0}
            className="flex-1 rounded-[12px] bg-gradient-to-br from-primary to-secondary text-primary-foreground text-[14px] font-semibold py-2.5 hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Check size={14} strokeWidth={2.6} />
            {saving ? "Sauvegarde…" : `Terminer · ${tapOrder.length}`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
