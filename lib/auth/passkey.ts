import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  type Auth,
  signInWithCustomToken,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";

import { auth, functions } from "@/lib/firebase/client";

/* =========================================================================
   Détection du support WebAuthn
   ========================================================================= */

export function isWebAuthnSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.PublicKeyCredential);
}

export async function isUserVerifyingPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/* =========================================================================
   Lookup d'un email pour décider du flow login
   ========================================================================= */

export interface EmailLookupResult {
  exists: boolean;
  hasPasskey: boolean;
}

export async function lookupEmailForLogin(
  email: string,
): Promise<EmailLookupResult> {
  const callable = httpsCallable<{ email: string }, EmailLookupResult>(
    functions,
    "lookupEmail",
  );
  const result = await callable({ email });
  return result.data;
}

/* =========================================================================
   Registration — l'utilisateur DOIT être authentifié (magic link first)
   ========================================================================= */

export async function registerPasskey(): Promise<{ deviceName: string }> {
  if (!isWebAuthnSupported()) {
    throw new Error("WebAuthn n'est pas supporté par ce navigateur.");
  }

  const generateOptions = httpsCallable<
    { origin: string },
    {
      options: Parameters<typeof startRegistration>[0]["optionsJSON"];
      challengeId: string;
    }
  >(functions, "generatePasskeyRegistrationOptions");

  const { data } = await generateOptions({
    origin: window.location.origin,
  });

  // Le navigateur lance la prompt biométrique
  const attResp = await startRegistration({ optionsJSON: data.options });

  const verify = httpsCallable<
    {
      response: typeof attResp;
      challengeId: string;
      userAgent: string;
    },
    { verified: boolean; deviceName: string }
  >(functions, "verifyPasskeyRegistration");

  const result = await verify({
    response: attResp,
    challengeId: data.challengeId,
    userAgent: navigator.userAgent,
  });

  if (!result.data.verified) {
    throw new Error("Vérification de la passkey échouée.");
  }
  return { deviceName: result.data.deviceName };
}

/* =========================================================================
   Authentication — login via passkey, retourne un Custom Token Firebase
   et signe l'utilisateur dans Firebase Auth.
   ========================================================================= */

export async function authenticateWithPasskey(
  email: string,
): Promise<Auth["currentUser"]> {
  if (!isWebAuthnSupported()) {
    throw new Error("WebAuthn n'est pas supporté par ce navigateur.");
  }

  const generateOptions = httpsCallable<
    { email: string; origin: string },
    {
      options: Parameters<typeof startAuthentication>[0]["optionsJSON"];
      challengeId: string;
    }
  >(functions, "generatePasskeyAuthenticationOptions");

  const { data } = await generateOptions({
    email,
    origin: window.location.origin,
  });

  const authResp = await startAuthentication({ optionsJSON: data.options });

  const verify = httpsCallable<
    { response: typeof authResp; challengeId: string },
    { customToken: string }
  >(functions, "verifyPasskeyAuthentication");

  const result = await verify({
    response: authResp,
    challengeId: data.challengeId,
  });

  const credential = await signInWithCustomToken(auth, result.data.customToken);
  return credential.user;
}

/* =========================================================================
   Listing + suppression depuis /settings/profile
   ========================================================================= */

export interface PasskeyEntry {
  credentialId: string;
  deviceName: string;
  createdAt: number;
  lastUsedAt: number;
}

export async function listPasskeys(): Promise<PasskeyEntry[]> {
  const callable = httpsCallable<unknown, { passkeys: PasskeyEntry[] }>(
    functions,
    "listPasskeys",
  );
  const result = await callable({});
  return result.data.passkeys;
}

export async function deletePasskey(credentialId: string): Promise<void> {
  const callable = httpsCallable<
    { credentialId: string },
    { deleted: boolean }
  >(functions, "deletePasskey");
  await callable({ credentialId });
}
