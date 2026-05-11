/**
 * Détermine si une heure donnée (0-23) tombe dans la fenêtre de calme.
 *
 * La fenêtre peut traverser minuit : start=22, end=7 → 22h, 23h, 0h, ..., 6h.
 * Quand start === end, la fenêtre est considérée comme vide (jamais en calme).
 */
export function isWithinQuietHours(
  hour: number,
  start: number,
  end: number,
): boolean {
  if (hour < 0 || hour > 23) return false;
  if (start === end) return false;
  if (start < end) {
    // Fenêtre simple, ex. 13h-17h
    return hour >= start && hour < end;
  }
  // Fenêtre qui traverse minuit, ex. 22h-7h
  return hour >= start || hour < end;
}

/**
 * Test convenance : `isWithinQuietHours` à partir d'un objet Date.
 */
export function isDateWithinQuietHours(
  date: Date,
  start: number,
  end: number,
): boolean {
  return isWithinQuietHours(date.getHours(), start, end);
}
