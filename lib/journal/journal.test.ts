import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import type { JournalEntry, WithId } from "@/types/cocon";

import { buildJournalText, dayLabel, groupByDay } from "./journal";

function entry(
  partial: Partial<JournalEntry> & { id?: string },
): WithId<JournalEntry> {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    type: partial.type ?? "task_completed",
    actor: partial.actor ?? "u1",
    actorName: partial.actorName ?? "Wesley",
    payload: partial.payload ?? {},
    createdAt:
      partial.createdAt ?? Timestamp.fromDate(new Date("2026-05-12T10:00:00")),
  } as WithId<JournalEntry>;
}

describe("buildJournalText", () => {
  it("task_completed", () => {
    expect(
      buildJournalText({
        type: "task_completed",
        actorName: "Wesley",
        payload: { taskTitle: "Sortir les poubelles" },
      }),
    ).toBe("Wesley a terminé « Sortir les poubelles »");
  });

  it("preparation_launched avec total", () => {
    expect(
      buildJournalText({
        type: "preparation_launched",
        actorName: "Camille",
        payload: {
          templateName: "Avant les vacances",
          templateEmoji: "🌴",
          totalTasks: 8,
        },
      }),
    ).toBe("Camille a lancé la préparation 🌴 Avant les vacances (8 tâches)");
  });

  it("preparation_launched avec 1 seule tâche", () => {
    expect(
      buildJournalText({
        type: "preparation_launched",
        actorName: "Wesley",
        payload: {
          templateName: "Réception",
          templateEmoji: "🎉",
          totalTasks: 1,
        },
      }),
    ).toContain("(1 tâche)");
  });

  it("preparation_completed avec durée 2 jours", () => {
    expect(
      buildJournalText({
        type: "preparation_completed",
        actorName: "Wesley",
        payload: {
          templateName: "Avant les vacances",
          templateEmoji: "🌴",
          durationDays: 2,
        },
      }),
    ).toBe("Préparation 🌴 Avant les vacances terminée en 2 jours");
  });

  it("preparation_completed sans durée", () => {
    expect(
      buildJournalText({
        type: "preparation_completed",
        actorName: "Wesley",
        payload: { templateName: "X", templateEmoji: "✨" },
      }),
    ).toBe("Préparation ✨ X terminée");
  });

  it("member_joined", () => {
    expect(
      buildJournalText({
        type: "member_joined",
        actorName: "Camille",
        payload: {},
      }),
    ).toBe("Camille a rejoint le cocon");
  });

  it("stock_renewed", () => {
    expect(
      buildJournalText({
        type: "stock_renewed",
        actorName: "Wesley",
        payload: { stockName: "Dentifrice" },
      }),
    ).toBe("Wesley a renouvelé le stock de Dentifrice");
  });

  it("memory_entry_added avec article selon type", () => {
    expect(
      buildJournalText({
        type: "memory_entry_added",
        actorName: "Camille",
        payload: { memoryTitle: "Plombier", memoryType: "contact" },
      }),
    ).toBe("Camille a ajouté le contact « Plombier »");

    expect(
      buildJournalText({
        type: "memory_entry_added",
        actorName: "Wesley",
        payload: { memoryTitle: "Garantie machine", memoryType: "warranty" },
      }),
    ).toBe("Wesley a ajouté la garantie « Garantie machine »");
  });

  it("fallback actor quand actorName vide", () => {
    expect(
      buildJournalText({
        type: "task_completed",
        actorName: "",
        payload: { taskTitle: "X" },
      }),
    ).toMatch(/Quelqu'un/);
  });
});

describe("dayLabel", () => {
  const now = new Date("2026-05-12T10:00:00");

  it("Aujourd'hui pour le même jour", () => {
    expect(dayLabel(new Date("2026-05-12T08:00:00"), now)).toBe("Aujourd'hui");
  });

  it("Hier pour J-1", () => {
    expect(dayLabel(new Date("2026-05-11T08:00:00"), now)).toBe("Hier");
  });

  it("Jour de la semaine + jour + mois pour J-2 à J-6", () => {
    expect(dayLabel(new Date("2026-05-09T08:00:00"), now)).toContain("mai");
    expect(dayLabel(new Date("2026-05-09T08:00:00"), now)).toMatch(/Samedi/);
  });

  it("Jour + mois pour même année > 7 jours", () => {
    expect(dayLabel(new Date("2026-03-12T08:00:00"), now)).toBe("12 mars");
  });

  it("Jour + mois + année si année différente", () => {
    expect(dayLabel(new Date("2024-03-12T08:00:00"), now)).toBe(
      "12 mars 2024",
    );
  });
});

describe("groupByDay", () => {
  const now = new Date("2026-05-12T10:00:00");

  it("groupe les entries du même jour ensemble", () => {
    const entries = [
      entry({
        createdAt: Timestamp.fromDate(new Date("2026-05-12T08:00:00")),
        id: "a",
      }),
      entry({
        createdAt: Timestamp.fromDate(new Date("2026-05-12T15:00:00")),
        id: "b",
      }),
    ];
    const groups = groupByDay(entries, now);
    expect(groups.length).toBe(1);
    expect(groups[0].label).toBe("Aujourd'hui");
    expect(groups[0].entries.length).toBe(2);
  });

  it("ordonne les groupes plus récent en premier", () => {
    const entries = [
      entry({
        createdAt: Timestamp.fromDate(new Date("2026-05-10T08:00:00")),
        id: "a",
      }),
      entry({
        createdAt: Timestamp.fromDate(new Date("2026-05-12T08:00:00")),
        id: "b",
      }),
      entry({
        createdAt: Timestamp.fromDate(new Date("2026-05-11T08:00:00")),
        id: "c",
      }),
    ];
    const groups = groupByDay(entries, now);
    expect(groups.map((g) => g.label)).toEqual([
      "Aujourd'hui",
      "Hier",
      expect.stringContaining("mai"),
    ]);
  });

  it("retourne tableau vide pour 0 entries", () => {
    expect(groupByDay([], now)).toEqual([]);
  });
});
