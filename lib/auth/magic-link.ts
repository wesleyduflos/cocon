import {
  type ActionCodeSettings,
  type User as FirebaseUser,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from "firebase/auth";

import { auth } from "@/lib/firebase/client";

const EMAIL_STORAGE_KEY = "cocon:emailForSignIn";

function getActionCodeSettings(): ActionCodeSettings {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    url: `${appUrl}/login/complete`,
    handleCodeInApp: true,
  };
}

/* =========================================================================
   Helpers de stockage localStorage (testables sans Firebase)
   ========================================================================= */

export function storeEmailForMagicLink(email: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EMAIL_STORAGE_KEY, email);
}

export function retrieveEmailForMagicLink(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(EMAIL_STORAGE_KEY);
}

export function clearEmailForMagicLink(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(EMAIL_STORAGE_KEY);
}

/* =========================================================================
   Wrappers Firebase Auth
   ========================================================================= */

/**
 * Envoie un magic link à l'email donné. Stocke l'email en localStorage pour
 * que la finalisation côté navigateur puisse l'utiliser sans le redemander.
 *
 * Firebase ne révèle pas si l'email existe ou non (anti-énumération) — un
 * lien est envoyé dans tous les cas, et la décision « nouveau / existant »
 * se fait après authentification.
 */
export async function sendMagicLink(email: string): Promise<void> {
  await sendSignInLinkToEmail(auth, email, getActionCodeSettings());
  storeEmailForMagicLink(email);
}

/** Vérifie qu'une URL est un magic link valide envoyé par Firebase Auth. */
export function isMagicLink(url: string): boolean {
  return isSignInWithEmailLink(auth, url);
}

/**
 * Complète l'authentification à partir d'un magic link.
 * L'email est lu depuis localStorage (stocké au moment de `sendMagicLink`).
 * Si l'utilisateur a cliqué sur le lien depuis un autre device, l'email
 * sera absent du localStorage et il faudra le redemander.
 */
export async function completeMagicLink(url: string): Promise<FirebaseUser> {
  const email = retrieveEmailForMagicLink();
  if (!email) {
    throw new Error(
      "Aucun email mémorisé pour ce lien. Tu as cliqué sur le lien depuis un autre appareil ? Resaisis ton email pour relancer.",
    );
  }
  const credential = await signInWithEmailLink(auth, email, url);
  clearEmailForMagicLink();
  return credential.user;
}
