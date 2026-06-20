"use client";

import { CalendarPlus } from "lucide-react";
import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { useToast } from "@/components/shared/toast-provider";
import { setTaskDueDate } from "@/lib/firebase/firestore";
import {
  dueDateToday,
  dueDateTomorrow,
} from "@/lib/tasks/swipe-due-date";
import type { Task, WithId } from "@/types/cocon";

interface SwipeableTaskProps {
  task: WithId<Task>;
  householdId: string;
  /** Désactive le swipe (mode ordonner, sous-tâches expand, etc.). */
  disabled?: boolean;
  children: ReactNode;
}

const THRESHOLD_RATIO = 0.4;
const MAX_VERTICAL_SLACK = 14;

/**
 * Sprint 6 — bloc I. Détecte un swipe horizontal et déclenche l'ajout
 * d'une dueDate (today / tomorrow). Toast undo de 5s.
 *
 * Détection manuelle via pointer events :
 *  - touchstart → record startX/Y
 *  - touchmove → translate l'élément, révèle l'overlay
 *  - touchend → si |deltaX| > 40% width → trigger action, sinon snap back
 *
 * Si task.dueDate déjà défini OU `disabled=true` → le swipe est passif
 * (l'utilisateur peut tap mais pas swipe).
 */
export function SwipeableTask({
  task,
  householdId,
  disabled,
  children,
}: SwipeableTaskProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const pointerId = useRef<number | null>(null);
  const widthRef = useRef<number>(0);
  const triggeredHapticOnce = useRef(false);
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const { showToast } = useToast();

  const isSwipeable = !disabled;

  function vibrate(ms: number) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // safari / firefox desktop sans vibrate — silencieux
      }
    }
  }

  function reset(withAnimation: boolean) {
    setAnimating(withAnimation);
    setOffset(0);
    startX.current = null;
    startY.current = null;
    pointerId.current = null;
    triggeredHapticOnce.current = false;
  }

  function handlePointerDown(e: ReactPointerEvent) {
    if (!isSwipeable) return;
    // On accepte touch et stylus, on ignore la souris (pas pertinent ici)
    if (e.pointerType === "mouse") return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    pointerId.current = e.pointerId;
    widthRef.current = containerRef.current?.offsetWidth ?? 320;
    setAnimating(false);
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (
      !isSwipeable ||
      startX.current === null ||
      startY.current === null ||
      pointerId.current !== e.pointerId
    )
      return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (
      Math.abs(dy) > MAX_VERTICAL_SLACK &&
      Math.abs(dy) > Math.abs(dx)
    ) {
      // Mouvement principalement vertical → c'est un scroll, on abandonne
      reset(false);
      return;
    }
    // On capte le pointeur pour ne pas perdre les events si le doigt sort
    if (containerRef.current && !containerRef.current.hasPointerCapture(e.pointerId)) {
      try {
        containerRef.current.setPointerCapture(e.pointerId);
      } catch {
        // safari peut throw — pas critique
      }
    }
    const threshold = widthRef.current * THRESHOLD_RATIO;
    if (Math.abs(dx) > threshold && !triggeredHapticOnce.current) {
      vibrate(20);
      triggeredHapticOnce.current = true;
    } else if (Math.abs(dx) <= threshold && triggeredHapticOnce.current) {
      triggeredHapticOnce.current = false;
    }
    setOffset(dx);
  }

  async function applySwipe(direction: "right" | "left") {
    const previousDue = task.dueDate ?? null;
    const due =
      direction === "right" ? dueDateToday() : dueDateTomorrow();
    await setTaskDueDate(householdId, task.id, due);
    vibrate(50);
    const verb = previousDue ? "Reportée à" : "Ajoutée à";
    const when = direction === "right" ? "aujourd'hui" : "demain";
    showToast({
      message: `${verb} ${when}`,
      action: {
        label: "Annuler",
        onClick: async () => {
          await setTaskDueDate(householdId, task.id, previousDue);
        },
      },
    });
  }

  function handlePointerUp(e: ReactPointerEvent) {
    if (
      !isSwipeable ||
      startX.current === null ||
      pointerId.current !== e.pointerId
    ) {
      reset(true);
      return;
    }
    const dx = e.clientX - startX.current;
    const threshold = widthRef.current * THRESHOLD_RATIO;
    if (containerRef.current?.hasPointerCapture(e.pointerId)) {
      try {
        containerRef.current.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    if (dx > threshold) {
      void applySwipe("right");
    } else if (dx < -threshold) {
      void applySwipe("left");
    }
    reset(true);
  }

  // Overlay visuel sous la row : icône calendrier + texte
  const showRightOverlay = offset > 0;
  const showLeftOverlay = offset < 0;
  const intensity = Math.min(
    1,
    Math.abs(offset) / (widthRef.current * THRESHOLD_RATIO || 1),
  );

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-[12px]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => reset(true)}
      style={{ touchAction: isSwipeable ? "pan-y" : undefined }}
    >
      {/* Overlay droite (today) */}
      {showRightOverlay ? (
        <div
          className="absolute inset-0 flex items-center pl-5 bg-[linear-gradient(90deg,rgba(255,107,36,0.22),rgba(255,200,69,0.10))]"
          style={{ opacity: intensity }}
          aria-hidden
        >
          <span className="flex items-center gap-2 text-primary font-display font-bold text-[13px] tracking-[0.06em] uppercase">
            <CalendarPlus size={16} />
            Aujourd&apos;hui
          </span>
        </div>
      ) : null}
      {/* Overlay gauche (tomorrow) */}
      {showLeftOverlay ? (
        <div
          className="absolute inset-0 flex items-center justify-end pr-5 bg-[linear-gradient(270deg,rgba(255,200,69,0.22),rgba(255,107,36,0.10))]"
          style={{ opacity: intensity }}
          aria-hidden
        >
          <span className="flex items-center gap-2 text-secondary font-display font-bold text-[13px] tracking-[0.06em] uppercase">
            <CalendarPlus size={16} />
            Demain
          </span>
        </div>
      ) : null}

      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: animating
            ? "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)"
            : "none",
        }}
        className="relative"
      >
        {children}
      </div>
    </div>
  );
}
