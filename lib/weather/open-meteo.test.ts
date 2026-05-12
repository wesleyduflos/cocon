import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  readWeatherCache,
  weatherCondition,
  weatherEmoji,
  writeWeatherCache,
  type WeatherSnapshot,
} from "./open-meteo";

const STORAGE: Record<string, string> = {};

beforeEach(() => {
  for (const k of Object.keys(STORAGE)) delete STORAGE[k];
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => STORAGE[k] ?? null,
      setItem: (k: string, v: string) => {
        STORAGE[k] = v;
      },
      removeItem: (k: string) => {
        delete STORAGE[k];
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function snap(at: number): WeatherSnapshot {
  return {
    temperature: 18,
    weatherCode: 2,
    emoji: "🌤️",
    condition: "Partiellement nuageux",
    windKmh: 10,
    precipitationMm: 0,
    fetchedAt: at,
  };
}

describe("weatherEmoji", () => {
  it("ensoleillé pour code 0", () => {
    expect(weatherEmoji(0)).toBe("☀️");
  });
  it("nuageux pour code 3", () => {
    expect(weatherEmoji(3)).toBe("☁️");
  });
  it("pluie pour codes 61-67", () => {
    expect(weatherEmoji(63)).toBe("🌧️");
  });
  it("orage pour codes 95+", () => {
    expect(weatherEmoji(95)).toBe("⛈️");
  });
});

describe("weatherCondition", () => {
  it("FR pour code 0", () => {
    expect(weatherCondition(0)).toBe("Ensoleillé");
  });
  it("FR pour code 80 (averses)", () => {
    expect(weatherCondition(80)).toBe("Averses");
  });
});

describe("cache weather", () => {
  const lat = 48.86;
  const lng = 2.35;

  it("write puis read renvoie le snapshot", () => {
    const now = 1_000_000;
    writeWeatherCache(lat, lng, snap(now));
    const cached = readWeatherCache(lat, lng, now + 1000);
    expect(cached?.temperature).toBe(18);
  });

  it("cache invalide après 1h", () => {
    const start = 1_000_000;
    writeWeatherCache(lat, lng, snap(start));
    // 1h + 1ms après → invalide
    expect(readWeatherCache(lat, lng, start + 60 * 60 * 1000 + 1)).toBeNull();
  });

  it("cache valide à 59min", () => {
    const start = 1_000_000;
    writeWeatherCache(lat, lng, snap(start));
    expect(
      readWeatherCache(lat, lng, start + 59 * 60 * 1000),
    ).not.toBeNull();
  });

  it("clé arrondie à 2 décimales (même position ~1km)", () => {
    writeWeatherCache(48.861, 2.352, snap(1_000_000));
    // 48.861.toFixed(2) === "48.86", 2.352.toFixed(2) === "2.35"
    // 48.864.toFixed(2) === "48.86", 2.354.toFixed(2) === "2.35"
    expect(readWeatherCache(48.864, 2.354, 1_001_000)).not.toBeNull();
  });
});
