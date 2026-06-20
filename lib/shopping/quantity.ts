/**
 * Normalise une saisie utilisateur de quantité (chaîne libre) en un entier
 * positif valide. Utilisé à la soumission des formulaires d'ajout / édition
 * d'article. Pendant la saisie le state reste en string pour permettre la
 * valeur vide et la suppression du "1" par défaut.
 */
export function normalizeQuantityInput(raw: string): number {
  const parsed = parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 1;
}

/**
 * Filtre les caractères non numériques d'une chaîne saisie au clavier.
 * Autorise la chaîne vide pour ne pas piéger l'utilisateur entre deux frappes.
 */
export function sanitizeQuantityKeystroke(value: string): string {
  return value.replace(/[^0-9]/g, "");
}
