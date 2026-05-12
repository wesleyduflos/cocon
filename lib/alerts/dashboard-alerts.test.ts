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

  it("stock empty en haut (poids le plus fort)", () => {
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
    expect(result.map((a) => a.kind)).toEqual(["stock-empty", "stock-low"]);
    expect(result[0].title).toContain("Lessive");
  });

  it("préparations non terminées listées avec progression", () => {
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
        run({
          id: "r2",
          templateName: "Finie",
          completedAt: Timestamp.fromDate(new Date("2026-05-11")),
        }),
      ],
      memoryEntries: [],
      tasks: [],
      now,
    });
    expect(result.length).toBe(1);
    expect(result[0].title).toContain("Vacances");
    expect(result[0].title).toContain("8/12");
  });

  it("garantie qui expire bientôt apparaît", () => {
    // 12 jours pleins après now (10h local 12 mai → 10h local 24 mai)
    const exp = new Date(2026, 4, 24, 10, 0, 0);
    const result = computeDashboardAlerts({
      stocks: [],
      runs: [],
      memoryEntries: [
        memory({
          id: "m1",
          type: "warranty",
          title: "Frigo Samsung",
          structuredData: { expiresAt: exp.toISOString() },
        }),
      ],
      tasks: [],
      now,
    });
    expect(result.length).toBe(1);
    expect(result[0].title).toContain("Frigo Samsung");
    expect(result[0].title).toMatch(/12j/);
  });

  it("garantie expirée ignorée", () => {
    const result = computeDashboardAlerts({
      stocks: [],
      runs: [],
      memoryEntries: [
        memory({
          id: "m1",
          type: "warranty",
          structuredData: { expiresAt: "2026-04-01" }, // déjà passée
        }),
      ],
      tasks: [],
      now,
    });
    expect(result).toEqual([]);
  });

  it("garantie > 30j ignorée", () => {
    const result = computeDashboardAlerts({
      stocks: [],
      runs: [],
      memoryEntries: [
        memory({
          id: "m1",
          type: "warranty",
          structuredData: { expiresAt: "2026-07-01" }, // > 30j
        }),
      ],
      tasks: [],
      now,
    });
    expect(result).toEqual([]);
  });

  it("garantie ≤ 7j poids plus fort que > 7j", () => {
    const result = computeDashboardAlerts({
      stocks: [],
      runs: [],
      memoryEntries: [
        memory({
          id: "soon",
          type: "warranty",
          title: "Bientôt",
          structuredData: { expiresAt: "2026-05-15" }, // 3j
        }),
        memory({
          id: "late",
          type: "warranty",
          title: "Plus tard",
          structuredData: { expiresAt: "2026-06-08" }, // 27j
        }),
      ],
      tasks: [],
      now,
    });
    expect(result[0].title).toContain("Bientôt");
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

  it("cap à 5 alertes par défaut", () => {
    const stocks = Array.from({ length: 10 }, (_, i) =>
      stock({ id: `s${i}`, name: `Stock${i}`, level: "empty" }),
    );
    const result = computeDashboardAlerts({
      stocks,
      runs: [],
      memoryEntries: [],
      tasks: [],
      now,
    });
    expect(result.length).toBe(5);
  });

  it("limit custom respecté", () => {
    const stocks = Array.from({ length: 10 }, (_, i) =>
      stock({ id: `s${i}`, name: `Stock${i}`, level: "empty" }),
    );
    const result = computeDashboardAlerts({
      stocks,
      runs: [],
      memoryEntries: [],
      tasks: [],
      now,
      limit: 3,
    });
    expect(result.length).toBe(3);
  });

  it("tri global multi-source par poids", () => {
    const result = computeDashboardAlerts({
      stocks: [stock({ id: "s1", name: "Café", level: "low" })],
      runs: [run({ id: "r1", templateName: "Prep" })],
      memoryEntries: [
        memory({
          id: "m1",
          title: "Garantie",
          structuredData: { expiresAt: "2026-05-15" }, // dans 3j → poids 80
        }),
      ],
      tasks: [
        task({
          id: "t1",
          title: "Récur demain",
          recurrenceRule: "FREQ=DAILY",
          dueDate: Timestamp.fromDate(new Date("2026-05-13T20:00:00")),
        }),
      ],
      now,
    });
    // Ordre attendu : warranty ≤7j (80) > stock-low (70) > prep (60) > recurring (30)
    expect(result.map((a) => a.kind)).toEqual([
      "warranty-expiring",
      "stock-low",
      "prep-in-progress",
      "tomorrow-recurring",
    ]);
  });
});
