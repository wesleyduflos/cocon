"use client";

import { getDoc } from "firebase/firestore";
import { ArrowLeft, Fingerprint, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import {
  deletePasskey,
  isWebAuthnSupported,
  listPasskeys,
  type PasskeyEntry,
  registerPasskey,
} from "@/lib/auth/passkey";
import { updateUserDisplayName, userDoc } from "@/lib/firebase/firestore";

function formatDate(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const supportsWebAuthn = isWebAuthnSupported();

  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [passkeys, setPasskeys] = useState<PasskeyEntry[]>([]);
  const [passkeysLoading, setPasskeysLoading] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDoc(userDoc(user.uid))
      .then((snap) => {
        if (cancelled) return;
        setDisplayName(snap.data()?.displayName ?? "");
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !supportsWebAuthn) return;
    let cancelled = false;
    setPasskeysLoading(true);
    listPasskeys()
      .then((list) => {
        if (cancelled) return;
        setPasskeys(list);
        setPasskeysLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setPasskeysLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, supportsWebAuthn]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await updateUserDisplayName(user.uid, displayName.trim());
      showToast({ message: "Profil mis à jour" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegisterPasskey() {
    setPasskeyBusy(true);
    try {
      const { deviceName } = await registerPasskey();
      showToast({ message: `Passkey enregistrée pour ${deviceName}` });
      const refreshed = await listPasskeys();
      setPasskeys(refreshed);
    } catch (err) {
      showToast({
        message:
          err instanceof Error
            ? err.message
            : "Enregistrement annulé ou échoué.",
      });
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function handleDeletePasskey(credentialId: string) {
    if (!window.confirm("Supprimer cette passkey ?")) return;
    setPasskeyBusy(true);
    try {
      await deletePasskey(credentialId);
      setPasskeys((current) =>
        current.filter((p) => p.credentialId !== credentialId),
      );
      showToast({ message: "Passkey supprimée" });
    } catch (err) {
      showToast({
        message:
          err instanceof Error ? err.message : "Suppression impossible.",
      });
    } finally {
      setPasskeyBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-7">
      <div className="w-full max-w-md mx-auto flex flex-col gap-6">
        <header className="flex items-center gap-3">
          <Link
            href="/settings"
            aria-label="Retour"
            className="w-9 h-9 rounded-[10px] bg-surface flex items-center justify-center hover:bg-surface-elevated transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex flex-col">
            <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Paramètres
            </p>
            <h1 className="font-display text-[22px] font-semibold leading-tight">
              Mon profil
            </h1>
          </div>
        </header>

        {loading ? (
          <p className="text-[13px] text-muted-foreground">Chargement…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="display-name"
                className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground"
              >
                Prénom affiché
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
                required
                disabled={submitting}
                className="rounded-[12px] border border-border bg-surface px-4 py-3 text-[15px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(255,107,36,0.18)] disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
                Email
              </span>
              <p className="rounded-[12px] border border-border-subtle bg-transparent px-4 py-3 text-[15px] text-muted-foreground">
                {user?.email ?? "—"}
              </p>
              <p className="text-[12px] text-foreground-faint">
                L&apos;email est lié à ton compte d&apos;authentification et ne peut pas être modifié ici.
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting || displayName.trim().length === 0}
              className="rounded-[12px] bg-primary text-primary-foreground font-sans font-semibold text-[15px] px-[18px] py-3 shadow-[0_0_20px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-start"
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        )}

        <section className="flex flex-col gap-3 mt-4">
          <div className="flex items-center gap-2">
            <Fingerprint size={16} className="text-primary" />
            <h2 className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Passkeys
            </h2>
          </div>
          {!supportsWebAuthn ? (
            <p className="text-[13px] text-muted-foreground rounded-[12px] border border-border-subtle bg-surface px-4 py-3">
              Ton navigateur ne supporte pas WebAuthn. Utilise Chrome, Edge,
              Safari ou Firefox récents.
            </p>
          ) : passkeysLoading ? (
            <p className="text-[13px] text-muted-foreground">Chargement…</p>
          ) : (
            <>
              {passkeys.length === 0 ? (
                <p className="text-[13px] text-muted-foreground rounded-[12px] border border-border bg-surface px-4 py-3">
                  Aucune passkey enregistrée. Active la connexion biométrique
                  (Face ID, empreinte, Windows Hello) pour les prochaines fois.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {passkeys.map((p) => (
                    <li
                      key={p.credentialId}
                      className="rounded-[12px] border border-border bg-surface px-4 py-3 flex items-center gap-3"
                    >
                      <Fingerprint
                        size={18}
                        className="text-primary shrink-0"
                      />
                      <div className="flex-1 flex flex-col">
                        <span className="text-[14px] font-medium">
                          {p.deviceName}
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          Ajoutée le {formatDate(p.createdAt)}
                          {p.lastUsedAt > p.createdAt
                            ? ` · vue le ${formatDate(p.lastUsedAt)}`
                            : ""}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePasskey(p.credentialId)}
                        disabled={passkeyBusy}
                        aria-label="Supprimer cette passkey"
                        className="w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={handleRegisterPasskey}
                disabled={passkeyBusy}
                className="self-start rounded-[10px] bg-primary text-primary-foreground text-[13px] font-semibold px-4 py-2 shadow-[0_0_10px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Fingerprint size={14} />
                {passkeyBusy
                  ? "..."
                  : passkeys.length === 0
                    ? "Enregistrer une passkey"
                    : "Ajouter une autre passkey"}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
