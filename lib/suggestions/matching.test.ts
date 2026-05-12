import { describe, expect, it } from "vitest";

import {
  eventMatchesTrigger,
  findMatchingTrigger,
  normalizeForMatch,
  suggestionAlreadyExists,
} from "./matching";

const now = new Date("2026-05-12T10:00:00");

describe("normalizeForMatch", () => {
  it("lowercase + retire accents", () => {
    expect(normalizeForMatch("Vacances à Noël")).toBe("vacances a noel");
  });
});

describe("eventMatchesTrigger", () => {
  const trigger = { keyword: "vacances", daysBefore: 5 };

  it("match exact dans le titre", () => {
    const event = {
      title: "Vacances en Bretagne",
      startTime: new Date("2026-05-15T08:00:00"),
    };
    expect(eventMatchesTrigger(event, trigger, now)).toBe(true);
  });

  it("match insensible aux accents", () => {
    const event = {
      title: "Vâcánces (typo) en Bretagne",
      startTime: new Date("2026-05-15T08:00:00"),
    };
    // 'vacances' apparaît dans 'vacances' normalisé
    expect(
      eventMatchesTrigger(
        { ...event, title: "Vacances en Bretagne" },
        trigger,
        now,
      ),
    ).toBe(true);
  });

  it("ne match pas si le keyword absent", () => {
    const event = {
      title: "Réunion projet",
      startTime: new Date("2026-05-15"),
    };
    expect(eventMatchesTrigger(event, trigger, now)).toBe(false);
  });

  it("ne match pas si l'événement est trop loin", () => {
    const event = {
      title: "Vacances en Bretagne",
      startTime: new Date("2026-05-20T08:00:00"), // 8j → > 5j
    };
    expect(eventMatchesTrigger(event, trigger, now)).toBe(false);
  });

  it("ne match pas si l'événement est passé", () => {
    const event = {
      title: "Vacances en Bretagne",
      startTime: new Date("2026-05-10T08:00:00"), // -2j
    };
    expect(eventMatchesTrigger(event, trigger, now)).toBe(false);
  });

  it("match en limite (event dans 5j exactement)", () => {
    const event = {
      title: "Vacances en Bretagne",
      startTime: new Date("2026-05-17T08:00:00"),
    };
    expect(eventMatchesTrigger(event, trigger, now)).toBe(true);
  });

  it("match avec description si pas dans le titre", () => {
    const event = {
      title: "Départ",
      description: "Vacances Italie début juin",
      startTime: new Date("2026-05-15"),
    };
    expect(eventMatchesTrigger(event, trigger, now)).toBe(true);
  });
});

describe("findMatchingTrigger", () => {
  const triggers = [
    { keyword: "vacances", daysBefore: 5 },
    { keyword: "voyage", daysBefore: 7 },
  ];

  it("retourne le premier trigger qui match", () => {
    const event = {
      title: "Voyage en train",
      startTime: new Date("2026-05-17T08:00:00"),
    };
    expect(findMatchingTrigger(event, triggers, now)?.keyword).toBe("voyage");
  });

  it("retourne null si aucun trigger match", () => {
    expect(
      findMatchingTrigger(
        { title: "Réunion", startTime: new Date("2026-05-13") },
        triggers,
        now,
      ),
    ).toBeNull();
  });

  it("retourne null si templates sans triggers", () => {
    expect(
      findMatchingTrigger(
        { title: "Vacances", startTime: new Date("2026-05-13") },
        undefined,
        now,
      ),
    ).toBeNull();
  });
});

describe("suggestionAlreadyExists", () => {
  it("true si la même paire event/template existe en pending", () => {
    const existing = [
      { triggerEventId: "E1", templateId: "T1", status: "pending" },
    ];
    expect(suggestionAlreadyExists(existing, "E1", "T1")).toBe(true);
  });

  it("false si la suggestion existante est dismissed", () => {
    const existing = [
      { triggerEventId: "E1", templateId: "T1", status: "dismissed" },
    ];
    expect(suggestionAlreadyExists(existing, "E1", "T1")).toBe(false);
  });

  it("false si même event mais autre template", () => {
    const existing = [
      { triggerEventId: "E1", templateId: "T2", status: "pending" },
    ];
    expect(suggestionAlreadyExists(existing, "E1", "T1")).toBe(false);
  });
});
