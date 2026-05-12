"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useCurrentHousehold } from "@/hooks/use-household";
import { useMemoryEntries } from "@/hooks/use-memory";
import { matchQuery } from "@/lib/memory/tokenize";
import type { MemoryEntry, MemoryEntryType, WithId } from "@/types/cocon";

const TYPE_LABEL: Record<MemoryEntryType, string> = {
  code: "Codes",
  object: "Objets",
  contact: "Contacts",
  manual: "Manuels",
  warranty: "Garanties",
  note: "Notes",
};

const TYPE_EMOJI: Record<MemoryEntryType, string> = {
  code: "🔐",
  object: "📦",
  contact: "📞",
  manual: "📖",
  warranty: "📄",
  note: "📝",
};

const TYPE_ORDER: MemoryEntryType[] = [
  "code",
  "object",
  "contact",
  "manual",
  "warranty",
  "note",
];

function PinnedCard({ entry }: { entry: WithId<MemoryEntry> }) {
  return (
    <Link
      href={`/memory/${entry.id}`}
      className="shrink-0 w-44 rounded-[14px] border border-border bg-surface px-4 py-3 flex flex-col gap-1 hover:bg-surface-elevated transition-colors"
    >
      <span className="text-[20px]">{entry.emoji ?? TYPE_EMOJI[entry.type]}</span>
      <span className="text-[13px] font-medium truncate">{entry.title}</span>
      <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {TYPE_LABEL[entry.type]}
      </span>
    </Link>
  );
}

export default function MemoryPage() {
  const { household } = useCurrentHousehold();
  const { entries, loading } = useMemoryEntries(household?.id);
  const [searchValue, setSearchValue] = useState("");

  const searched = useMemo(() => {
    if (searchValue.trim().length < 2) return null;
    return matchQuery(entries, searchValue);
  }, [entries, searchValue]);

  const pinned = entries
    .filter((e) => e.pinned)
    .sort((a, b) => (a.pinnedOrder ?? 99) - (b.pinnedOrder ?? 99));

  const countsByType = useMemo(() => {
    const map = new Map<MemoryEntryType, number>();
    for (const e of entries) {
      map.set(e.type, (map.get(e.type) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  const recent = useMemo(
    () =>
      [...entries]
        .filter((e) => e.lastViewedAt)
        .sort(
          (a, b) =>
            (b.lastViewedAt?.toMillis() ?? 0) -
            (a.lastViewedAt?.toMillis() ?? 0),
        )
        .slice(0, 5),
    [entries],
  );

  return (
    <main className="flex flex-1 flex-col px-5 py-6">
      <div className="w-full max-w-md mx-auto flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Bibliothèque
            </p>
            <h1 className="font-display text-[28px] font-semibold leading-[1.05]">
              Mémoire{" "}
              <span className="text-muted-foreground font-normal text-[20px]">
                · {entries.length}
              </span>
            </h1>
          </div>
          <Link
            href="/memory/new"
            aria-label="Ajouter une entrée"
            className="w-10 h-10 rounded-[10px] bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_14px_rgba(255,107,36,0.45)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus size={20} strokeWidth={2.4} />
          </Link>
        </header>

        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Rechercher dans le cocon…"
            className="w-full rounded-[12px] border border-border bg-surface pl-9 pr-4 py-2.5 text-[14px] focus:outline-none focus:border-primary"
          />
        </div>

        {loading ? (
          <p className="text-[13px] text-muted-foreground">Chargement…</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="text-[40px]">📚</div>
            <h2 className="font-display text-[22px] font-semibold leading-[1.1]">
              Ta mémoire du cocon{" "}
              <span className="greeting-gradient">t&apos;attend</span>
            </h2>
            <p className="text-[14px] text-muted-foreground max-w-[280px] leading-[1.5]">
              Code Wi-Fi, plombier, mot de passe Netflix… tout ici.
            </p>
            <Link
              href="/memory/new"
              className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors mt-2"
            >
              Première entrée →
            </Link>
          </div>
        ) : searched ? (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              {searched.length} résultat{searched.length > 1 ? "s" : ""}
            </h2>
            <ul className="flex flex-col gap-2">
              {searched.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/memory/${e.id}`}
                    className="rounded-[12px] border border-border bg-surface px-4 py-3 flex items-center gap-3 hover:bg-surface-elevated"
                  >
                    <span className="text-[20px]">
                      {e.emoji ?? TYPE_EMOJI[e.type]}
                    </span>
                    <div className="flex-1 flex flex-col min-w-0">
                      <span className="text-[14px] font-medium truncate">
                        {e.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {TYPE_LABEL[e.type]}
                        {e.isSensitive ? " · 🔒" : ""}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <>
            {pinned.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
                  ❤️ Épinglés
                </h2>
                <div className="flex gap-2 overflow-x-auto -mx-5 px-5 scrollbar-hide pb-1">
                  {pinned.map((e) => (
                    <PinnedCard key={e.id} entry={e} />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="flex flex-col gap-3">
              <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
                Catégories
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_ORDER.map((t) => {
                  const count = countsByType.get(t) ?? 0;
                  return (
                    <Link
                      key={t}
                      href={`/memory/cat/${t}`}
                      className="rounded-[14px] border border-border bg-surface px-4 py-3 flex items-center gap-3 hover:bg-surface-elevated"
                    >
                      <span className="text-[22px]">{TYPE_EMOJI[t]}</span>
                      <div className="flex-1 flex flex-col">
                        <span className="text-[13px] font-medium">
                          {TYPE_LABEL[t]}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {count}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {recent.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
                  Récemment consultés
                </h2>
                <ul className="flex flex-col gap-1.5">
                  {recent.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/memory/${e.id}`}
                        className="flex items-center gap-3 text-[13px] px-3 py-2 rounded-[10px] hover:bg-surface"
                      >
                        <span>{e.emoji ?? TYPE_EMOJI[e.type]}</span>
                        <span className="flex-1 truncate">{e.title}</span>
                        <span className="text-[11px] text-foreground-faint">
                          {TYPE_LABEL[e.type]}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
