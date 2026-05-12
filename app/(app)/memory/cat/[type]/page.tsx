"use client";

import { ArrowLeft, Plus, Search } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
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

const VALID_TYPES: MemoryEntryType[] = [
  "code",
  "object",
  "contact",
  "manual",
  "warranty",
  "note",
];

function isMemoryEntryType(s: string): s is MemoryEntryType {
  return (VALID_TYPES as string[]).includes(s);
}

function EntryRow({ entry }: { entry: WithId<MemoryEntry> }) {
  return (
    <Link
      href={`/memory/${entry.id}`}
      className="rounded-[12px] border border-border bg-surface px-4 py-3 flex items-center gap-3 hover:bg-surface-elevated transition-colors"
    >
      <span className="text-[20px]">
        {entry.emoji ?? TYPE_EMOJI[entry.type]}
      </span>
      <div className="flex-1 flex flex-col min-w-0">
        <span className="text-[14px] font-medium truncate">{entry.title}</span>
        <span className="text-[11px] text-muted-foreground">
          {TYPE_LABEL[entry.type]}
          {entry.isSensitive ? " · 🔒" : ""}
        </span>
      </div>
    </Link>
  );
}

export default function MemoryTypePage() {
  const params = useParams();
  const typeParam = (params.type as string) ?? "";
  if (!isMemoryEntryType(typeParam)) {
    notFound();
  }
  const type = typeParam as MemoryEntryType;

  const { household } = useCurrentHousehold();
  const { entries, loading } = useMemoryEntries(household?.id);
  const [searchValue, setSearchValue] = useState("");

  // Filtre par type d'abord, puis search sur le sous-ensemble.
  const filtered = useMemo(
    () => entries.filter((e) => e.type === type),
    [entries, type],
  );

  const searched = useMemo(() => {
    if (searchValue.trim().length < 2) return null;
    return matchQuery(filtered, searchValue);
  }, [filtered, searchValue]);

  const displayed = searched ?? filtered;

  return (
    <main className="flex flex-1 flex-col px-5 py-6">
      <div className="w-full max-w-md mx-auto flex flex-col gap-5">
        <header className="flex items-center gap-3">
          <Link
            href="/memory"
            aria-label="Retour"
            className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex flex-col flex-1">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Mémoire
            </p>
            <h1 className="font-display text-[22px] font-semibold leading-tight">
              {TYPE_EMOJI[type]} {TYPE_LABEL[type]}{" "}
              <span className="text-muted-foreground font-normal text-[16px]">
                · {filtered.length}
              </span>
            </h1>
          </div>
          <Link
            href={`/memory/new?type=${type}`}
            aria-label="Ajouter"
            className="w-9 h-9 rounded-[10px] bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_14px_rgba(255,107,36,0.45)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus size={18} strokeWidth={2.4} />
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
            placeholder={`Rechercher dans ${TYPE_LABEL[type].toLowerCase()}…`}
            className="w-full rounded-[12px] border border-border bg-surface pl-9 pr-4 py-2.5 text-[14px] focus:outline-none focus:border-primary"
          />
        </div>

        {loading ? (
          <p className="text-[13px] text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="text-[40px]">{TYPE_EMOJI[type]}</div>
            <h2 className="font-display text-[22px] font-semibold leading-[1.1]">
              Aucun élément dans{" "}
              <span className="greeting-gradient">{TYPE_LABEL[type]}</span>
            </h2>
            <p className="text-[14px] text-muted-foreground max-w-[280px] leading-[1.5]">
              Ajoute ta première entrée pour la retrouver facilement.
            </p>
            <Link
              href={`/memory/new?type=${type}`}
              className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors mt-2"
            >
              Première entrée →
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {displayed.length === 0 ? (
              <li className="text-[13px] text-muted-foreground text-center py-6">
                Aucun résultat pour « {searchValue} ».
              </li>
            ) : (
              displayed.map((e) => (
                <li key={e.id}>
                  <EntryRow entry={e} />
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </main>
  );
}
