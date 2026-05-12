import {
  type User as FirebaseUser,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { auth } from "@/lib/firebase/client";

/* =========================================================================
   Authentification par email + mot de passe.

   Firebase Auth stocke chaque compte avec une liste de providers ; un même
   user peut avoir simultanément `password`, `email-link`, et `passkey`.
   Conséquence pour la migration depuis le flow magic link (sprint 1-4) :

   - Les comptes existants n'ont que `email-link` comme provider.
   - `sendPasswordResetEmail` fonctionne aussi sur ces comptes : Firebase
     envoie un mail avec un lien de reset, et au moment où l'user pose son
     mot de passe, le provider `password` est ajouté automatiquement.
   - Pas de code de migration spécifique côté Cocon : « Mot de passe oublié »
     est la voie d'entrée pour Wesley et Camille la première fois.
   ========================================================================= */

/**
 * Crée un nouveau compte avec email + password.
 * Firebase retourne directement un user authentifié.
 *
 * Erreurs Firebase typiques :
 * - `auth/email-already-in-use` : un compte existe déjà → rediriger vers /login
 * - `auth/invalid-email` : format invalide
 * - `auth/weak-password` : < 6 caractères (limite hardcodée Firebase)
 */
export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/**
 * Connecte un user existant avec email + password.
 *
 * Firebase masque les détails entre "user inconnu" et "mauvais mot de passe"
 * (anti-énumération) — l'erreur générique `auth/invalid-credential` couvre
 * les deux cas.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/**
 * Envoie un email de reset de mot de passe.
 *
 * Marche pour tous les comptes Firebase Auth, même ceux qui n'ont jamais
 * eu de provider `password` (les comptes magic-link existants). Quand
 * l'user pose son nouveau mot de passe via le lien, Firebase ajoute
 * `password` aux providers.
 *
 * Anti-énumération : Firebase ne révèle pas si l'email existe — un
 * "succès" silencieux est renvoyé même si l'email n'a pas de compte.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  // Pas d'ActionCodeSettings : on laisse Firebase héberger la page de
  // reset (UI standard mais propre, multi-langue). Si on veut héberger
  // nous-mêmes plus tard, ajouter `{ url: ".../reset-confirm" }`.
  await sendPasswordResetEmail(auth, email);
}

/**
 * Map des codes d'erreur Firebase Auth vers des messages FR conviviaux.
 * Utilisé côté UI pour ne pas exposer les codes bruts.
 */
export function humanReadableAuthError(code: string | undefined): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "Un compte existe déjà avec cet email. Connecte-toi ou utilise « Mot de passe oublié ».";
    case "auth/invalid-email":
      return "Format d'email invalide.";
    case "auth/weak-password":
      return "Mot de passe trop court (minimum 6 caractères).";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email ou mot de passe incorrect. Si tu te connectes pour la première fois après la mise à jour, utilise « Mot de passe oublié ».";
    case "auth/too-many-requests":
      return "Trop de tentatives. Attends quelques minutes avant de réessayer.";
    case "auth/network-request-failed":
      return "Problème réseau. Vérifie ta connexion (ou désactive le bloqueur de tracker du navigateur).";
    default:
      return "Connexion impossible. Réessaie dans quelques instants.";
  }
}
