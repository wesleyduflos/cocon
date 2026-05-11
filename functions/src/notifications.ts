import { getMessaging } from "firebase-admin/messaging";
import {
  FieldValue,
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

/* =========================================================================
   isWithinQuietHours — réimplémentation locale identique à
   lib/notifications/quiet-hours.ts. Pas d'import cross-package pour
   garder la Cloud Function autonome.
   ========================================================================= */

function isWithinQuietHours(
  hour: number,
  start: number,
  end: number,
): boolean {
  if (hour < 0 || hour > 23) return false;
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

/* =========================================================================
   sendTaskReminder — cron horaire.
   Pour chaque cocon, scanne les tâches `pending` dont la dueDate tombe
   dans les 2h à venir et envoie une push FCM à l'assignee (s'il y en a
   un). Skip silencieusement si :
     - pas d'assignee
     - assignee dans ses quiet hours
     - assignee sans fcmToken
     - notifications désactivées
     - reminderSentAt < 24h (anti-spam)
   ========================================================================= */

export const sendTaskReminder = onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "Europe/Paris",
    region: "europe-west1",
    timeoutSeconds: 540,
    memory: "256MiB",
  },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const messaging = getMessaging();

    // Cache des préférences user pour éviter les reads répétés
    const userCache = new Map<
      string,
      {
        preferences: {
          notificationsEnabled: boolean;
          quietHoursStart: number;
          quietHoursEnd: number;
        };
        fcmTokens: string[];
      } | null
    >();

    async function loadUser(uid: string) {
      if (userCache.has(uid)) return userCache.get(uid);
      const snap = await db.doc(`users/${uid}`).get();
      if (!snap.exists) {
        userCache.set(uid, null);
        return null;
      }
      const prefs = snap.get("preferences") as
        | {
            notificationsEnabled?: boolean;
            quietHoursStart?: number;
            quietHoursEnd?: number;
          }
        | undefined;
      const tokensSnap = await db
        .collection(`users/${uid}/fcmTokens`)
        .get();
      const tokens = tokensSnap.docs
        .map((d) => d.get("token") as string | undefined)
        .filter((t): t is string => Boolean(t));
      const entry = {
        preferences: {
          notificationsEnabled: prefs?.notificationsEnabled ?? true,
          quietHoursStart: prefs?.quietHoursStart ?? 22,
          quietHoursEnd: prefs?.quietHoursEnd ?? 7,
        },
        fcmTokens: tokens,
      };
      userCache.set(uid, entry);
      return entry;
    }

    // Scan global : toutes les sous-collections "tasks" via collectionGroup
    const tasksSnap = await db
      .collectionGroup("tasks")
      .where("status", "==", "pending")
      .where("dueDate", ">=", Timestamp.fromDate(now))
      .where("dueDate", "<=", Timestamp.fromDate(in2h))
      .get();

    let sent = 0;
    for (const taskDoc of tasksSnap.docs) {
      const data = taskDoc.data();
      const assigneeId = data.assigneeId as string | undefined;
      if (!assigneeId) continue;

      const reminderSentAt = data.reminderSentAt as
        | Timestamp
        | undefined;
      if (
        reminderSentAt &&
        reminderSentAt.toDate() > oneDayAgo
      ) {
        continue; // déjà notifié dans les 24h
      }

      const user = await loadUser(assigneeId);
      if (!user) continue;
      if (!user.preferences.notificationsEnabled) continue;
      if (user.fcmTokens.length === 0) continue;
      if (
        isWithinQuietHours(
          now.getHours(),
          user.preferences.quietHoursStart,
          user.preferences.quietHoursEnd,
        )
      ) {
        continue;
      }

      const title = "Rappel · Cocon";
      const body = (data.title as string) ?? "Tâche à faire bientôt";

      try {
        await messaging.sendEachForMulticast({
          tokens: user.fcmTokens,
          notification: { title, body },
          webpush: {
            notification: {
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
            },
            fcmOptions: {
              link: `/tasks/${taskDoc.id}`,
            },
          },
        });
        await taskDoc.ref.update({
          reminderSentAt: FieldValue.serverTimestamp(),
        });
        sent++;
      } catch {
        // Soft fail — on continue pour les autres tâches
      }
    }

    console.log(
      `[sendTaskReminder] scanned=${tasksSnap.size} sent=${sent}`,
    );
  },
);

/* =========================================================================
   sendNotificationTest — déclenchée depuis /settings/notifications par
   un bouton "Envoyer une notif test". Envoie une push à TOUS les fcmTokens
   du caller. Ignore les quiet hours (c'est un test à la demande).
   ========================================================================= */

export const sendNotificationTest = onCall(
  { region: "europe-west1", timeoutSeconds: 30 },
  async (request): Promise<{ sentCount: number }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise.");
    }
    const db = getFirestore();
    const messaging = getMessaging();
    const uid = request.auth.uid;
    const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
    const tokens = tokensSnap.docs
      .map((d) => d.get("token") as string | undefined)
      .filter((t): t is string => Boolean(t));
    if (tokens.length === 0) {
      throw new HttpsError(
        "failed-precondition",
        "Aucun device enregistré pour les notifications.",
      );
    }
    const resp = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: "Cocon · Notif test",
        body: "Si tu lis ça, les notifs marchent ✓",
      },
      webpush: {
        notification: { icon: "/icons/icon-192.png" },
        fcmOptions: { link: "/" },
      },
    });
    return { sentCount: resp.successCount };
  },
);
