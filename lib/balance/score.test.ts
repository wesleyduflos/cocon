import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import type { Task, TaskEffort, WithId } from "@/types/cocon";

import {
  buildPersonalizedMessage,
  calculateBalance,
} from "./score";

const now = new Date("2026-05-12T10:00:00");

function tsFrom(date: string): Timestamp {
  return Timestamp.fromDate(new Date(date));
}

function task(
  partial: Partial<Task> & {
    completedAt?: Timestamp;
    completedBy?: string;
    effort?: TaskEffort;
    category?: string;
  },
): WithId<Task> {
  return {
    id: Math.random().toString(36).slice(2),
    title: "t",
    status: "done",
    createdBy: "u",
    createdAt: tsFrom("2026-05-01"),
    updatedAt: tsFrom("2026-05-01"),
    ...partial,
  } as WithId<Task>;
}

describe("calculateBalance", () => {
  const members = ["wesley", "camille"];

  it("ratio 0 si aucune tâche dans la fenêtre", () => {
    const result = calculateBalance([], members, "7d", now);
    expect(result.balanceRatio).toBe(0);
    expect(result.totalWeight).toBe(0);
    expect(result.message).toBe("Pas encore d'activité sur cette période.");
  });

  it("ratio 0 pour foyer parfaitement équilibré", () => {
    const tasks = [
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-10"),
        effort: "normal",
      }),
      task({
        completedBy: "camille",
        completedAt: tsFrom("2026-05-10"),
        effort: "normal",
      }),
    ];
    const result = calculateBalance(tasks, members, "7d", now);
    expect(result.balanceRatio).toBe(0);
    expect(result.perMember.wesley.weight).toBe(2);
    expect(result.perMember.camille.weight).toBe(2);
    expect(result.message).toBe("Vous formez une équipe au top !");
  });

  it("ratio < 0.15 = équipe au top", () => {
    // wesley 4 (2 normal), camille 4 (2 normal)
    const tasks = [
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-10"),
        effort: "normal",
      }),
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-11"),
        effort: "normal",
      }),
      task({
        completedBy: "camille",
        completedAt: tsFrom("2026-05-10"),
        effort: "normal",
      }),
      task({
        completedBy: "camille",
        completedAt: tsFrom("2026-05-11"),
        effort: "normal",
      }),
    ];
    const result = calculateBalance(tasks, members, "7d", now);
    expect(result.balanceRatio).toBe(0);
    expect(result.message).toContain("équipe");
  });

  it("ratio bon équilibre 0.15-0.30", () => {
    // wesley 4, camille 3 → (4-3)/4 = 0.25
    const tasks = [
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-10"),
        effort: "normal",
      }),
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-11"),
        effort: "normal",
      }),
      task({
        completedBy: "camille",
        completedAt: tsFrom("2026-05-10"),
        effort: "normal",
      }),
      task({
        completedBy: "camille",
        completedAt: tsFrom("2026-05-11"),
        effort: "quick",
      }),
    ];
    const result = calculateBalance(tasks, members, "7d", now);
    expect(result.balanceRatio).toBeCloseTo(0.25, 2);
    expect(result.message).toBe("Bon équilibre cette semaine.");
  });

  it("ratio légèrement déséquilibré 0.30-0.50", () => {
    // wesley 5, camille 3 → (5-3)/5 = 0.4
    const tasks = [
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-10"),
        effort: "long",
      }), // 4
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-11"),
        effort: "quick",
      }), // 1
      task({
        completedBy: "camille",
        completedAt: tsFrom("2026-05-10"),
        effort: "normal",
      }), // 2
      task({
        completedBy: "camille",
        completedAt: tsFrom("2026-05-11"),
        effort: "quick",
      }), // 1
    ];
    const result = calculateBalance(tasks, members, "7d", now);
    expect(result.balanceRatio).toBeCloseTo(0.4, 2);
    expect(result.message).toMatch(/peu plus/);
  });

  it("ratio très déséquilibré > 0.50", () => {
    // wesley 6, camille 1 → (6-1)/6 ≈ 0.83
    const tasks = [
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-10"),
        effort: "long",
      }),
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-11"),
        effort: "normal",
      }),
      task({
        completedBy: "camille",
        completedAt: tsFrom("2026-05-10"),
        effort: "quick",
      }),
    ];
    const result = calculateBalance(tasks, members, "7d", now);
    expect(result.balanceRatio).toBeGreaterThan(0.5);
    expect(result.message).toMatch(/porté la maison/);
  });

  it("ignore tâches hors fenêtre 7d", () => {
    const tasks = [
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-10"), // dans 7d
        effort: "normal",
      }),
      task({
        completedBy: "camille",
        completedAt: tsFrom("2026-05-01"), // hors 7d (11j avant)
        effort: "long",
      }),
    ];
    const result = calculateBalance(tasks, members, "7d", now);
    expect(result.perMember.wesley.weight).toBe(2);
    expect(result.perMember.camille.weight).toBe(0);
  });

  it("inclut tâches dans la fenêtre 30d", () => {
    const tasks = [
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-04-20"), // dans 30d
        effort: "normal",
      }),
    ];
    const result = calculateBalance(tasks, members, "30d", now);
    expect(result.perMember.wesley.weight).toBe(2);
  });

  it("ignore tâches d'ex-membres", () => {
    const tasks = [
      task({
        completedBy: "ex-member",
        completedAt: tsFrom("2026-05-10"),
        effort: "long",
      }),
    ];
    const result = calculateBalance(tasks, members, "7d", now);
    expect(result.totalWeight).toBe(0);
    expect(result.perMember).not.toHaveProperty("ex-member");
  });

  it("collecte les catégories couvertes par membre", () => {
    const tasks = [
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-10"),
        effort: "normal",
        category: "maison",
      }),
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-11"),
        effort: "quick",
        category: "voiture",
      }),
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-09"),
        effort: "normal",
        category: "maison", // dédupliqué
      }),
    ];
    const result = calculateBalance(tasks, members, "7d", now);
    expect(result.perMember.wesley.categories.sort()).toEqual([
      "maison",
      "voiture",
    ]);
  });

  it("un seul membre actif → ratio 0 (pas de comparaison possible)", () => {
    const tasks = [
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-10"),
        effort: "long",
      }),
    ];
    const result = calculateBalance(tasks, ["wesley"], "7d", now);
    expect(result.balanceRatio).toBe(0);
  });

  it("effort manquant traité comme normal", () => {
    const tasks = [
      task({
        completedBy: "wesley",
        completedAt: tsFrom("2026-05-10"),
        // pas d'effort
      }),
    ];
    const result = calculateBalance(tasks, ["wesley", "camille"], "7d", now);
    expect(result.perMember.wesley.weight).toBe(2);
  });
});

describe("buildPersonalizedMessage", () => {
  it("inclut le displayName du top contributor si déséquilibre", () => {
    const perMember = {
      wesley: { count: 3, weight: 6, categories: [] },
      camille: { count: 1, weight: 1, categories: [] },
    };
    const msg = buildPersonalizedMessage(0.83, perMember, 7, {
      wesley: "Wesley",
      camille: "Camille",
    });
    expect(msg).toContain("Wesley");
    expect(msg).toMatch(/porté la maison/);
  });

  it("retombe sur 'Un membre' si nom inconnu", () => {
    const perMember = {
      wesley: { count: 3, weight: 6, categories: [] },
      camille: { count: 1, weight: 1, categories: [] },
    };
    const msg = buildPersonalizedMessage(0.83, perMember, 7, {});
    expect(msg).toContain("Un membre");
  });

  it("message bienveillant sans nom si équilibré", () => {
    const perMember = {
      wesley: { count: 2, weight: 4, categories: [] },
      camille: { count: 2, weight: 4, categories: [] },
    };
    const msg = buildPersonalizedMessage(0, perMember, 8, {
      wesley: "Wesley",
      camille: "Camille",
    });
    expect(msg).not.toContain("Wesley");
    expect(msg).toContain("équipe");
  });
});
