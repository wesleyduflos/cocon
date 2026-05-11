/**
 * Tokenise une chaîne pour la recherche dans la Mémoire :
 * - lowercase
 * - retire les accents (NFD + suppression des marques diacritiques)
 * - sépare sur tout ce qui n'est pas alphanumerique
 * - filtre les tokens vides ou de longueur < 2
 * - déduplique
 *
 * Le tableau retourné est utilisé pour `searchTokens` (stocké à l'écriture
 * d'un MemoryEntry) et pour le matching à la query (`array-contains-any`).
 */
export function tokenize(input: string): string[] {
  if (!input) return [];
  const normalized = input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const raw = normalized.split(/[^a-z0-9]+/u);
  const filtered = raw.filter((t) => t.length >= 2);
  return Array.from(new Set(filtered));
}

/**
 * Filtre une liste d'entries côté client à partir d'une query libre.
 * Première passe Firestore : `array-contains-any` sur les 10 premiers
 * tokens de la query (limite Firestore). Cette fonction prend ensuite les
 * entries renvoyées et filtre par sous-match strict pour la précision.
 */
export function matchQuery<T extends { searchTokens: string[] }>(
  entries: T[],
  query: string,
): T[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return entries;
  return entries.filter((e) => {
    const set = new Set(e.searchTokens);
    return tokens.every((t) =>
      // un token de query match si un token enregistré commence par lui
      Array.from(set).some((stored) => stored.startsWith(t)),
    );
  });
}
