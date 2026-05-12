"use client";

import {
  AlertTriangle,
  Box,
  Calendar,
  CheckSquare,
  Mic,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AppHeader } from "@/components/shared/app-header";
import { DashSection } from "@/components/shared/dash-section";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { TaskRow } from "@/components/tasks/task-row";
import { useToast } from "@/components/shared/toast-provider";
import { VoiceCaptureModal } from "@/components/shared/voice-capture-modal";
import { useAuth } from "@/hooks/use-auth";
import { useCalendarEvents } from "@/hooks/use-calendar";
import { useActiveChecklistRuns } from "@/hooks/use-checklists";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useMembers } from "@/hooks/use-members";
import { useMemoryEntries } from "@/hooks/use-memory";
import { useShoppingItems } from "@/hooks/use-shopping";
import { useStocks } from "@/hooks/use-stocks";
import { usePendingSuggestions } from "@/hooks/use-suggestions";
import { useTasks } from "@/hooks/use-tasks";
import { useCurrentUserProfile } from "@/hooks/use-user-profile";
import { isVoiceCaptureSupported } from "@/lib/ai/voice-parse";
import { computeDashboardAlerts } from "@/lib/alerts/dashboard-alerts";
import {
  buildPersonalizedMessage,
  calculateBalance,
} from "@/lib/balance/score";
import {
  acceptSuggestion,
  dismissSuggestion,
  isDueThisWeek,
  isDueToday,
  isOverdue,
  launchChecklistRun,
} from "@/lib/firebase/firestore";
import { sortByPriorityThenDue } from "@/lib/tasks/sort";
import {
  DEFAULT_LOCATION,
  getWeather,
  type WeatherSnapshot,
} from "@/lib/weather/open-meteo";
import type { Suggestion, Task, WithId } from "@/types/cocon";
import { useEffect } from "react";

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

/* =========================================================================
   <HeroWeatherInline>

   Version compacte du widget météo intégrée au hero "Calme & câlin".
   Affiche emoji + temp + libellé location, ou un nudge si pas de géoloc.
   ========================================================================= */

function HeroWeatherInline() {
  const { user } = useAuth();
  const { profile } = useCurrentUserProfile();
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);

  const location = profile?.raw?.preferences?.location;
  const consent = profile?.raw?.preferences?.locationConsent;

  useEffect(() => {
    if (!profile) return;
    let lat: number;
    let lng: number;
    if (location) {
      lat = location.lat;
      lng = location.lng;
    } else if (consent === "denied") {
      lat = DEFAULT_LOCATION.lat;
      lng = DEFAULT_LOCATION.lng;
    } else {
      // Pas encore de consent : on n'affiche rien (le nudge se fera ailleurs)
      return;
    }
    let cancelled = false;
    getWeather(lat, lng)
      .then((w) => {
        if (cancelled) return;
        setSnapshot(w);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [location, consent, profile]);

  // Nudge discret si pas de consent
  if (!snapshot && consent !== "denied" && !location) {
    return (
      <button
        type="button"
        onClick={async () => {
          if (!user || !navigator.geolocation) return;
          try {
            const pos = await new Promise<GeolocationPosition>((res, rej) => {
              navigator.geolocation.getCurrentPosition(res, rej, {
                timeout: 8000,
              });
            });
            const mod = await import("@/lib/firebase/firestore");
            await mod.updateUserPreferences(user.uid, {
              location: {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              },
              locationConsent: "granted",
            });
          } catch {
            const mod = await import("@/lib/firebase/firestore");
            await mod.updateUserPreferences(user.uid, {
              locationConsent: "denied",
            });
          }
        }}
        className="text-right text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        📍 météo
      </button>
    );
  }

  if (!snapshot) return null;

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-[26px] leading-none">{snapshot.emoji}</span>
      <span className="font-display text-[18px] font-semibold leading-none">
        {Math.round(snapshot.temperature)}°
      </span>
    </div>
  );
}

/* =========================================================================
   Dashboard — Variante 1 "Calme & câlin" (sprint 5 polish)
   ========================================================================= */

export default function DashboardPage() {
  const { user } = useAuth();
  const { profile } = useCurrentUserProfile();
  const { household } = useCurrentHousehold();
  const { tasks } = useTasks(household?.id);
  const { members } = useMembers(household?.memberIds);
  const { suggestions } = usePendingSuggestions(household?.id);
  const { stocks } = useStocks(household?.id);
  const { items: shoppingItems } = useShoppingItems(household?.id);
  const { runs } = useActiveChecklistRuns(household?.id);
  const { entries: memoryEntries } = useMemoryEntries(household?.id);
  const { showToast } = useToast();
  const [busySuggestionId, setBusySuggestionId] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);

  // Range = aujourd'hui (00:00 → 23:59:59)
  const dayRange = useMemo(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
      end: new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
      ),
    };
  }, []);
  const { events: todayEvents } = useCalendarEvents(
    household?.id,
    dayRange.start,
    dayRange.end,
  );

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
  // (Firebase Auth peut être stale, cf gotcha #24).
  const firstName = profile?.firstName ?? "toi";

  const summary = useMemo(
    () => (user ? getSummary(tasks, user.uid, new Date()) : ""),
    [tasks, user],
  );

  const todayTasks = useMemo(() => {
    const now = new Date();
    const filtered = tasks.filter(
      (t) =>
        t.status === "pending" && (isOverdue(t, now) || isDueToday(t, now)),
    );
    return sortByPriorityThenDue(filtered).slice(0, 4);
  }, [tasks]);

  const weekTasks = useMemo(() => {
    const now = new Date();
    const filtered = tasks.filter(
      (t) =>
        t.status === "pending" &&
        !isOverdue(t, now) &&
        !isDueToday(t, now) &&
        isDueThisWeek(t, now),
    );
    return sortByPriorityThenDue(filtered).slice(0, 4);
  }, [tasks]);

  const shoppingPendingCount = useMemo(
    () => shoppingItems.filter((i) => i.status === "pending").length,
    [shoppingItems],
  );

  const stocksToRenew = useMemo(
    () =>
      stocks
        .filter((s) => s.level === "low" || s.level === "empty")
        .sort((a, b) => {
          // empty avant low
          if (a.level !== b.level) return a.level === "empty" ? -1 : 1;
          return a.name.localeCompare(b.name, "fr");
        }),
    [stocks],
  );

  const activeRun = useMemo(() => runs[0], [runs]);
  const activeRunProgress = useMemo(() => {
    if (!activeRun) return null;
    return {
      done: activeRun.completedTasks ?? 0,
      total: activeRun.totalTasks ?? 0,
    };
  }, [activeRun]);

  const alerts = useMemo(
    () =>
      computeDashboardAlerts({
        stocks,
        runs,
        memoryEntries,
        tasks,
        now: new Date(),
      }),
    [stocks, runs, memoryEntries, tasks],
  );

  // Header sans sous-titre : Wesley a demandé de retirer le nom du cocon
  // (le nom reste affiché dans /settings/cocon).

  const sortedEvents = useMemo(
    () =>
      [...todayEvents].sort(
        (a, b) => a.startTime.toMillis() - b.startTime.toMillis(),
      ),
    [todayEvents],
  );

  return (
    <main className="flex flex-1 flex-col">
      <AppHeader />

      <div className="w-full max-w-md mx-auto flex flex-col gap-6 px-5 pt-2 pb-7">
        {/* Hero unifié : greeting + météo dans une card gradient subtile */}
        <section
          className="rounded-[20px] px-5 py-5 flex flex-col gap-3 border"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,107,36,0.12), rgba(255,200,69,0.04))",
            borderColor: "rgba(255,107,36,0.22)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground capitalize">
                {today}
              </p>
              <h1 className="font-display text-[28px] font-semibold leading-[1.05] mt-1">
                Bonjour{" "}
                <span className="greeting-gradient">{firstName}</span>
              </h1>
            </div>
            <HeroWeatherInline />
          </div>
          {household ? (
            <p className="text-[13px] text-muted-foreground leading-[1.5]">
              {summary}
            </p>
          ) : null}
        </section>

        {/* Suggestion IA */}
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
                <article
                  key={s.id}
                  className="rounded-[16px] bg-gradient-to-br from-[rgba(255,107,36,0.10)] to-[rgba(255,200,69,0.04)] border border-[rgba(255,107,36,0.24)] px-5 py-4 flex flex-col gap-2"
                >
                  <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-primary font-semibold flex items-center gap-1.5">
                    <Sparkles size={11} /> Suggestion · {s.templateEmoji}
                  </p>
                  <p className="font-display text-[17px] font-semibold leading-tight">
                    {s.triggerEventTitle}{" "}
                    <span className="text-muted-foreground font-normal">
                      arrive {daysLabel}
                    </span>
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    Lance « {s.templateName} » ?
                  </p>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => handleAcceptSuggestion(s)}
                      disabled={busy}
                      className="flex-1 rounded-[10px] bg-primary text-primary-foreground font-sans font-semibold text-[14px] px-3.5 py-2 shadow-[0_0_14px_rgba(255,107,36,0.4)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
                    >
                      {busy ? "..." : "Lancer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissSuggestion(s)}
                      disabled={busy}
                      className="rounded-[10px] border border-border bg-transparent text-foreground font-sans font-medium text-[13px] px-3.5 py-2 hover:bg-surface-elevated disabled:opacity-50"
                    >
                      Plus tard
                    </button>
                  </div>
                </article>
              );
            })
          : null}

        {/* Tâches du jour — section "importante" (zone d'attention principale) */}
        {todayTasks.length > 0 && household && user ? (
          <DashSection
            icon={CheckSquare}
            iconTone="primary"
            title="Tâches du jour"
            count={todayTasks.length}
            href="/tasks"
          >
            <ul className="flex flex-col gap-1.5">
              {todayTasks.map((t) => (
                <li key={t.id}>
                  <TaskRow
                    task={t}
                    householdId={household.id}
                    userId={user.uid}
                    overdue={isOverdue(t, new Date())}
                    compact
                  />
                </li>
              ))}
            </ul>
          </DashSection>
        ) : null}

        {/* Cette semaine */}
        {weekTasks.length > 0 && household && user ? (
          <DashSection
            icon={CheckSquare}
            iconTone="info"
            title="Cette semaine"
            count={weekTasks.length}
            href="/tasks"
          >
            <ul className="flex flex-col gap-1.5">
              {weekTasks.map((t) => (
                <li key={t.id}>
                  <TaskRow
                    task={t}
                    householdId={household.id}
                    userId={user.uid}
                    compact
                  />
                </li>
              ))}
            </ul>
          </DashSection>
        ) : null}

        {/* Agenda du jour */}
        {sortedEvents.length > 0 ? (
          <DashSection
            icon={Calendar}
            iconTone="info"
            title="Agenda du jour"
            count={sortedEvents.length}
            href="/calendar"
          >
            <ul className="flex flex-col gap-1.5">
              {sortedEvents.map((e) => {
                const start = e.startTime.toDate();
                const time = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
                return (
                  <li key={e.id}>
                    <Link
                      href={`/calendar/${e.id}`}
                      className="rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5 flex items-baseline gap-3 hover:bg-surface-elevated transition-colors"
                    >
                      <span className="font-display font-semibold text-[14px] text-primary shrink-0 w-12">
                        {time}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium truncate">
                          {e.title}
                        </div>
                        {e.location ? (
                          <div className="text-[11px] text-muted-foreground truncate">
                            {e.location}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </DashSection>
        ) : null}

        {/* Stocks à renouveler — liste détaillée */}
        {stocksToRenew.length > 0 ? (
          <DashSection
            icon={Box}
            iconTone="secondary"
            title="Stocks à renouveler"
            count={stocksToRenew.length}
            href="/stocks"
          >
            <ul className="flex flex-col gap-1.5">
              {stocksToRenew.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Link
                    href="/stocks"
                    className="rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5 flex items-center gap-2.5 hover:bg-surface-elevated transition-colors"
                  >
                    <span className="text-[16px] leading-none shrink-0">
                      {s.emoji ?? "📦"}
                    </span>
                    <span className="flex-1 text-[13px] leading-snug truncate">
                      {s.name}
                    </span>
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${
                        s.level === "empty"
                          ? "text-destructive"
                          : "text-[#FF6B24]"
                      }`}
                    >
                      {s.level === "empty" ? "Épuisé" : "Bas"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </DashSection>
        ) : null}

        {/* Alertes du foyer (garanties + récurrentes demain) */}
        {alerts.length > 0 ? (
          <DashSection
            icon={AlertTriangle}
            iconTone="destructive"
            title="Alertes du foyer"
            count={alerts.length}
          >
            <ul className="flex flex-col gap-1.5">
              {alerts.map((a, idx) => (
                <li key={`${a.kind}-${idx}`}>
                  <Link
                    href={a.href}
                    className="rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5 flex items-center gap-2.5 hover:bg-surface-elevated transition-colors"
                  >
                    <span className="text-[16px] leading-none shrink-0">
                      {a.emoji}
                    </span>
                    <span className="flex-1 text-[13px] leading-snug truncate">
                      {a.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </DashSection>
        ) : null}

        {/* Préparation en cours */}
        {activeRun && activeRunProgress ? (
          <DashSection
            icon={CheckSquare}
            iconTone="success"
            title="Préparation en cours"
            href="/preparations"
          >
            <Link
              href="/preparations"
              className="rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5 flex items-center gap-2.5 hover:bg-surface-elevated transition-colors"
            >
              <span className="text-[18px] leading-none shrink-0">
                {activeRun.templateEmoji ?? "🗂️"}
              </span>
              <div className="flex-1 flex flex-col min-w-0">
                <span className="text-[13px] font-medium truncate">
                  {activeRun.templateName}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {activeRunProgress.done}/{activeRunProgress.total} tâches
                  faites
                </span>
              </div>
            </Link>
          </DashSection>
        ) : null}

        {/* Liste de courses */}
        <DashSection
          icon={ShoppingBag}
          iconTone="primary"
          title="Liste de courses"
          count={
            shoppingPendingCount > 0 ? shoppingPendingCount : undefined
          }
          href="/shopping"
        >
          <Link
            href="/shopping"
            className="rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5 flex items-center gap-2.5 hover:bg-surface-elevated transition-colors"
          >
            <span className="text-[16px] leading-none shrink-0">🛒</span>
            <span className="flex-1 text-[13px]">
              {shoppingPendingCount > 0
                ? `${shoppingPendingCount} article${shoppingPendingCount > 1 ? "s" : ""} à acheter`
                : "Liste vide — tap pour ajouter"}
            </span>
          </Link>
        </DashSection>

        {/* Score d'équilibre (opt-in) */}
        {balance && household && members.length > 0 ? (
          <Link
            href="/balance"
            className="rounded-[14px] bg-surface border border-border-subtle px-5 py-4 flex flex-col gap-2 hover:border-border transition-colors"
          >
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Équilibre · 7 jours
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
                const scale = 0.7 + (stats.weight / maxW) * 0.4;
                const isMe = m.uid === user?.uid;
                return (
                  <div
                    key={m.uid}
                    className="flex flex-col items-center gap-0.5"
                    style={{ transform: `scale(${scale})` }}
                  >
                    <MemberAvatar
                      member={m}
                      size={38}
                      variant={isMe ? "primary" : "secondary"}
                    />
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
            <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-secondary to-primary"
                style={{
                  width: `${Math.max(8, (1 - balance.balanceRatio) * 100)}%`,
                }}
              />
            </div>
          </Link>
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
