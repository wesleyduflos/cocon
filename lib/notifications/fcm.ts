import { deleteDoc, doc, setDoc } from "firebase/firestore";
import {
  type Messaging,
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";

import { app, db } from "@/lib/firebase/client";

/**
 * État du SDK Messaging :
 * - "unsupported" : navigateur ne supporte pas FCM Web Push (ex. Safari iOS partiel)
 * - "supported" : le SDK peut être initialisé
 */
export type MessagingSupportState = "unknown" | "supported" | "unsupported";

let messagingInstance: Messaging | null = null;
let supportState: MessagingSupportState = "unknown";

async function ensureMessaging(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported();
  if (!supported) {
    supportState = "unsupported";
    return null;
  }
  supportState = "supported";
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export async function checkMessagingSupport(): Promise<MessagingSupportState> {
  if (supportState !== "unknown") return supportState;
  await ensureMessaging();
  return supportState;
}

/**
 * Demande la permission de notification au navigateur. Retourne la permission
 * accordée ('granted', 'denied', 'default').
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.requestPermission();
}

/**
 * Active FCM pour l'utilisateur courant :
 * - demande la permission si pas déjà accordée
 * - récupère le token FCM
 * - sauve le token dans `users/{uid}/fcmTokens/{tokenId}` (id = token court)
 *
 * Retourne le token enregistré, ou null si refusé/non supporté.
 */
export async function enableNotifications(uid: string): Promise<string | null> {
  const messaging = await ensureMessaging();
  if (!messaging) return null;

  const permission = await requestNotificationPermission();
  if (permission !== "granted") return null;

  const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    throw new Error(
      "Variable NEXT_PUBLIC_FCM_VAPID_PUBLIC_KEY manquante (cf. Firebase Console > Cloud Messaging > Web Push certificates).",
    );
  }

  // On enregistre explicitement notre service worker depuis le path rewrité
  // par next.config.ts. Firebase Messaging utilisera ce SW pour les push.
  const registration =
    await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) return null;

  // Id court (12 premiers chars du token) comme docId pour faciliter
  // le déduplicage sur le même device.
  const tokenId = token.slice(0, 12);
  await setDoc(doc(db, "users", uid, "fcmTokens", tokenId), {
    token,
    createdAt: new Date(),
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : "",
  });

  return token;
}

/**
 * Désactive FCM pour un device : retire le token Firebase ET supprime le
 * doc Firestore correspondant.
 */
export async function disableNotificationsForDevice(
  uid: string,
  token: string,
): Promise<void> {
  const messaging = await ensureMessaging();
  if (messaging) {
    try {
      await deleteToken(messaging);
    } catch {
      // ignore — le token peut déjà être expiré
    }
  }
  const tokenId = token.slice(0, 12);
  await deleteDoc(doc(db, "users", uid, "fcmTokens", tokenId));
}

/**
 * Subscribe aux messages push pendant que l'app est au premier plan.
 * Retourne la fonction unsubscribe.
 */
export async function subscribeToForegroundMessages(
  onMessageReceived: (payload: {
    title?: string;
    body?: string;
    link?: string;
  }) => void,
): Promise<() => void> {
  const messaging = await ensureMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    onMessageReceived({
      title: payload.notification?.title,
      body: payload.notification?.body,
      link: payload.fcmOptions?.link,
    });
  });
}
