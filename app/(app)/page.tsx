"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { TaskRow } from "@/components/tasks/task-row";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useMembers, type MemberProfile } from "@/hooks/use-members";
import { useTasks } from "@/hooks/use-tasks";
import { auth } from "@/lib/firebase/client";
import {
  isDueToday,
  isOverdue,
  isRecentlyCompleted,
} from "@/lib/firebase/firestore";
import type { Task, WithId } from "@/types/cocon";

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
  const router = useRouter();
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { tasks } = useTasks(household?.id);
  const { members } = useMembers(household?.memberIds);

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const firstName =
    user?.displayName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "toi";

  const summary = useMemo(
    () =>
      user ? getSummary(tasks, user.uid, new Date()) : "",
    [tasks, user],
  );

  const todayTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .filter(
        (t) =>
          t.status === "pending" &&
          (isOverdue(t, now) || isDueToday(t, now)),
      )
      .slice(0, 4);
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

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

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

        {/* Sign out (discret) */}
        <section className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-[12px] text-foreground-faint hover:text-muted-foreground transition-colors"
          >
            Se déconnecter
          </button>
        </section>
      </div>
    </main>
  );
}
