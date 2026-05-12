"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";

import { useCurrentHousehold } from "@/hooks/use-household";
import { useJournalEntries } from "@/hooks/use-journal";
import {
  buildJournalText,
  groupByDay,
  iconForType,
} from "@/lib/journal/journal";

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function JournalPage() {
  const { household, loading: householdLoading } = useCurrentHousehold();
  const { entries, loading, loadingMore, hasMore, loadMore } =
    useJournalEntries(household?.id);

  const groups = useMemo(() => groupByDay(entries, new Date()), [entries]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entriesObs) => {
        for (const entry of entriesObs) {
          if (entry.isIntersecting && hasMore && !loadingMore) {
            loadMore();
          }
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  return (
    <main className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b border-border-subtle bg-background/90 backdrop-blur-xl">
        <Link
          href="/more"
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
            Journal
          </h1>
        </div>
      </header>

      <div className="w-full max-w-md mx-auto flex flex-col px-5 pb-10">
        {householdLoading || loading ? (
          <p className="text-[14px] text-muted-foreground mt-8 text-center">
            Chargement…
          </p>
        ) : entries.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <span className="text-[44px]">📓</span>
            <p className="font-display text-[18px] font-semibold">
              Le journal est encore vide
            </p>
            <p className="text-[13px] text-muted-foreground max-w-[260px]">
              Au fur et à mesure que tu termines des tâches, lances des
              préparations ou renouvelles des stocks, les événements
              apparaîtront ici.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-5 mt-4">
            {groups.map((group) => (
              <li key={group.key} className="flex flex-col gap-2">
                <h2 className="sticky top-[72px] z-[5] bg-background/90 backdrop-blur-xl py-1 text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
                  {group.label}
                </h2>
                <ul className="flex flex-col gap-2">
                  {group.entries.map((entry) => {
                    const time = formatTime(entry.createdAt.toDate());
                    return (
                      <li
                        key={entry.id}
                        className="rounded-[12px] bg-surface border border-border-subtle px-3.5 py-3 flex items-start gap-3"
                      >
                        <span className="text-[18px] leading-none mt-0.5">
                          {iconForType(entry.type)}
                        </span>
                        <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                          <p className="text-[13.5px] leading-snug">
                            {buildJournalText(entry)}
                          </p>
                          <p className="text-[11px] text-foreground-faint">
                            {time}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {/* Sentinel pour scroll infini */}
        {hasMore && entries.length > 0 ? (
          <div ref={sentinelRef} className="h-12 flex items-center justify-center">
            {loadingMore ? (
              <span className="text-[12px] text-muted-foreground">
                Chargement…
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
