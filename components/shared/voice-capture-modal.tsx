"use client";

import { Timestamp } from "firebase/firestore";
import { Check, Mic, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AudioWaveform } from "@/components/shared/audio-waveform";
import { useToast } from "@/components/shared/toast-provider";
import {
  parseVoiceNote,
  startRecording,
  type VoiceIntent,
  type VoiceParseOutput,
} from "@/lib/ai/voice-parse";
import {
  createMemoryEntry,
  createShoppingItem,
  createTask,
} from "@/lib/firebase/firestore";
import type {
  MemoryEntryType,
  ShoppingRayon,
  TaskEffort,
} from "@/types/cocon";

type State =
  | { kind: "ready" }
  /** Demande de permission micro en cours, juste après tap FAB. */
  | { kind: "starting" }
  | {
      kind: "recording";
      elapsedMs: number;
      stream: MediaStream;
    }
  | { kind: "processing"; stage: "transcription" | "analysis" }
  | { kind: "result"; output: VoiceParseOutput }
  | { kind: "error"; message: string };

interface Props {
  open: boolean;
  onClose: () => void;
  householdId: string;
  userId: string;
  otherMemberId?: string;
  /**
   * Si true, démarre l'enregistrement automatiquement à l'ouverture
   * (pattern « 1-tap » du FAB micro — bug A.3 sprint 5).
   * Le navigateur affichera le prompt de permission micro standard
   * si jamais accordée.
   */
  autoStart?: boolean;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const MAX_RECORDING_MS = 60_000; // 1 min hard limit

export function VoiceCaptureModal({
  open,
  onClose,
  householdId,
  userId,
  otherMemberId,
  autoStart,
}: Props) {
  // Si autoStart, on commence directement en "starting" pour eviter le
  // flash de l'ecran "ready" pendant la demande de permission micro.
  const [state, setState] = useState<State>(
    autoStart ? { kind: "starting" } : { kind: "ready" },
  );
  const [excludedIndexes, setExcludedIndexes] = useState<Set<number>>(new Set());
  const [editedLabels, setEditedLabels] = useState<Record<number, string>>({});
  const [validating, setValidating] = useState(false);
  const { showToast } = useToast();

  const stopRecorderRef = useRef<(() => Promise<Blob>) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartRef = useRef<number>(0);
  const autoStartTriggeredRef = useRef(false);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      // Si on ferme pendant l'enregistrement, on arrête proprement
      if (stopRecorderRef.current) {
        stopRecorderRef.current().catch(() => {});
        stopRecorderRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setState(autoStart ? { kind: "starting" } : { kind: "ready" });
      setExcludedIndexes(new Set());
      setEditedLabels({});
      autoStartTriggeredRef.current = false;
    }
  }, [open, autoStart]);

  // Auto-start enregistrement à l'ouverture (1-tap pattern)
  useEffect(() => {
    if (open && autoStart && !autoStartTriggeredRef.current) {
      autoStartTriggeredRef.current = true;
      handleStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoStart]);

  async function handleStart() {
    setState({ kind: "starting" });
    try {
      const { stop, stream } = await startRecording();
      stopRecorderRef.current = stop;
      recordingStartRef.current = Date.now();
      setState({ kind: "recording", elapsedMs: 0, stream });
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - recordingStartRef.current;
        if (elapsed >= MAX_RECORDING_MS) {
          handleStop();
          return;
        }
        setState((s) =>
          s.kind === "recording"
            ? { ...s, elapsedMs: elapsed }
            : s,
        );
      }, 200);
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Impossible d'accéder au micro.",
      });
    }
  }

  async function handleStop() {
    if (!stopRecorderRef.current) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const stop = stopRecorderRef.current;
    stopRecorderRef.current = null;
    try {
      setState({ kind: "processing", stage: "transcription" });
      const blob = await stop();
      // (Optionnel) transition vers "analysis" après upload — on le fait simple
      // en gardant "transcription" pendant tout le call.
      const output = await parseVoiceNote(blob, householdId);
      setState({ kind: "result", output });
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Analyse impossible. Réessaie.",
      });
    }
  }

  function toggleIntent(index: number) {
    setExcludedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function editLabel(index: number, value: string) {
    setEditedLabels((prev) => ({ ...prev, [index]: value }));
  }

  async function handleValidateAll() {
    if (state.kind !== "result") return;
    setValidating(true);
    const intents = state.output.intents;
    const toCreate: VoiceIntent[] = intents.filter(
      (_, i) => !excludedIndexes.has(i),
    );

    let created = 0;
    let failed = 0;

    for (let i = 0; i < toCreate.length; i++) {
      const intent = toCreate[i];
      const originalIndex = intents.indexOf(intent);
      const editedLabel = editedLabels[originalIndex];
      try {
        if (intent.type === "task") {
          await createTaskFromIntent(intent, editedLabel);
        } else if (intent.type === "shopping_item") {
          await createShoppingFromIntent(intent, editedLabel);
        } else if (intent.type === "memory_entry") {
          await createMemoryFromIntent(intent, editedLabel);
        }
        created++;
      } catch {
        failed++;
      }
    }

    showToast({
      message:
        failed > 0
          ? `${created} créé(s), ${failed} échec(s)`
          : `${created} action(s) créée(s)`,
    });
    setValidating(false);
    onClose();
  }

  async function createTaskFromIntent(
    intent: VoiceIntent,
    editedLabel?: string,
  ) {
    const data = intent.data;
    const assigneeHint = data.assigneeHint as string | undefined;
    const dueDateHint = data.dueDateHint as string | undefined;
    const assigneeId =
      assigneeHint === "me"
        ? userId
        : assigneeHint === "partner"
          ? otherMemberId
          : undefined;
    let dueDate: Timestamp | undefined;
    if (dueDateHint && dueDateHint !== "none") {
      const now = new Date();
      if (dueDateHint === "today") {
        dueDate = Timestamp.fromDate(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
        );
      } else if (dueDateHint === "tomorrow") {
        dueDate = Timestamp.fromDate(
          new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            23,
            59,
            59,
          ),
        );
      } else if (dueDateHint === "thisWeek") {
        const dow = now.getDay();
        const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
        dueDate = Timestamp.fromDate(
          new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + daysUntilSunday,
            23,
            59,
            59,
          ),
        );
      }
    }
    await createTask(householdId, {
      title: editedLabel ?? (data.title as string) ?? "Tâche",
      category: data.category as string | undefined,
      assigneeId,
      effort: data.effortHint as TaskEffort | undefined,
      dueDate,
      createdBy: userId,
    });
  }

  async function createShoppingFromIntent(
    intent: VoiceIntent,
    editedLabel?: string,
  ) {
    const data = intent.data;
    await createShoppingItem(householdId, {
      name: editedLabel ?? (data.name as string) ?? "Article",
      emoji: data.emoji as string | undefined,
      quantity: (data.quantity as number) ?? 1,
      unit: data.unit as string | undefined,
      rayon: ((data.rayon as ShoppingRayon) ?? "Autre") as ShoppingRayon,
      addedBy: userId,
    });
  }

  async function createMemoryFromIntent(
    intent: VoiceIntent,
    editedLabel?: string,
  ) {
    const data = intent.data;
    const memType = (data.type as MemoryEntryType) ?? "note";
    const structured =
      typeof data.fields === "object" && data.fields !== null
        ? (data.fields as Record<string, string>)
        : {};
    await createMemoryEntry(householdId, {
      type: memType,
      title: editedLabel ?? (data.title as string) ?? "Entrée",
      structuredData: structured,
      tags: [],
      createdBy: userId,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <header className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-border bg-background/90 backdrop-blur-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center"
        >
          <X size={18} />
        </button>
        <h2 className="text-[15px] font-medium">Note vocale</h2>
        <div className="w-9" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 max-w-md w-full mx-auto">
        {state.kind === "ready" ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <button
              type="button"
              onClick={handleStart}
              aria-label="Commencer l'enregistrement"
              className="w-28 h-28 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_36px_rgba(255,107,36,0.5)] hover:scale-105 transition-transform"
            >
              <Mic size={44} strokeWidth={2.2} />
            </button>
            <p className="text-[14px] text-muted-foreground max-w-[260px]">
              Appuie pour parler. Tu peux enchaîner plusieurs intentions
              dans la même phrase.
            </p>
            <p className="text-[11px] text-foreground-faint max-w-[260px]">
              L&apos;audio n&apos;est pas conservé après transcription. Limite 60s.
            </p>
          </div>
        ) : state.kind === "starting" ? (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-40"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,107,36,0.4), transparent 70%)",
                }}
              />
              <div className="w-20 h-20 rounded-full bg-primary/15 border border-[rgba(255,107,36,0.32)] flex items-center justify-center">
                <Mic size={28} className="text-primary" strokeWidth={2.2} />
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Autorise le micro…
            </p>
          </div>
        ) : state.kind === "recording" ? (
          <div className="flex flex-col items-center gap-8 w-full text-center">
            {/* Indicateur subtil : point qui clignote + label */}
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
              <span
                className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse"
                style={{ boxShadow: "0 0 8px rgba(229,55,77,0.6)" }}
              />
              Enregistrement
            </div>

            {/* Timer en grand, doux */}
            <div
              className="font-display font-light tabular-nums"
              style={{
                fontSize: "56px",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                background: "linear-gradient(180deg, #FFF1E6, #FFC845)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {formatElapsed(state.elapsedMs)}
            </div>

            {/* Waveform temps reel */}
            <AudioWaveform stream={state.stream} height={64} bars={36} />

            {/* Bouton stop subtil (pas rouge agressif) */}
            <button
              type="button"
              onClick={handleStop}
              aria-label="Terminer l'enregistrement"
              className="mt-4 w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_24px_rgba(255,107,36,0.45)] hover:scale-105 active:scale-95 transition-transform"
            >
              <span className="w-5 h-5 rounded-[4px] bg-primary-foreground" />
            </button>
            <p className="text-[12px] text-foreground-faint">
              Tape pour terminer
            </p>
          </div>
        ) : state.kind === "processing" ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-3 h-3 rounded-full glow-dot animate-pulse" />
            <p className="text-[14px] text-muted-foreground">
              {state.stage === "transcription"
                ? "Transcription en cours…"
                : "Analyse en cours…"}
            </p>
          </div>
        ) : state.kind === "result" ? (
          <div className="w-full flex flex-col gap-4">
            {state.output.transcription ? (
              <div className="rounded-[12px] border border-border-subtle bg-surface px-4 py-3">
                <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
                  Tu as dit
                </p>
                <p className="text-[14px] italic text-foreground leading-[1.5]">
                  « {state.output.transcription} »
                </p>
              </div>
            ) : null}
            <h3 className="font-display text-[20px] font-semibold">
              {state.output.intents.length} action
              {state.output.intents.length > 1 ? "s" : ""} détectée
              {state.output.intents.length > 1 ? "s" : ""}
            </h3>
            {state.output.intents.length === 0 ? (
              <p className="text-[14px] text-muted-foreground">
                Aucune intention claire détectée. Essaie une formulation plus
                directe.
              </p>
            ) : (
              <ResultList
                intents={state.output.intents}
                excludedIndexes={excludedIndexes}
                editedLabels={editedLabels}
                onToggle={toggleIntent}
                onEdit={editLabel}
              />
            )}
            <div className="flex flex-col gap-2 mt-3">
              {state.output.intents.length > 0 ? (
                <button
                  type="button"
                  onClick={handleValidateAll}
                  disabled={
                    validating ||
                    excludedIndexes.size === state.output.intents.length
                  }
                  className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] disabled:opacity-50"
                >
                  {validating
                    ? "..."
                    : `Tout valider (${state.output.intents.length - excludedIndexes.size})`}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-[12px] border border-border bg-transparent text-foreground font-sans font-medium text-[14px] px-[18px] py-3"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : state.kind === "error" ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-[14px] text-destructive">{state.message}</p>
            <button
              type="button"
              onClick={() => setState({ kind: "ready" })}
              className="rounded-[12px] border border-border bg-transparent text-foreground text-[13px] px-4 py-2"
            >
              Réessayer
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultList({
  intents,
  excludedIndexes,
  editedLabels,
  onToggle,
  onEdit,
}: {
  intents: VoiceIntent[];
  excludedIndexes: Set<number>;
  editedLabels: Record<number, string>;
  onToggle: (index: number) => void;
  onEdit: (index: number, value: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {intents.map((intent, idx) => {
        const excluded = excludedIndexes.has(idx);
        const icon =
          intent.type === "task"
            ? "✅"
            : intent.type === "shopping_item"
              ? "🛒"
              : intent.type === "memory_entry"
                ? "📝"
                : "❓";
        const defaultLabel =
          intent.type === "task"
            ? (intent.data.title as string) ?? "(sans titre)"
            : intent.type === "shopping_item"
              ? (intent.data.name as string) ?? "(sans nom)"
              : intent.type === "memory_entry"
                ? (intent.data.title as string) ?? "(sans titre)"
                : "Non reconnu";
        const currentLabel = editedLabels[idx] ?? defaultLabel;
        return (
          <li
            key={idx}
            className={`rounded-[12px] border bg-surface flex items-center gap-3 px-3 py-2.5 transition-opacity ${
              excluded ? "opacity-40" : ""
            } ${intent.type === "unrecognized" ? "border-destructive/40" : "border-border"}`}
          >
            <span className="text-[18px]">{icon}</span>
            <input
              type="text"
              value={currentLabel}
              onChange={(e) => onEdit(idx, e.target.value)}
              disabled={excluded || intent.type === "unrecognized"}
              className="flex-1 bg-transparent text-[14px] focus:outline-none disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => onToggle(idx)}
              aria-label={excluded ? "Inclure" : "Exclure"}
              className="w-7 h-7 rounded-[8px] hover:bg-surface-elevated flex items-center justify-center text-muted-foreground"
            >
              {excluded ? <Check size={14} /> : <Trash2 size={14} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
