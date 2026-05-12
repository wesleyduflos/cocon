"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { useMembers } from "@/hooks/use-members";
import { useTasks } from "@/hooks/use-tasks";
import {
  buildPersonalizedMessage,
  calculateBalance,
  type BalanceWindow,
} from "@/lib/balance/score";
import { updateHousehold } from "@/lib/firebase/firestore";

export default function BalancePage() {
  const { user } = useAuth();
  const { household, loading } = useCurrentHousehold();
  const { tasks } = useTasks(household?.id);
  const { members } = useMembers(household?.memberIds);
  const { showToast } = useToast();

  const [window, setWindow] = useState<BalanceWindow>("7d");
  const [disabling, setDisabling] = useState(false);

  const balance = useMemo(() => {
    if (!household) return null;
    return calculateBalance(tasks, household.memberIds, window, new Date());
  }, [household, tasks, window]);

  const nameByUid = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members) map[m.uid] = m.displayName;
    return map;
  }, [members]);

  const message = useMemo(() => {
    if (!balance) return "";
    return buildPersonalizedMessage(
      balance.balanceRatio,
      balance.perMember,
      balance.totalWeight,
      nameByUid,
    );
  }, [balance, nameByUid]);

  async function handleDisable() {
    if (!household) return;
    if (
      !globalThis.confirm(
        "Désactiver le score d'équilibre pour tout le cocon ?",
      )
    )
      return;
    setDisabling(true);
    try {
      await updateHousehold(household.id, { balanceEnabled: false });
      showToast({ message: "Score désactivé" });
    } finally {
      setDisabling(false);
    }
  }

  if (!loading && (!household || !household.balanceEnabled)) {
    return (
      <main className="flex flex-1 flex-col px-5 py-7">
        <div className="w-full max-w-md mx-auto flex flex-col gap-5">
          <header className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Retour"
              className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="font-display text-[22px] font-semibold">
              Équilibre
            </h1>
          </header>
          <p className="text-[14px] text-muted-foreground">
            Le score d&apos;équilibre n&apos;est pas activé pour ce cocon.
          </p>
          <Link
            href="/settings/cocon"
            className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[14px] text-center"
          >
            Activer dans les paramètres
          </Link>
        </div>
      </main>
    );
  }

  const maxWeight = balance
    ? Math.max(
        ...Object.values(balance.perMember).map((s) => s.weight),
        1,
      )
    : 1;

  return (
    <main className="flex flex-1 flex-col px-5 py-7">
      <div className="w-full max-w-md mx-auto flex flex-col gap-6">
        <header className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Retour"
            className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex flex-col">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Foyer
            </p>
            <h1 className="font-display text-[22px] font-semibold leading-tight">
              Équilibre
            </h1>
          </div>
        </header>

        {/* Toggle 7j / 30j */}
        <div className="inline-flex rounded-[12px] border border-border bg-surface p-1 self-start">
          {(["7d", "30d"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindow(w)}
              className={`px-4 py-1.5 text-[13px] font-medium rounded-[8px] transition-colors ${
                window === w
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {w === "7d" ? "7 jours" : "30 jours"}
            </button>
          ))}
        </div>

        {/* Message global */}
        <section className="rounded-[14px] bg-surface border border-border-subtle px-5 py-4 flex flex-col gap-2">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Résumé
          </p>
          <p className="text-[15px] text-foreground leading-snug">
            {message}
          </p>
          {balance ? (
            <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-secondary to-primary"
                style={{
                  width: `${Math.max(8, (1 - balance.balanceRatio) * 100)}%`,
                }}
              />
            </div>
          ) : null}
        </section>

        {/* Barres horizontales par membre */}
        {balance && members.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Par membre
            </h2>
            <ul className="flex flex-col gap-3">
              {members.map((m) => {
                const stats = balance.perMember[m.uid] ?? {
                  count: 0,
                  weight: 0,
                  categories: [],
                };
                const pct = (stats.weight / maxWeight) * 100;
                const isMe = m.uid === user?.uid;
                return (
                  <li
                    key={m.uid}
                    className="flex flex-col gap-1.5 rounded-[12px] bg-surface border border-border-subtle px-4 py-3"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-[14px] font-medium">
                        {isMe ? `${m.displayName} (toi)` : m.displayName}
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        {stats.count} tâche{stats.count > 1 ? "s" : ""} ·{" "}
                        {stats.weight} pts
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
                      <div
                        className={`h-full ${isMe ? "bg-primary" : "bg-secondary"}`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                    {stats.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {stats.categories.map((c) => (
                          <span
                            key={c}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-surface-elevated text-muted-foreground"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* Pied : désactivation */}
        <section className="flex flex-col gap-2 mt-2">
          <button
            type="button"
            onClick={handleDisable}
            disabled={disabling}
            className="text-[12px] text-foreground-faint hover:text-destructive transition-colors text-left"
          >
            {disabling ? "..." : "Désactiver le score d'équilibre"}
          </button>
          <p className="text-[11px] text-foreground-faint leading-snug">
            Le score est calculé à partir des tâches complétées. Il vise à
            donner une vue partagée, pas à comparer.
          </p>
        </section>
      </div>
    </main>
  );
}
