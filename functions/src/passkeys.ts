import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

const COMMON_OPTS = {
  region: "europe-west1" as const,
  timeoutSeconds: 30,
  memory: "256MiB" as const,
};

// Origines autorisées — RP ID dérivé du hostname.
const ALLOWED_ORIGINS = [
  "https://cocon-app.netlify.app",
  "http://localhost:3000",
];

function resolveRp(origin: string): { rpId: string; origin: string } {
  if (!ALLOWED_ORIGINS.includes(origin)) {
    throw new HttpsError(
      "invalid-argument",
      `Origin "${origin}" non autorisé pour les passkeys.`,
    );
  }
  return { rpId: new URL(origin).hostname, origin };
}

const RP_NAME = "Cocon";
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 min

interface ChallengeDoc {
  challenge: string;
  userId: string | null; // null pour login, défini pour register
  kind: "register" | "authenticate";
  origin: string;
  rpId: string;
  expiresAt: Timestamp;
}

async function storeChallenge(
  challengeId: string,
  data: Omit<ChallengeDoc, "expiresAt">,
): Promise<void> {
  const db = getFirestore();
  await db.doc(`passkey-challenges/${challengeId}`).set({
    ...data,
    expiresAt: Timestamp.fromMillis(Date.now() + CHALLENGE_TTL_MS),
  });
}

async function consumeChallenge(challengeId: string): Promise<ChallengeDoc> {
  const db = getFirestore();
  const ref = db.doc(`passkey-challenges/${challengeId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "Challenge introuvable ou expiré.");
  }
  const data = snap.data() as ChallengeDoc;
  if (data.expiresAt.toMillis() < Date.now()) {
    await ref.delete();
    throw new HttpsError("failed-precondition", "Challenge expiré.");
  }
  await ref.delete();
  return data;
}

function shortDeviceName(userAgent: string | undefined): string {
  if (!userAgent) return "Device inconnu";
  if (/iPhone/.test(userAgent)) return "iPhone";
  if (/iPad/.test(userAgent)) return "iPad";
  if (/Android/.test(userAgent)) return "Android";
  if (/Macintosh/.test(userAgent)) return "Mac";
  if (/Windows/.test(userAgent)) return "Windows";
  if (/Linux/.test(userAgent)) return "Linux";
  return "Device";
}

/* =========================================================================
   lookupEmail — public, prend un email et indique si un user existe avec
   au moins une passkey enregistrée. Limite : exposition légère de
   l'existence d'un email (anti-énumération via rate limit Firebase auto).
   ========================================================================= */

interface LookupOutput {
  exists: boolean;
  hasPasskey: boolean;
}

export const lookupEmail = onCall(
  COMMON_OPTS,
  async (request): Promise<LookupOutput> => {
    const email = (request.data as { email?: string })?.email
      ?.toLowerCase()
      .trim();
    if (!email) {
      throw new HttpsError("invalid-argument", "Email requis.");
    }
    const db = getFirestore();
    const snap = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();
    if (snap.empty) return { exists: false, hasPasskey: false };
    const uid = snap.docs[0].id;
    const passkeysSnap = await db
      .collection(`users/${uid}/passkeys`)
      .limit(1)
      .get();
    return { exists: true, hasPasskey: !passkeysSnap.empty };
  },
);

/* =========================================================================
   generatePasskeyRegistrationOptions — auth required
   Génère les options à passer à navigator.credentials.create() côté client.
   ========================================================================= */

export const generatePasskeyRegistrationOptions = onCall(
  COMMON_OPTS,
  async (request): Promise<{
    options: PublicKeyCredentialCreationOptionsJSON;
    challengeId: string;
  }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise.");
    }
    const { origin } = (request.data ?? {}) as { origin?: string };
    if (!origin) {
      throw new HttpsError("invalid-argument", "Origin requis.");
    }
    const { rpId, origin: validOrigin } = resolveRp(origin);

    const db = getFirestore();
    const userSnap = await db.doc(`users/${request.auth.uid}`).get();
    const userEmail = (userSnap.get("email") as string) ?? "";
    const userDisplayName =
      (userSnap.get("displayName") as string) ?? userEmail.split("@")[0];

    // Exclure les credentials déjà enregistrés (anti double registration)
    const existingSnap = await db
      .collection(`users/${request.auth.uid}/passkeys`)
      .get();
    const excludeCredentials = existingSnap.docs.map((d) => ({
      id: d.id,
      transports: (d.get("transports") as AuthenticatorTransportFuture[]) ?? [],
    }));

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rpId,
      userID: new TextEncoder().encode(request.auth.uid),
      userName: userEmail,
      userDisplayName,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      excludeCredentials,
    });

    const challengeId = options.challenge; // unique par registration
    await storeChallenge(challengeId, {
      challenge: options.challenge,
      userId: request.auth.uid,
      kind: "register",
      origin: validOrigin,
      rpId,
    });

    return { options, challengeId };
  },
);

/* =========================================================================
   verifyPasskeyRegistration — auth required
   Vérifie la réponse de l'autorité et enregistre le credential.
   ========================================================================= */

interface VerifyRegInput {
  response?: RegistrationResponseJSON;
  challengeId?: string;
  userAgent?: string;
}

export const verifyPasskeyRegistration = onCall(
  COMMON_OPTS,
  async (request): Promise<{ verified: boolean; deviceName: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise.");
    }
    const { response, challengeId, userAgent } = (request.data ??
      {}) as VerifyRegInput;
    if (!response || !challengeId) {
      throw new HttpsError("invalid-argument", "response + challengeId requis.");
    }

    const stored = await consumeChallenge(challengeId);
    if (stored.userId !== request.auth.uid || stored.kind !== "register") {
      throw new HttpsError("permission-denied", "Challenge invalide.");
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: stored.origin,
      expectedRPID: stored.rpId,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new HttpsError("invalid-argument", "Registration non vérifiée.");
    }

    const { credential } = verification.registrationInfo;
    const deviceName = shortDeviceName(userAgent);

    const db = getFirestore();
    await db
      .doc(`users/${request.auth.uid}/passkeys/${credential.id}`)
      .set({
        publicKey: Buffer.from(credential.publicKey).toString("base64"),
        counter: credential.counter,
        transports: response.response.transports ?? [],
        deviceName,
        createdAt: FieldValue.serverTimestamp(),
        lastUsedAt: FieldValue.serverTimestamp(),
      });

    return { verified: true, deviceName };
  },
);

/* =========================================================================
   generatePasskeyAuthenticationOptions — public (login flow)
   Reçoit un email, génère les options à passer à navigator.credentials.get().
   ========================================================================= */

interface AuthOptionsInput {
  email?: string;
  origin?: string;
}

export const generatePasskeyAuthenticationOptions = onCall(
  COMMON_OPTS,
  async (request): Promise<{
    options: PublicKeyCredentialRequestOptionsJSON;
    challengeId: string;
  }> => {
    const { email, origin } = (request.data ?? {}) as AuthOptionsInput;
    if (!email || !origin) {
      throw new HttpsError("invalid-argument", "email + origin requis.");
    }
    const { rpId, origin: validOrigin } = resolveRp(origin);

    const db = getFirestore();
    const userSnap = await db
      .collection("users")
      .where("email", "==", email.toLowerCase().trim())
      .limit(1)
      .get();

    if (userSnap.empty) {
      throw new HttpsError("not-found", "Aucun compte avec cet email.");
    }
    const uid = userSnap.docs[0].id;

    const passkeysSnap = await db.collection(`users/${uid}/passkeys`).get();
    if (passkeysSnap.empty) {
      throw new HttpsError(
        "failed-precondition",
        "Aucune passkey enregistrée pour ce compte.",
      );
    }

    const allowCredentials = passkeysSnap.docs.map((d) => ({
      id: d.id,
      transports: (d.get("transports") as AuthenticatorTransportFuture[]) ?? [],
    }));

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials,
      userVerification: "preferred",
    });

    const challengeId = options.challenge;
    await storeChallenge(challengeId, {
      challenge: options.challenge,
      userId: uid,
      kind: "authenticate",
      origin: validOrigin,
      rpId,
    });

    return { options, challengeId };
  },
);

/* =========================================================================
   verifyPasskeyAuthentication — public
   Vérifie l'assertion et retourne un Custom Token Firebase Auth pour
   signInWithCustomToken().
   ========================================================================= */

interface VerifyAuthInput {
  response?: AuthenticationResponseJSON;
  challengeId?: string;
}

export const verifyPasskeyAuthentication = onCall(
  COMMON_OPTS,
  async (request): Promise<{ customToken: string }> => {
    const { response, challengeId } = (request.data ?? {}) as VerifyAuthInput;
    if (!response || !challengeId) {
      throw new HttpsError("invalid-argument", "response + challengeId requis.");
    }

    const stored = await consumeChallenge(challengeId);
    if (!stored.userId || stored.kind !== "authenticate") {
      throw new HttpsError("permission-denied", "Challenge invalide.");
    }

    const db = getFirestore();
    const credentialId = response.id;
    const passkeyRef = db.doc(
      `users/${stored.userId}/passkeys/${credentialId}`,
    );
    const passkeySnap = await passkeyRef.get();
    if (!passkeySnap.exists) {
      throw new HttpsError("not-found", "Passkey inconnue pour cet utilisateur.");
    }
    const publicKey = Buffer.from(
      passkeySnap.get("publicKey") as string,
      "base64",
    );
    const counter = (passkeySnap.get("counter") as number) ?? 0;
    const transports =
      (passkeySnap.get("transports") as AuthenticatorTransportFuture[]) ?? [];

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: stored.origin,
      expectedRPID: stored.rpId,
      credential: {
        id: credentialId,
        publicKey,
        counter,
        transports,
      },
    });

    if (!verification.verified) {
      throw new HttpsError("permission-denied", "Authentification refusée.");
    }

    // Update counter + lastUsedAt
    await passkeyRef.update({
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: FieldValue.serverTimestamp(),
    });

    const customToken = await getAuth().createCustomToken(stored.userId);
    return { customToken };
  },
);

/* =========================================================================
   listPasskeys + deletePasskey — gestion depuis /settings/profile
   ========================================================================= */

export const listPasskeys = onCall(
  COMMON_OPTS,
  async (
    request,
  ): Promise<{
    passkeys: Array<{
      credentialId: string;
      deviceName: string;
      createdAt: number;
      lastUsedAt: number;
    }>;
  }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise.");
    }
    const db = getFirestore();
    const snap = await db
      .collection(`users/${request.auth.uid}/passkeys`)
      .orderBy("createdAt", "desc")
      .get();
    const passkeys = snap.docs.map((d) => ({
      credentialId: d.id,
      deviceName: (d.get("deviceName") as string) ?? "Device",
      createdAt: (d.get("createdAt") as Timestamp)?.toMillis() ?? 0,
      lastUsedAt: (d.get("lastUsedAt") as Timestamp)?.toMillis() ?? 0,
    }));
    return { passkeys };
  },
);

export const deletePasskey = onCall(
  COMMON_OPTS,
  async (request): Promise<{ deleted: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise.");
    }
    const { credentialId } = (request.data ?? {}) as {
      credentialId?: string;
    };
    if (!credentialId) {
      throw new HttpsError("invalid-argument", "credentialId requis.");
    }
    const db = getFirestore();
    await db
      .doc(`users/${request.auth.uid}/passkeys/${credentialId}`)
      .delete();
    return { deleted: true };
  },
);
