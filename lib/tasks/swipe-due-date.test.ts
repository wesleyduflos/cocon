import { describe, expect, it } from "vitest";

import {
  dueDateToday,
  dueDateTomorrow,
  endOfDayInParis,
} from "./swipe-due-date";

describe("endOfDayInParis", () => {
  it("retourne 23:59:59 du même jour pour offset 0", () => {
    const ref = new Date("2026-06-20T10:00:00+02:00");
    const result = endOfDayInParis(ref, 0);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
  });

  it("avance d'un jour pour offset 1", () => {
    const ref = new Date("2026-06-20T10:00:00+02:00");
    const today = endOfDayInParis(ref, 0);
    const tomorrow = endOfDayInParis(ref, 1);
    expect(tomorrow.getTime() - today.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("gère un passage de mois (30 juin → 1er juillet)", () => {
    const ref = new Date("2026-06-30T10:00:00+02:00");
    const tomorrow = endOfDayInParis(ref, 1);
    expect(tomorrow.getMonth()).toBe(6); // juillet (0-indexed)
    expect(tomorrow.getDate()).toBe(1);
  });

  it("gère un passage d'année (31 déc → 1er janv)", () => {
    const ref = new Date("2026-12-31T10:00:00+01:00");
    const tomorrow = endOfDayInParis(ref, 1);
    expect(tomorrow.getFullYear()).toBe(2027);
    expect(tomorrow.getMonth()).toBe(0);
    expect(tomorrow.getDate()).toBe(1);
  });
});

describe("dueDateToday / dueDateTomorrow", () => {
  it("today est antérieur à tomorrow", () => {
    const ref = new Date("2026-06-20T10:00:00+02:00");
    const t = dueDateToday(ref);
    const tm = dueDateTomorrow(ref);
    expect(t.toMillis()).toBeLessThan(tm.toMillis());
  });

  it("today renvoie un Timestamp valide", () => {
    const ts = dueDateToday(new Date("2026-06-20T10:00:00+02:00"));
    expect(ts.toMillis()).toBeGreaterThan(0);
  });
});
