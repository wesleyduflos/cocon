"use client";

import { Timestamp, getDoc } from "firebase/firestore";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { createTask, userDoc } from "@/lib/firebase/firestore";
import type { TaskEffort } from "@/types/cocon";

const CATEGORIES = ["Maison", "Animaux", "Voiture", "Cuisine"];
const EFFORTS: Array<{ value: TaskEffort; label: string }> = [
  { value: "quick", label: "Rapide" },
  { value: "normal", label: "Normal" },
  { value: "long", label: "Long" },
];

type WhenChoice = "none" | "today" | "tomorrow" | "thisWeek" | "custom";

function buildDueDate(
  choice: WhenChoice,
  customDate: string,
): Timestamp | undefined {
  const now = new Date();
  if (choice === "today") {
    return Timestamp.fromDate(
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
    );
  }
  if (choice === "tomorrow") {
    return Timestamp.fromDate(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        23,
        59,
        59,
      ),
    );
  }
  if (choice === "thisWeek") {
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    return Timestamp.fromDate(
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
  if (choice === "custom" && customDate) {
    return Timestamp.fromDate(new Date(`${customDate}T23:59:59`));
  }
  return undefined;
}

interface MemberOption {
  uid: string;
  displayName: string;
}

function Pill({
  active,
  children,
  onClick,
  disabled,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(255,107,36,0.4)]"
          : "bg-surface border border-border text-muted-foreground hover:bg-surface-elevated"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

export default function NewTaskPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { household } = useCurrentHousehold();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [whenChoice, setWhenChoice] = useState<WhenChoice>("none");
  const [customDate, setCustomDate] = useState<string>("");
  const [category, setCategory] = useState<string | null>(null);
  const [effort, setEffort] = useState<TaskEffort | null>(null);

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    Promise.all(
      household.memberIds.map(async (uid) => {
        const snap = await getDoc(userDoc(uid));
        const data = snap.data();
        return {
          uid,
          displayName:
            data?.displayName ?? data?.email?.split("@")[0] ?? "Membre",
        };
      }),
    )
      .then((m) => {
        if (!cancelled) setMembers(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [household]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !household) return;
    setError(null);
    setSubmitting(true);
    try {
      const dueDate = buildDueDate(whenChoice, customDate);
      await createTask(household.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category ?? undefined,
        assigneeId: assigneeId ?? undefined,
        effort: effort ?? undefined,
        dueDate,
        createdBy: user.uid,
      });
      router.replace("/tasks");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer la tâche. Réessaie.",
      );
      setSubmitting(false);
    }
  }

  const canSubmit = title.trim().length > 0 && !submitting;

  return (
    <main className="flex flex-1 flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-background/85 backdrop-blur-xl border-b border-border">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Fermer"
          className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
        >
          <X size={18} />
        </button>
        <h1 className="text-[15px] font-medium">Nouvelle tâche</h1>
        <button
          type="submit"
          form="new-task-form"
          disabled={!canSubmit}
          className={`px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-colors ${
            canSubmit
              ? "text-primary hover:text-[var(--primary-hover)]"
              : "text-foreground-faint cursor-not-allowed"
          }`}
        >
          {submitting ? "..." : "Enregistrer"}
        </button>
      </header>

      <form
        id="new-task-form"
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-7 px-5 py-6 max-w-md w-full mx-auto"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="task-title"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Titre
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex. Donner le traitement à Mochi"
            required
            autoFocus
            disabled={submitting}
            className="font-display text-[22px] font-semibold bg-transparent border-b border-border focus:border-primary outline-none py-2 placeholder:text-foreground-faint placeholder:font-normal placeholder:font-sans placeholder:text-[16px]"
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Pour qui
          </span>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <Pill
                key={m.uid}
                active={assigneeId === m.uid}
                onClick={() =>
                  setAssigneeId(assigneeId === m.uid ? null : m.uid)
                }
                disabled={submitting}
              >
                {m.uid === user?.uid ? "Moi" : m.displayName}
              </Pill>
            ))}
            <Pill
              active={assigneeId === null}
              onClick={() => setAssigneeId(null)}
              disabled={submitting}
            >
              Non assignée
            </Pill>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Quand
          </span>
          <div className="flex flex-wrap gap-2">
            <Pill
              active={whenChoice === "today"}
              onClick={() => setWhenChoice("today")}
              disabled={submitting}
            >
              Aujourd&apos;hui
            </Pill>
            <Pill
              active={whenChoice === "tomorrow"}
              onClick={() => setWhenChoice("tomorrow")}
              disabled={submitting}
            >
              Demain
            </Pill>
            <Pill
              active={whenChoice === "thisWeek"}
              onClick={() => setWhenChoice("thisWeek")}
              disabled={submitting}
            >
              Cette semaine
            </Pill>
            <Pill
              active={whenChoice === "custom"}
              onClick={() => setWhenChoice("custom")}
              disabled={submitting}
            >
              Choisir
            </Pill>
            <Pill
              active={whenChoice === "none"}
              onClick={() => setWhenChoice("none")}
              disabled={submitting}
            >
              Sans échéance
            </Pill>
          </div>
          {whenChoice === "custom" ? (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              disabled={submitting}
              className="rounded-[10px] border border-border bg-surface px-3 py-2 text-[14px] mt-1 self-start"
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Catégorie
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Pill
                key={cat}
                active={category === cat}
                onClick={() => setCategory(category === cat ? null : cat)}
                disabled={submitting}
              >
                {cat}
              </Pill>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Effort estimé
          </span>
          <div className="flex flex-wrap gap-2">
            {EFFORTS.map((e) => (
              <Pill
                key={e.value}
                active={effort === e.value}
                onClick={() => setEffort(effort === e.value ? null : e.value)}
                disabled={submitting}
              >
                {e.label}
              </Pill>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="task-description"
            className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Description (facultatif)
          </label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes, détails, contexte…"
            rows={3}
            disabled={submitting}
            className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[14px] text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(255,107,36,0.18)] disabled:opacity-50 resize-none"
          />
        </div>

        <div className="rounded-[12px] border border-dashed border-border px-4 py-3 flex items-center gap-3 opacity-60">
          <span className="text-[18px]">🔁</span>
          <div className="flex-1 flex flex-col">
            <span className="text-[13px] font-medium text-foreground">
              Récurrence
            </span>
            <span className="text-[11px] text-muted-foreground">
              Bientôt — disponible au sprint 2
            </span>
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-[13px] text-destructive leading-[1.5]">
            {error}
          </p>
        ) : null}
      </form>
    </main>
  );
}
