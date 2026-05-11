import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { google } from "googleapis";

const googleClientId = defineSecret("GOOGLE_CLIENT_ID");
const googleClientSecret = defineSecret("GOOGLE_CLIENT_SECRET");

const COMMON_OPTS = {
  secrets: [googleClientId, googleClientSecret],
  region: "europe-west1" as const,
  timeoutSeconds: 60,
  memory: "256MiB" as const,
};

function makeOauthClient(redirectUri: string) {
  return new google.auth.OAuth2(
    googleClientId.value(),
    googleClientSecret.value(),
    redirectUri,
  );
}

/* =========================================================================
   exchangeGoogleCode — appelée par le client après le redirect OAuth.
   Reçoit le `code` retourné par Google, l'échange contre des tokens,
   récupère l'email du compte Google, et stocke le tout dans
   `users/{uid}/integrations/google`.
   ========================================================================= */

interface ExchangeInput {
  code?: string;
  redirectUri?: string;
}

export const exchangeGoogleCode = onCall(
  COMMON_OPTS,
  async (request): Promise<{ googleEmail: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise.");
    }
    const data = request.data as ExchangeInput;
    if (!data?.code || !data?.redirectUri) {
      throw new HttpsError(
        "invalid-argument",
        "Code OAuth et redirectUri requis.",
      );
    }

    const oauth = makeOauthClient(data.redirectUri);
    const { tokens } = await oauth.getToken(data.code);
    if (!tokens.refresh_token) {
      throw new HttpsError(
        "failed-precondition",
        "Google n'a pas renvoyé de refresh token. Révoque l'accès depuis ton compte Google puis recommence.",
      );
    }
    oauth.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth });
    const userInfo = await oauth2.userinfo.get();
    const googleEmail = userInfo.data.email ?? "";

    const db = getFirestore();
    await db
      .doc(`users/${request.auth.uid}/integrations/google`)
      .set({
        refreshToken: tokens.refresh_token,
        googleEmail,
        connectedAt: FieldValue.serverTimestamp(),
        scope: tokens.scope ?? "",
      });

    return { googleEmail };
  },
);

/* =========================================================================
   syncGoogleCalendar — récupère les événements Google des 60 prochains
   jours et les écrit dans `households/{hid}/calendar-events` avec
   source='google' et `externalEventId` pour idempotence.
   ========================================================================= */

interface SyncInput {
  householdId?: string;
}

export const syncGoogleCalendar = onCall(
  COMMON_OPTS,
  async (request): Promise<{ syncedCount: number }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise.");
    }
    const { householdId } = (request.data ?? {}) as SyncInput;
    if (!householdId) {
      throw new HttpsError("invalid-argument", "householdId requis.");
    }

    const db = getFirestore();

    // Vérifier que l'user est membre du household
    const householdSnap = await db.doc(`households/${householdId}`).get();
    const memberIds = householdSnap.get("memberIds") as string[] | undefined;
    if (!memberIds?.includes(request.auth.uid)) {
      throw new HttpsError(
        "permission-denied",
        "Tu n'es pas membre de ce cocon.",
      );
    }

    // Charger le refresh token
    const integSnap = await db
      .doc(`users/${request.auth.uid}/integrations/google`)
      .get();
    if (!integSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "Google Calendar n'est pas connecté.",
      );
    }
    const refreshToken = integSnap.get("refreshToken") as string | undefined;
    if (!refreshToken) {
      throw new HttpsError(
        "failed-precondition",
        "Refresh token manquant. Reconnecte Google Calendar.",
      );
    }

    const oauth = makeOauthClient("postmessage");
    oauth.setCredentials({ refresh_token: refreshToken });

    const calendar = google.calendar({ version: "v3", auth: oauth });

    const now = new Date();
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const resp = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: in60Days.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const items = resp.data.items ?? [];

    // Pour idempotence : on indexe les events existants par externalEventId
    const existingSnap = await db
      .collection(`households/${householdId}/calendar-events`)
      .where("source", "==", "google")
      .where("createdBy", "==", request.auth.uid)
      .get();
    const existingByExternalId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const d of existingSnap.docs) {
      const ext = d.get("externalEventId") as string | undefined;
      if (ext) existingByExternalId.set(ext, d);
    }

    const batch = db.batch();
    let syncedCount = 0;

    for (const item of items) {
      const externalEventId = item.id;
      if (!externalEventId) continue;
      if (!item.start) continue;

      const isAllDay = Boolean(item.start.date && !item.start.dateTime);
      const startIso = item.start.dateTime ?? item.start.date;
      const endIso = item.end?.dateTime ?? item.end?.date;
      if (!startIso) continue;

      const eventData = {
        title: item.summary ?? "(Sans titre)",
        description: item.description ?? undefined,
        location: item.location ?? undefined,
        startTime: new Date(startIso),
        endTime: endIso ? new Date(endIso) : undefined,
        allDay: isAllDay,
        source: "google" as const,
        externalEventId,
        createdBy: request.auth.uid,
        // createdAt : on garde celui existant si déjà sync, sinon now
      };

      const existing = existingByExternalId.get(externalEventId);
      if (existing) {
        batch.update(existing.ref, eventData);
        existingByExternalId.delete(externalEventId);
      } else {
        const newRef = db
          .collection(`households/${householdId}/calendar-events`)
          .doc();
        batch.set(newRef, {
          ...eventData,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      syncedCount++;
    }

    // Les events restants dans existingByExternalId ont été supprimés
    // côté Google → on les supprime aussi côté Cocon.
    for (const d of existingByExternalId.values()) {
      batch.delete(d.ref);
    }

    await batch.commit();

    await db
      .doc(`users/${request.auth.uid}/integrations/google`)
      .update({
        lastSyncAt: FieldValue.serverTimestamp(),
        syncedEventsCount: syncedCount,
      });

    return { syncedCount };
  },
);

/* =========================================================================
   disconnectGoogle — supprime l'intégration Google + ses événements
   importés dans le cocon (pour ne pas laisser de squelettes).
   ========================================================================= */

interface DisconnectInput {
  householdId?: string;
}

export const disconnectGoogle = onCall(
  COMMON_OPTS,
  async (request): Promise<{ deletedEvents: number }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise.");
    }
    const { householdId } = (request.data ?? {}) as DisconnectInput;
    if (!householdId) {
      throw new HttpsError("invalid-argument", "householdId requis.");
    }

    const db = getFirestore();

    // Supprimer les events Google importés par cet user
    const existingSnap = await db
      .collection(`households/${householdId}/calendar-events`)
      .where("source", "==", "google")
      .where("createdBy", "==", request.auth.uid)
      .get();

    const batch = db.batch();
    for (const d of existingSnap.docs) {
      batch.delete(d.ref);
    }
    // Supprimer l'intégration
    batch.delete(
      db.doc(`users/${request.auth.uid}/integrations/google`),
    );
    await batch.commit();

    return { deletedEvents: existingSnap.size };
  },
);
