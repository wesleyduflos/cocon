"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface TaskCommentModalProps {
  taskId: string;
  title: string;
  description?: string;
  notes?: string;
  onClose: () => void;
}

export function TaskCommentModal({
  taskId,
  title,
  description,
  notes,
  onClose,
}: TaskCommentModalProps) {
  // Portal vers document.body — sinon un ancêtre avec `transform`/`filter`
  // crée un containing block et casse `position: fixed` (cas du
  // <SwipeableTask> du bloc I).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Commentaire de la tâche"
    >
      <div
        className="w-full max-w-md rounded-[16px] border border-border bg-surface p-5 flex flex-col gap-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Commentaire
            </p>
            <h2 className="font-display text-[18px] font-semibold leading-tight truncate">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-[10px] bg-surface-elevated flex items-center justify-center hover:bg-[rgba(255,255,255,0.08)] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {description ? (
            <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          ) : null}
          {description && notes ? (
            <div className="h-px bg-border-subtle" />
          ) : null}
          {notes ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
                Notes
              </p>
              <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap">
                {notes}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[12px] border border-border bg-surface-elevated text-foreground text-[14px] font-medium py-2.5 hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            Fermer
          </button>
          <Link
            href={`/tasks/${taskId}/edit`}
            onClick={onClose}
            className="flex-1 rounded-[12px] bg-primary text-primary-foreground text-[14px] font-semibold py-2.5 text-center hover:bg-[var(--primary-hover)] transition-colors"
          >
            Modifier
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
