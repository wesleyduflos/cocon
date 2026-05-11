import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import { capHistory, predictNextRenewal, shouldAutoReorder } from "./stocks";

function tsFromDate(d: Date): Timestamp {
  return Timestamp.fromDate(d);
}

describe("predictNextRenewal", () => {
  it("returns null with no renewals", () => {
    expect(predictNextRenewal([])).toBeNull();
  });

  it("returns null with a single renewal (not enough signal)", () => {
    const history = [
      {
        level: "full" as const,
        changedAt: tsFromDate(new Date("2026-05-01")),
      },
    ];
    expect(predictNextRenewal(history)).toBeNull();
  });

  it("predicts using the average interval over 2 renewals", () => {
    // Renouvelé 2026-05-01 puis 2026-04-01 (history plus récente en premier)
    // → intervalle 30j → prochain prévu 2026-05-31
    const history = [
      { level: "full" as const, changedAt: tsFromDate(new Date("2026-05-01")) },
      { level: "full" as const, changedAt: tsFromDate(new Date("2026-04-01")) },
    ];
    const next = predictNextRenewal(history);
    expect(next).not.toBeNull();
    expect(next!.toISOString().slice(0, 10)).toBe("2026-05-31");
  });

  it("uses rolling 3 most recent intervals", () => {
    // 4 renouvellements, intervals : 30, 30, 90 → avg sur 3 derniers = 50
    // Mais on prend les 3 plus récents : 30, 30, 90 → moyenne = 50j
    const history = [
      { level: "full" as const, changedAt: tsFromDate(new Date("2026-05-01")) },
      { level: "full" as const, changedAt: tsFromDate(new Date("2026-04-01")) },
      { level: "full" as const, changedAt: tsFromDate(new Date("2026-03-02")) },
      { level: "full" as const, changedAt: tsFromDate(new Date("2025-12-02")) },
    ];
    const next = predictNextRenewal(history);
    expect(next).not.toBeNull();
    // 2026-05-01 + 50 jours ≈ 2026-06-20
    expect(next!.toISOString().slice(0, 10)).toBe("2026-06-20");
  });

  it("ignores non-full entries", () => {
    const history = [
      { level: "low" as const, changedAt: tsFromDate(new Date("2026-05-15")) },
      { level: "full" as const, changedAt: tsFromDate(new Date("2026-05-01")) },
      {
        level: "empty" as const,
        changedAt: tsFromDate(new Date("2026-04-15")),
      },
      { level: "full" as const, changedAt: tsFromDate(new Date("2026-04-01")) },
    ];
    const next = predictNextRenewal(history);
    expect(next).not.toBeNull();
    expect(next!.toISOString().slice(0, 10)).toBe("2026-05-31");
  });

  it("returns null when interval is aberrant (<1 day or >1 year)", () => {
    // Same-day double renewal — interval ~0 → ignoré
    const history = [
      {
        level: "full" as const,
        changedAt: tsFromDate(new Date("2026-05-01T10:00:00")),
      },
      {
        level: "full" as const,
        changedAt: tsFromDate(new Date("2026-05-01T09:00:00")),
      },
    ];
    expect(predictNextRenewal(history)).toBeNull();
  });
});

describe("capHistory", () => {
  it("returns the same array when under cap", () => {
    expect(capHistory([1, 2, 3], 50)).toEqual([1, 2, 3]);
  });

  it("trims to the cap keeping the most recent (start)", () => {
    const arr = Array.from({ length: 60 }, (_, i) => i);
    const capped = capHistory(arr, 50);
    expect(capped.length).toBe(50);
    expect(capped[0]).toBe(0);
    expect(capped[49]).toBe(49);
  });
});

describe("shouldAutoReorder", () => {
  it("triggers when level goes from full to low", () => {
    expect(shouldAutoReorder("full", "low")).toBe(true);
  });

  it("triggers when level goes from half to empty", () => {
    expect(shouldAutoReorder("half", "empty")).toBe(true);
  });

  it("does not retrigger when going from low to empty (already auto-ordered)", () => {
    expect(shouldAutoReorder("low", "empty")).toBe(false);
  });

  it("does not trigger when going from low back to full", () => {
    expect(shouldAutoReorder("low", "full")).toBe(false);
  });

  it("does not trigger from undefined initial state to half", () => {
    expect(shouldAutoReorder(undefined, "half")).toBe(false);
  });
});
