import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import type {
  ChecklistRun,
  MemoryEntry,
  StockItem,
  Task,
  WithId,
} from "@/types/cocon";

import { computeDashboardAlerts } from "./dashboard-alerts";

const now = new Date("2026-05-12T10:00:00");

function stock(partial: Partial<StockItem> & { id: string }): WithId<StockItem> {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    emoji: partial.emoji,
    level: partial.level ?? "full",
    history: partial.history ?? [],
    createdAt: Timestamp.fromDate(new Date("2026-01-01")),
    createdBy: "u",
    ...partial,
  } as WithId<StockItem>;
}

function run(
  partial: Partial<ChecklistRun> & { id: string },
): WithId<ChecklistRun> {
  return {
    id: partial.id,
    templateId: "t",
    templateName: partial.templateName ?? "Préparation",
    templateEmoji: partial.templateEmoji ?? "🗂️",
    startedAt: Timestamp.fromDate(new Date("2026-05-10")),
    startedBy: "u",
    totalTasks: partial.totalTasks ?? 10,
    completedTasks: partial.completedTasks ?? 0,
    ...partial,
  } as WithId<ChecklistRun>;
}

function memory(
  partial: Partial<MemoryEntry> & { id: string },
): WithId<MemoryEntry> {
  return {
    id: partial.id,
    type: partial.type ?? "warranty",
    title: partial.title ?? partial.id,
    pinned: false,
    structuredData: partial.structuredData ?? {},
    tags: [],
    searchTokens: [],
    isSensitive: false,
    createdAt: Timestamp.fromDate(new Date("2026-01-01")),
    updatedAt: Timestamp.fromDate(new Date("2026-01-01")),
    createdBy: "u",
    ...partial,
  } as WithId<MemoryEntry>;
}

function task(
  partial: Partial<Task> & { id: string },
): WithId<Task> {
  return {
    id: partial.id,
    title: partial.title ?? partial.id,
    status: partial.status ?? "pending",
    createdAt: Timestamp.fromDate(new Date("2026-01-01")),
    updatedAt: Timestamp.fromDate(new Date("2026-01-01")),
    createdBy: "u",
    ...partial,
  } as WithId<Task>;
}

describe("computeDashboardAlerts", () => {
  it("liste vide si rien à alerter", () => {
    const result = computeDashboardAlerts({
      stocks: [],
      runs: [],
      memoryEntries: [],
      tasks: [],
      now,
    });
    expect(result).toEqual([]);
  });

  it("stocks ignorés (couverts par DashCard dédiée sprint 5 polish)", () => {
    const result = computeDashboardAlerts({
      stocks: [
        stock({ id: "a", name: "Café", level: "low" }),
        stock({ id: "b", name: "Lessive", level: "empty" }),
      ],
      runs: [],
      memoryEntries: [],
      tasks: [],
      now,
    });
    expect(result).toEqual([]);
  });

  it("préparations ignorées (couvertes par DashCard dédiée)", () => {
    const result = computeDashboardAlerts({
      stocks: [],
      runs: [
        run({
          id: "r1",
          templateName: "Vacances",
          templateEmoji: "🌴",
          completedTasks: 8,
          totalTasks: 12,
        }),
      ],
      memoryEntries: [],
      tasks: [],
      now,
    });
    expect(result).toEqual([]);
  });

  it("garanties (legacy 'warranty') ignorées — type retiré sprint 5 polish", () => {
    const result = computeDashboardAlerts({
      stocks: [],
      runs: [],
      memoryEntries: [
        memory({
          id: "m1",
          // Cast pour simuler une entry legacy en DB.
          type: "warranty" as unknown as "note",
          title: "Frigo Samsung",
          structuredData: { expiresAt: "2026-05-15" },
        }),
      ],
      tasks: [],
      now,
    });
    expect(result).toEqual([]);
  });

  it("tâche récurrente demain listée", () => {
    const result = computeDashboardAlerts({
      stocks: [],
      runs: [],
      memoryEntries: [],
      tasks: [
        task({
          id: "t1",
          title: "Sortir poubelles",
          recurrenceRule: "FREQ=WEEKLY;BYDAY=TU",
          dueDate: Timestamp.fromDate(new Date("2026-05-13T20:00:00")),
        }),
      ],
      now,
    });
    expect(result.length).toBe(1);
    expect(result[0].title).toContain("Demain");
    expect(result[0].title).toContain("Sortir");
  });

  it("tâche non récurrente demain ignorée (couverte par section Tâches)", () => {
    const result = computeDashboardAlerts({
      stocks: [],
      runs: [],
      memoryEntries: [],
      tasks: [
        task({
          id: "t1",
          title: "Tâche unique",
          dueDate: Timestamp.fromDate(new Date("2026-05-13T20:00:00")),
        }),
      ],
      now,
    });
    expect(result).toEqual([]);
  });

  it("cap à 5 alertes par défaut (sur les tâches récurrentes)", () => {
    // Génère 10 tâches récurrentes prévues demain
    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      20,
      0,
      0,
    );
    const manyTasks = Array.from({ length: 10 }, (_, i) =>
      task({
        id: `t${i}`,
        title: `Récur ${i}`,
        recurrenceRule: "FREQ=DAILY",
        dueDate: Timestamp.fromDate(startOfTomorrow),
      }),
    );
    const result = computeDashboardAlerts({
      stocks: [],
      runs: [],
      memoryEntries: [],
      tasks: manyTasks,
      now,
    });
    expect(result.length).toBe(5);
  });

  it("limit custom respecté", () => {
    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      20,
      0,
      0,
    );
    const manyTasks = Array.from({ length: 10 }, (_, i) =>
      task({
        id: `t${i}`,
        title: `Récur ${i}`,
        recurrenceRule: "FREQ=DAILY",
        dueDate: Timestamp.fromDate(startOfTomorrow),
      }),
    );
    const result = computeDashboardAlerts({
      stocks: [],
      runs: [],
      memoryEntries: [],
      tasks: manyTasks,
      now,
      limit: 3,
    });
    expect(result.length).toBe(3);
  });
});
