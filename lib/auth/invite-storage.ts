/**
 * Stockage temporaire d'un token d'invitation pendant le flow d'auth.
 *
 * Quand un utilisateur clique un lien `/join/{token}` sans être connecté,
 * on stocke le token en localStorage avant de le rediriger vers `/login`.
 * Après authentification, `/login/complete` lit ce token et route vers
 * `/join/{token}` plutôt que vers `/onboarding`.
 */

const PENDING_INVITE_TOKEN_KEY = "cocon:pendingInviteToken";

export function storePendingInviteToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_INVITE_TOKEN_KEY, token);
}

export function retrievePendingInviteToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PENDING_INVITE_TOKEN_KEY);
}

export function clearPendingInviteToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
}
