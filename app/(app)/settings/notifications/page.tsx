"use client";

import { getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ArrowLeft, BellRing } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useToast } from "@/components/shared/toast-provider";
import { useAuth } from "@/hooks/use-auth";
import { functions } from "@/lib/firebase/client";
import { updateUserPreferences, userDoc } from "@/lib/firebase/firestore";
import {
  checkMessagingSupport,
  enableNotifications,
  type MessagingSupportState,
} from "@/lib/notifications/fcm";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function NotificationsSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [supportState, setSupportState] =
    useState<MessagingSupportState>("unknown");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(7);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    checkMessagingSupport().then(setSupportState);
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDoc(userDoc(user.uid))
      .then((snap) => {
        if (cancelled) return;
        const prefs = snap.data()?.preferences;
        setEnabled(prefs?.notificationsEnabled ?? true);
        setQuietStart(prefs?.quietHoursStart ?? 22);
        setQuietEnd(prefs?.quietHoursEnd ?? 7);
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

  async function handleEnable() {
    if (!user) return;
    setBusy(true);
    try {
      const token = await enableNotifications(user.uid);
      if (!token) {
        showToast({
          message:
            "Permission refusée ou navigateur non supporté. Vérifie tes paramètres.",
        });
        return;
      }
      setEnabled(true);
      setPermission("granted");
      await updateUserPreferences(user.uid, { notificationsEnabled: true });
      showToast({ message: "Notifications activées sur ce device" });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Activation impossible.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleEnabled(next: boolean) {
    if (!user) return;
    setEnabled(next);
    try {
      await updateUserPreferences(user.uid, { notificationsEnabled: next });
    } catch {
      setEnabled(!next); // rollback
    }
  }

  async function handleQuietChange(field: "start" | "end", value: number) {
    if (!user) return;
    if (field === "start") setQuietStart(value);
    else setQuietEnd(value);
    try {
      await updateUserPreferences(user.uid, {
        ...(field === "start"
          ? { quietHoursStart: value }
          : { quietHoursEnd: value }),
      });
    } catch {
      // rollback non triviale ici, on garde la valeur locale
    }
  }

  async function handleSendTest() {
    setBusy(true);
    try {
      const callable = httpsCallable<unknown, { sentCount: number }>(
        functions,
        "sendNotificationTest",
      );
      const result = await callable({});
      showToast({
        message: `Notif test envoyée à ${result.data.sentCount} device(s)`,
      });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Envoi impossible.",
      });
    } finally {
      setBusy(false);
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
              Notifications
            </h1>
          </div>
        </header>

        {supportState === "unsupported" ? (
          <div className="rounded-[14px] border border-border bg-surface px-4 py-4">
            <p className="text-[14px] text-muted-foreground">
              Ton navigateur ne supporte pas les notifications web push.
              Essaie Chrome, Edge ou Firefox sur Android/Desktop.
            </p>
          </div>
        ) : loading ? (
          <p className="text-[13px] text-muted-foreground">Chargement…</p>
        ) : permission !== "granted" ? (
          <section className="rounded-[14px] border border-border bg-surface px-4 py-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <BellRing
                size={20}
                className="text-primary shrink-0 mt-0.5"
              />
              <div className="flex-1 flex flex-col gap-0.5">
                <p className="text-[14px] font-semibold">
                  Activer les notifications
                </p>
                <p className="text-[12px] text-muted-foreground leading-snug">
                  Reçois un rappel deux heures avant la dueDate de tes tâches
                  assignées. Respecte tes heures de calme.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleEnable}
              disabled={busy}
              className="self-start rounded-[10px] bg-primary text-primary-foreground text-[13px] font-semibold px-4 py-2 shadow-[0_0_10px_rgba(255,107,36,0.35)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {busy ? "..." : "Autoriser les notifications"}
            </button>
          </section>
        ) : (
          <>
            <label className="flex items-center justify-between rounded-[14px] border border-border bg-surface px-4 py-3 cursor-pointer">
              <div className="flex flex-col">
                <span className="text-[14px] font-medium">
                  Rappels de tâches
                </span>
                <span className="text-[12px] text-muted-foreground">
                  2 h avant l&apos;échéance, hors quiet hours
                </span>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => handleToggleEnabled(e.target.checked)}
                className="w-5 h-5 accent-primary"
              />
            </label>

            <section className="rounded-[14px] border border-border bg-surface px-4 py-4 flex flex-col gap-3">
              <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
                Heures de calme
              </p>
              <p className="text-[12px] text-muted-foreground leading-snug">
                Aucune notif entre ces heures. Traverse minuit autorisé.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="quiet-start"
                    className="text-[11px] uppercase tracking-[0.1em] text-foreground-faint"
                  >
                    Début
                  </label>
                  <select
                    id="quiet-start"
                    value={quietStart}
                    onChange={(e) =>
                      handleQuietChange("start", Number(e.target.value))
                    }
                    className="rounded-[10px] border border-border bg-background px-3 py-2 text-[14px]"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="quiet-end"
                    className="text-[11px] uppercase tracking-[0.1em] text-foreground-faint"
                  >
                    Fin
                  </label>
                  <select
                    id="quiet-end"
                    value={quietEnd}
                    onChange={(e) =>
                      handleQuietChange("end", Number(e.target.value))
                    }
                    className="rounded-[10px] border border-border bg-background px-3 py-2 text-[14px]"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <button
              type="button"
              onClick={handleSendTest}
              disabled={busy}
              className="rounded-[12px] border border-border bg-transparent text-foreground font-sans font-semibold text-[14px] px-[18px] py-3 hover:bg-surface-elevated transition-colors disabled:opacity-50"
            >
              {busy ? "Envoi..." : "Envoyer une notif test"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
