"use client";

import { onSnapshot } from "firebase/firestore";
import { ArrowLeft, Eye, EyeOff, Pin, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useCurrentHousehold } from "@/hooks/use-household";
import {
  deleteMemoryEntry,
  markMemoryEntryViewed,
  memoryEntryDoc,
  updateMemoryEntry,
} from "@/lib/firebase/firestore";
import {
  isUserVerifyingPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
} from "@/lib/auth/passkey";
import type { MemoryEntry, MemoryEntryType, WithId } from "@/types/cocon";

const TYPE_LABEL: Record<MemoryEntryType, string> = {
  code: "Code",
  object: "Objet",
  contact: "Contact",
  manual: "Manuel",
  warranty: "Garantie",
  note: "Note",
};

function maskValue(value: string): string {
  if (value.length <= 2) return "••";
  return value.replace(/./g, "•");
}

async function requireBiometricConfirmation(): Promise<boolean> {
  // Tentative passkey/biométrie native pour confirmer l'identité du
  // device avant de dévoiler. Si pas dispo, fallback sur window.confirm.
  if (!isWebAuthnSupported()) return window.confirm("Révéler cette valeur ?");
  const hasPlatform = await isUserVerifyingPlatformAuthenticatorAvailable();
  if (!hasPlatform) return window.confirm("Révéler cette valeur ?");
  try {
    // userVerification: 'required' impose la biométrie / PIN
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    await navigator.credentials.get({
      publicKey: {
        challenge,
        userVerification: "required",
        timeout: 30_000,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export default function MemoryEntryDetailPage() {
  const router = useRouter();
  const params = useParams<{ entryId: string }>();
  const entryId = params.entryId;
  const { household } = useCurrentHousehold();
  const { showToast } = useToast();

  const [entry, setEntry] = useState<WithId<MemoryEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!household?.id || !entryId) return;
    const unsubscribe = onSnapshot(
      memoryEntryDoc(household.id, entryId),
      (snap) => {
        if (!snap.exists()) {
          setEntry(null);
          setLoading(false);
          return;
        }
        setEntry({ ...snap.data(), id: snap.id });
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [household?.id, entryId]);

  // Mark lastViewedAt à l'ouverture
  useEffect(() => {
    if (!household?.id || !entryId || !entry) return;
    markMemoryEntryViewed(household.id, entryId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, entryId, entry?.id]);

  async function handleReveal() {
    if (!entry?.isSensitive) {
      setRevealed(true);
      return;
    }
    const ok = await requireBiometricConfirmation();
    if (ok) setRevealed(true);
  }

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast({ message: "Copié" });
    } catch {
      showToast({ message: "Copie impossible" });
    }
  }

  async function handleTogglePin() {
    if (!household || !entry) return;
    setBusy(true);
    try {
      await updateMemoryEntry(household.id, entry.id, {
        pinned: !entry.pinned,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!household || !entry) return;
    if (!window.confirm("Supprimer définitivement cette entrée ?")) return;
    setBusy(true);
    try {
      await deleteMemoryEntry(household.id, entry.id);
      router.replace("/memory");
    } catch {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  if (!entry) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 gap-4">
        <p className="text-[14px] text-muted-foreground">Entrée introuvable.</p>
        <button
          type="button"
          onClick={() => router.replace("/memory")}
          className="rounded-[12px] border border-border bg-transparent text-foreground font-sans font-semibold text-[14px] px-[16px] py-2"
        >
          Retour
        </button>
      </main>
    );
  }

  const fields = Object.entries(entry.structuredData).filter(
    ([, v]) => v !== undefined && v !== "",
  );

  return (
    <main className="flex flex-1 flex-col px-5 py-4">
      <header className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleTogglePin}
            disabled={busy}
            aria-label={entry.pinned ? "Désépingler" : "Épingler"}
            className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors ${
              entry.pinned
                ? "bg-primary text-primary-foreground"
                : "bg-surface hover:bg-surface-elevated"
            } disabled:opacity-50`}
          >
            <Pin size={16} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label="Supprimer"
            className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-destructive/20 hover:text-destructive"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-md w-full mx-auto flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            {TYPE_LABEL[entry.type]}
            {entry.isSensitive ? " · 🔒 sensible" : ""}
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-[1.1] flex items-center gap-2">
            {entry.emoji ? (
              <span className="text-[28px]">{entry.emoji}</span>
            ) : null}
            {entry.title}
          </h1>
        </section>

        {fields.length > 0 ? (
          <section className="flex flex-col gap-2">
            {fields.map(([key, value]) => {
              const isSensitiveValue =
                entry.isSensitive && entry.type === "code" && key === "value";
              const displayed =
                isSensitiveValue && !revealed
                  ? maskValue(String(value))
                  : String(value);
              return (
                <article
                  key={key}
                  className="rounded-[14px] border border-border bg-surface px-4 py-3 flex flex-col gap-1.5"
                >
                  <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground capitalize">
                    {key}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isSensitiveValue && !revealed) {
                        handleReveal();
                      } else {
                        handleCopy(String(value));
                      }
                    }}
                    className="text-[15px] font-mono text-foreground text-left break-all flex items-center justify-between gap-3 group"
                  >
                    <span>{displayed}</span>
                    {isSensitiveValue ? (
                      revealed ? (
                        <EyeOff
                          size={14}
                          className="text-muted-foreground shrink-0"
                        />
                      ) : (
                        <Eye
                          size={14}
                          className="text-primary shrink-0"
                        />
                      )
                    ) : (
                      <span className="text-[11px] text-foreground-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        copier
                      </span>
                    )}
                  </button>
                </article>
              );
            })}
          </section>
        ) : null}

        {entry.tags.length > 0 ? (
          <section className="flex flex-wrap gap-1.5">
            {entry.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-surface border border-border px-3 py-1 text-[12px] text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
