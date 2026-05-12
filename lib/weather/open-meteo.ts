/* =========================================================================
   Open-Meteo client minimal — sprint 5 bloc F.9

   API gratuite, sans clé, https://open-meteo.com/en/docs.

   Cache localStorage avec TTL 1h pour éviter de spam. Clé basée sur
   les lat/lng arrondis 2 décimales (= précision ~1km, suffisant pour
   la météo d'un foyer).
   ========================================================================= */

export interface WeatherSnapshot {
  /** Temperature actuelle en °C. */
  temperature: number;
  /** Code météo Open-Meteo (cf WMO codes 0-99). */
  weatherCode: number;
  /** Emoji représentatif. */
  emoji: string;
  /** Libellé FR (Nuageux, Ensoleillé...). */
  condition: string;
  /** Vent km/h. */
  windKmh: number;
  /** Précipitations mm. */
  precipitationMm: number;
  /** Timestamp de la récupération côté client (ms). */
  fetchedAt: number;
}

const CACHE_PREFIX = "cocon:weather:";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    precipitation?: number;
  };
}

function cacheKey(lat: number, lng: number): string {
  return `${CACHE_PREFIX}${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

/** Récupère une entrée valide du cache localStorage, ou null. */
export function readWeatherCache(
  lat: number,
  lng: number,
  now: number = Date.now(),
): WeatherSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(lat, lng));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherSnapshot;
    if (now - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeWeatherCache(
  lat: number,
  lng: number,
  snapshot: WeatherSnapshot,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cacheKey(lat, lng), JSON.stringify(snapshot));
  } catch {
    // QuotaExceeded etc — silencieux
  }
}

export async function fetchWeather(
  lat: number,
  lng: number,
): Promise<WeatherSnapshot> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,precipitation&timezone=auto`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Open-Meteo HTTP ${resp.status}`);
  }
  const data = (await resp.json()) as OpenMeteoResponse;
  const code = data.current?.weather_code ?? 0;
  return {
    temperature: data.current?.temperature_2m ?? 0,
    weatherCode: code,
    emoji: weatherEmoji(code),
    condition: weatherCondition(code),
    windKmh: data.current?.wind_speed_10m ?? 0,
    precipitationMm: data.current?.precipitation ?? 0,
    fetchedAt: Date.now(),
  };
}

/**
 * Wrapper cache-first : retourne le cache s'il est valide, sinon fetch.
 */
export async function getWeather(
  lat: number,
  lng: number,
): Promise<WeatherSnapshot> {
  const cached = readWeatherCache(lat, lng);
  if (cached) return cached;
  const fresh = await fetchWeather(lat, lng);
  writeWeatherCache(lat, lng, fresh);
  return fresh;
}

/* =========================================================================
   WMO codes → emoji + libellé
   Référence : https://open-meteo.com/en/docs (Weather variable reference)
   ========================================================================= */

export function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code === 1 || code === 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95 && code <= 99) return "⛈️";
  return "🌡️";
}

export function weatherCondition(code: number): string {
  if (code === 0) return "Ensoleillé";
  if (code === 1) return "Peu nuageux";
  if (code === 2) return "Partiellement nuageux";
  if (code === 3) return "Nuageux";
  if (code === 45 || code === 48) return "Brouillard";
  if (code >= 51 && code <= 57) return "Bruine";
  if (code >= 61 && code <= 67) return "Pluie";
  if (code >= 71 && code <= 77) return "Neige";
  if (code >= 80 && code <= 82) return "Averses";
  if (code >= 85 && code <= 86) return "Averses de neige";
  if (code >= 95 && code <= 99) return "Orage";
  return "Inconnu";
}

/** Par défaut Paris si pas de géoloc. */
export const DEFAULT_LOCATION = {
  lat: 48.8566,
  lng: 2.3522,
  name: "Paris",
};
