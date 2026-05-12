"use client";

import { Mic, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { TaskRow } from "@/components/tasks/task-row";
import { useToast } from "@/components/shared/toast-provider";
import { VoiceCaptureModal } from "@/components/shared/voice-capture-modal";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useMembers, type MemberProfile } from "@/hooks/use-members";
import { usePendingSuggestions } from "@/hooks/use-suggestions";
import { useTasks } from "@/hooks/use-tasks";
import { useCurrentUserProfile } from "@/hooks/use-user-profile";
import { isVoiceCaptureSupported } from "@/lib/ai/voice-parse";
import { calculateBalance, buildPersonalizedMessage } from "@/lib/balance/score";
import { sortByPriorityThenDue } from "@/lib/tasks/sort";
import {
  acceptSuggestion,
  dismissSuggestion,
  isDueToday,
  isOverdue,
  isRecentlyCompleted,
  launchChecklistRun,
} from "@/lib/firebase/firestore";
import type { Suggestion, Task, WithId } from "@/types/cocon";

function getSummary(
  tasks: WithId<Task>[],
  userId: string,
  now: Date,
): string {
  const pending = tasks.filter((t) => t.status === "pending");
  const overdue = pending.filter((t) => isOverdue(t, now));
  const today = pending.filter((t) => isDueToday(t, now));
  const todayForMe = today.filter((t) => t.assigneeId === userId);

  if (overdue.length > 0) {
    return `${overdue.length} ${overdue.length > 1 ? "tâches" : "tâche"} en retard à régler.`;
  }
  if (today.length > 0) {
    return todayForMe.length > 0
      ? `${today.length} pour aujourd'hui · ${todayForMe.length} pour toi.`
      : `${today.length} pour aujourd'hui.`;
  }
  if (pending.length > 0) {
    return `${pending.length} en cours, rien d'urgent.`;
  }
  return "Rien à faire aujourd'hui — profite.";
}

function MemberAvatar({
  member,
  isCurrentUser,
}: {
  member: MemberProfile;
  isCurrentUser: boolean;
}) {
  const initial = member.displayName.charAt(0).toUpperCase() || "?";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center font-display font-semibold text-[20px] ${
          isCurrentUser
            ? "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(255,107,36,0.4)]"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        {initial}
      </div>
      <span className="text-[12px] text-muted-foreground max-w-[80px] truncate">
        {isCurrentUser ? "Toi" : member.displayName}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { profile } = useCurrentUserProfile();
  const { household } = useCurrentHousehold();
  const { tasks } = useTasks(household?.id);
  const { members } = useMembers(household?.memberIds);
  const { suggestions } = usePendingSuggestions(household?.id);
  const { showToast } = useToast();
  const [busySuggestionId, setBusySuggestionId] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);

  function handleVoiceClick() {
    if (!isVoiceCaptureSupported()) {
      showToast({ message: "Note vocale non supportée sur ce navigateur." });
      return;
    }
    setVoiceOpen(true);
  }

  const otherMemberId = useMemo(() => {
    if (!user || !household) return undefined;
    return household.memberIds.find((id) => id !== user.uid);
  }, [household, user]);

  const balance = useMemo(() => {
    if (!household || !household.balanceEnabled) return null;
    return calculateBalance(tasks, household.memberIds, "7d", new Date());
  }, [household, tasks]);

  const balanceMessage = useMemo(() => {
    if (!balance) return "";
    const nameByUid: Record<string, string> = {};
    for (const m of members) nameByUid[m.uid] = m.displayName;
    return buildPersonalizedMessage(
      balance.balanceRatio,
      balance.perMember,
      balance.totalWeight,
      nameByUid,
    );
  }, [balance, members]);

  async function handleAcceptSuggestion(s: WithId<Suggestion>) {
    if (!household || !user) return;
    setBusySuggestionId(s.id);
    try {
      await launchChecklistRun(household.id, s.templateId, user.uid);
      await acceptSuggestion(household.id, s.id, user.uid);
      showToast({
        message: `${s.templateEmoji} ${s.templateName} lancée`,
      });
    } catch (err) {
      showToast({
        message:
          err instanceof Error ? err.message : "Lancement impossible.",
      });
    } finally {
      setBusySuggestionId(null);
    }
  }

  async function handleDismissSuggestion(s: WithId<Suggestion>) {
    if (!household || !user) return;
    setBusySuggestionId(s.id);
    try {
      await dismissSuggestion(household.id, s.id, user.uid);
    } finally {
      setBusySuggestionId(null);
    }
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Lecture single source of truth Firestore via useCurrentUserProfile
  // (Firebase Auth peut etre stale, cf gotcha #24).
  const firstName = profile?.firstName ?? "toi";

  const summary = useMemo(
    () =>
      user ? getSummary(tasks, user.uid, new Date()) : "",
    [tasks, user],
  );

  const todayTasks = useMemo(() => {
    const now = new Date();
    const filtered = tasks.filter(
      (t) =>
        t.status === "pending" && (isOverdue(t, now) || isDueToday(t, now)),
    );
    // Prioritaires d'abord (sprint 5 B.4), puis due date, puis titre.
    return sortByPriorityThenDue(filtered).slice(0, 4);
  }, [tasks]);

  const recentDone = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((t) => isRecentlyCompleted(t, now))
      .sort((a, b) => {
        const aMs = a.completedAt?.toMillis() ?? 0;
        const bMs = b.completedAt?.toMillis() ?? 0;
        return bMs - aMs;
      })
      .slice(0, 5);
  }, [tasks]);

  return (
    <main className="flex flex-1 flex-col px-5 py-7">
      <div className="w-full max-w-md mx-auto flex flex-col gap-7">
        {/* Greeting */}
        <section className="flex flex-col gap-2">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground capitalize">
            {today}
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
            Bonjour <span className="greeting-gradient">{firstName}</span>
          </h1>
          {household ? (
            <p className="text-[14px] text-muted-foreground leading-[1.5]">
              {summary}
            </p>
          ) : null}
        </section>

        {/* Suggestions IA en attente */}
        {suggestions.length > 0
          ? suggestions.slice(0, 1).map((s) => {
              const eventDate = s.triggerEventDate.toDate();
              const startOfToday = new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                new Date().getDate(),
              );
              const daysUntil = Math.floor(
                (eventDate.getTime() - startOfToday.getTime()) /
                  (24 * 60 * 60 * 1000),
              );
              const daysLabel =
                daysUntil <= 0
                  ? "aujourd'hui"
                  : daysUntil === 1
                    ? "demain"
                    : `dans ${daysUntil} jours`;
              const busy = busySuggestionId === s.id;
              return (
                <section
                  key={s.id}
                  className="rounded-[16px] bg-gradient-to-br from-[rgba(255,107,36,0.16)] to-[rgba(255,200,69,0.06)] border border-[rgba(255,107,36,0.32)] px-5 py-4 flex flex-col gap-3"
                >
                  <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-primary font-semibold flex items-center gap-1.5">
                    <Sparkles size={12} />
                    Suggestion · {s.templateEmoji}
                  </p>
                  <h2 className="font-display text-[19px] font-semibold leading-[1.15]">
                    {s.triggerEventTitle}
                    <br />
                    <span className="text-muted-foreground font-normal">
                      arrive {daysLabel}
                    </span>
                  </h2>
                  <p className="text-[13px] text-muted-foreground leading-[1.5]">
                    Lance la préparation «&nbsp;{s.templateName}&nbsp;» pour
                    ne rien oublier ?
                  </p>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => handleAcceptSuggestion(s)}
                      disabled={busy}
                      className="flex-1 rounded-[10px] bg-primary text-primary-foreground font-sans font-semibold text-[14px] px-4 py-2.5 shadow-[0_0_14px_rgba(255,107,36,0.4)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
                    >
                      {busy ? "..." : "Lancer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissSuggestion(s)}
                      disabled={busy}
                      className="rounded-[10px] border border-border bg-transparent text-foreground font-sans font-medium text-[13px] px-4 py-2.5 hover:bg-surface-elevated disabled:opacity-50"
                    >
                      Plus tard
                    </button>
                  </div>
                </section>
              );
            })
          : null}

        {/* Score d'équilibre (opt-in) */}
        {balance && household && members.length > 0 ? (
          <Link
            href="/balance"
            className="rounded-[16px] bg-surface border border-border-subtle px-5 py-4 flex flex-col gap-3 hover:border-border transition-colors"
          >
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Équilibre du foyer · 7 jours
            </p>
            <div className="flex items-center gap-3">
              {members.map((m) => {
                const stats = balance.perMember[m.uid] ?? {
                  weight: 0,
                  count: 0,
                  categories: [],
                };
                const maxW = Math.max(
                  ...Object.values(balance.perMember).map((s) => s.weight),
                  1,
                );
                const scale = 0.6 + (stats.weight / maxW) * 0.5; // 0.6 → 1.1
                const initial = m.displayName.charAt(0).toUpperCase() || "?";
                const isMe = m.uid === user?.uid;
                return (
                  <div
                    key={m.uid}
                    className="flex flex-col items-center gap-1"
                    style={{ transform: `scale(${scale})` }}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-semibold text-[16px] ${
                        isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {initial}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {stats.count}
                    </span>
                  </div>
                );
              })}
              <p className="flex-1 text-[13px] text-foreground leading-snug">
                {balanceMessage}
              </p>
            </div>
            <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-secondary to-primary"
                style={{
                  width: `${Math.max(8, (1 - balance.balanceRatio) * 100)}%`,
                }}
              />
            </div>
          </Link>
        ) : null}

        {/* Tâches du jour */}
        {todayTasks.length > 0 && household && user ? (
          <section className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
                Tâches du jour
              </h2>
              <Link
                href="/tasks"
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Tout voir →
              </Link>
            </div>
            <ul className="flex flex-col gap-2">
              {todayTasks.map((t) => (
                <li key={t.id}>
                  <TaskRow
                    task={t}
                    householdId={household.id}
                    userId={user.uid}
                    overdue={isOverdue(t, new Date())}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Activité récente */}
        {recentDone.length > 0 ? (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Activité récente
            </h2>
            <ul className="flex flex-col gap-1.5">
              {recentDone.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-2.5 text-[13px]"
                >
                  <span className="text-secondary">✓</span>
                  <span className="text-muted-foreground line-through truncate flex-1">
                    {t.title}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Membres du cocon */}
        {members.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              {household?.emoji ? `${household.emoji} ` : ""}
              {household?.name ?? "Cocon"}
            </h2>
            <div className="flex gap-5">
              {members.map((m) => (
                <MemberAvatar
                  key={m.uid}
                  member={m}
                  isCurrentUser={m.uid === user?.uid}
                />
              ))}
              {members.length < 2 ? (
                <Link
                  href="/invite"
                  className="flex flex-col items-center gap-1.5"
                  aria-label="Inviter quelqu'un"
                >
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-border flex items-center justify-center text-foreground-faint text-[24px] hover:border-primary hover:text-primary transition-colors">
                    +
                  </div>
                  <span className="text-[12px] text-muted-foreground">
                    Inviter
                  </span>
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

      </div>

      {household && user ? (
        <>
          <button
            type="button"
            onClick={handleVoiceClick}
            aria-label="Note vocale"
            className="fixed right-5 bottom-[88px] z-40 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground flex items-center justify-center shadow-[0_0_28px_rgba(255,107,36,0.5)] hover:scale-105 transition-transform active:scale-95"
          >
            <Mic size={22} strokeWidth={2.2} />
          </button>
          <VoiceCaptureModal
            open={voiceOpen}
            onClose={() => setVoiceOpen(false)}
            householdId={household.id}
            userId={user.uid}
            otherMemberId={otherMemberId}
            autoStart
          />
        </>
      ) : null}
    </main>
  );
}
