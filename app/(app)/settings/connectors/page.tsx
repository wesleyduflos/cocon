"use client";

import { doc as fsDoc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ArrowLeft, Calendar, CheckCircle2, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentHousehold } from "@/hooks/use-household";
import { db, functions } from "@/lib/firebase/client";

// Google OAuth scopes : lecture seule du calendrier + email
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

interface GoogleIntegrationDoc {
  googleEmail: string;
  connectedAt: { toDate: () => Date };
  lastSyncAt?: { toDate: () => Date };
  syncedEventsCount?: number;
}

export default function ConnectorsSettingsPage() {
  const { user } = useAuth();
  const { household } = useCurrentHousehold();
  const { showToast } = useToast();

  const [integration, setIntegration] = useState<GoogleIntegrationDoc | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const ref = fsDoc(db, "users", user.uid, "integrations", "google");
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setIntegration(snap.data() as GoogleIntegrationDoc);
        } else {
          setIntegration(null);
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [user]);

  function handleConnect() {
    if (typeof window === "undefined") return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      showToast({
        message:
          "Variable NEXT_PUBLIC_GOOGLE_CLIENT_ID manquante côté Netlify.",
      });
      return;
    }
    const redirectUri = `${window.location.origin}/integrations/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async function handleSync() {
    if (!household) return;
    setSyncing(true);
    try {
      const callable = httpsCallable<
        { householdId: string },
        { syncedCount: number }
      >(functions, "syncGoogleCalendar");
      const result = await callable({ householdId: household.id });
      showToast({
        message: `${result.data.syncedCount} événement${result.data.syncedCount > 1 ? "s" : ""} synchronisé${result.data.syncedCount > 1 ? "s" : ""}`,
      });
    } catch (err) {
      showToast({
        message:
          err instanceof Error
            ? err.message
            : "Sync impossible. Vérifie la connexion.",
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!household) return;
    if (!window.confirm("Déconnecter Google Calendar et retirer les événements importés ?"))
      return;
    setDisconnecting(true);
    try {
      const callable = httpsCallable<
        { householdId: string },
        { deletedEvents: number }
      >(functions, "disconnectGoogle");
      const result = await callable({ householdId: household.id });
      showToast({
        message: `Déconnecté · ${result.data.deletedEvents} événement(s) retiré(s)`,
      });
    } catch (err) {
      showToast({
        message:
          err instanceof Error ? err.message : "Déconnexion impossible.",
      });
    } finally {
      setDisconnecting(false);
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
              Connecteurs
            </h1>
          </div>
        </header>

        {/* Google Calendar */}
        <section className="rounded-[14px] border border-border bg-surface px-4 py-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Calendar size={24} className="text-primary shrink-0 mt-0.5" />
            <div className="flex-1 flex flex-col gap-0.5">
              <p className="text-[15px] font-semibold">Google Calendar</p>
              <p className="text-[12px] text-muted-foreground leading-snug">
                Import lecture seule des événements des 60 prochains jours.
              </p>
            </div>
            {integration ? (
              <CheckCircle2
                size={18}
                className="text-secondary shrink-0 mt-0.5"
              />
            ) : null}
          </div>

          {loading ? (
            <p className="text-[12px] text-muted-foreground">Chargement…</p>
          ) : integration ? (
            <>
              <div className="flex flex-col gap-1 pl-9">
                <p className="text-[13px] text-foreground">
                  Connecté en tant que{" "}
                  <span className="font-medium">{integration.googleEmail}</span>
                </p>
                {integration.lastSyncAt ? (
                  <p className="text-[11px] text-foreground-faint">
                    Dernière sync :{" "}
                    {integration.lastSyncAt
                      .toDate()
                      .toLocaleString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    {" · "}
                    {integration.syncedEventsCount ?? 0} événement(s)
                  </p>
                ) : (
                  <p className="text-[11px] text-foreground-faint">
                    Pas encore synchronisé.
                  </p>
                )}
              </div>
              <div className="flex gap-2 pl-9">
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing || !household}
                  className="rounded-[10px] bg-primary text-primary-foreground text-[13px] font-semibold px-3 py-1.5 shadow-[0_0_10px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                  {syncing ? "Sync…" : "Synchroniser"}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting || !household}
                  className="rounded-[10px] border border-border text-foreground text-[13px] font-semibold px-3 py-1.5 hover:bg-surface-elevated disabled:opacity-50"
                >
                  {disconnecting ? "..." : "Déconnecter"}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              className="self-start ml-9 rounded-[10px] bg-primary text-primary-foreground text-[13px] font-semibold px-4 py-2 shadow-[0_0_10px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] inline-flex items-center gap-2"
            >
              <LinkIcon size={14} />
              Connecter Google Calendar
            </button>
          )}
        </section>

        {/* Outlook (bientôt) */}
        <article className="rounded-[14px] border border-border-subtle bg-surface px-4 py-4 flex items-start gap-3 opacity-60">
          <div className="text-[24px] shrink-0">📨</div>
          <div className="flex-1 flex flex-col gap-0.5">
            <p className="text-[15px] font-semibold">Outlook</p>
            <p className="text-[11px] uppercase tracking-[0.1em] text-foreground-faint">
              Bientôt
            </p>
          </div>
        </article>

        {/* Apple Calendar (bientôt) */}
        <article className="rounded-[14px] border border-border-subtle bg-surface px-4 py-4 flex items-start gap-3 opacity-60">
          <div className="text-[24px] shrink-0">🍎</div>
          <div className="flex-1 flex flex-col gap-0.5">
            <p className="text-[15px] font-semibold">Apple Calendar (ICS)</p>
            <p className="text-[11px] uppercase tracking-[0.1em] text-foreground-faint">
              Bientôt
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
