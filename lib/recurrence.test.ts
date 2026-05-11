import { describe, expect, it } from "vitest";

import {
  buildRRule,
  describeRRule,
  extractRRuleComponents,
  getNextOccurrence,
} from "./recurrence";

describe("buildRRule", () => {
  it("daily preset", () => {
    expect(buildRRule({ preset: "daily" })).toBe("FREQ=DAILY");
  });

  it("weekly with single day", () => {
    expect(buildRRule({ preset: "weekly", byDay: ["TU"] })).toBe(
      "FREQ=WEEKLY;BYDAY=TU",
    );
  });

  it("weekly with multiple days", () => {
    expect(buildRRule({ preset: "weekly", byDay: ["MO", "WE", "FR"] })).toBe(
      "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    );
  });

  it("weekly without byDay returns null", () => {
    expect(buildRRule({ preset: "weekly" })).toBeNull();
  });

  it("monthly with day", () => {
    expect(buildRRule({ preset: "monthly", byMonthDay: 15 })).toBe(
      "FREQ=MONTHLY;BYMONTHDAY=15",
    );
  });

  it("monthly without day returns null", () => {
    expect(buildRRule({ preset: "monthly" })).toBeNull();
  });

  it("monthly with out-of-range day returns null", () => {
    expect(buildRRule({ preset: "monthly", byMonthDay: 0 })).toBeNull();
    expect(buildRRule({ preset: "monthly", byMonthDay: 32 })).toBeNull();
  });

  it("custom returns null (caller provides manual rule)", () => {
    expect(buildRRule({ preset: "custom" })).toBeNull();
  });
});

describe("describeRRule", () => {
  it("describes daily", () => {
    expect(describeRRule("FREQ=DAILY")).toBe("Tous les jours");
  });

  it("describes weekly with single day in French", () => {
    expect(describeRRule("FREQ=WEEKLY;BYDAY=TU")).toBe("Tous les mardis");
  });

  it("describes weekly with multiple days", () => {
    expect(describeRRule("FREQ=WEEKLY;BYDAY=MO,WE,FR")).toBe(
      "Les lundi, mercredi, vendredi",
    );
  });

  it("describes monthly with day", () => {
    expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=15")).toBe("Le 15 du mois");
  });

  it("describes weekly without byDay (generic)", () => {
    expect(describeRRule("FREQ=WEEKLY")).toBe("Toutes les semaines");
  });
});

describe("getNextOccurrence", () => {
  // rrule travaille en UTC interne — on utilise des dates UTC explicites
  // pour des tests déterministes indépendamment du fuseau du runner.
  // Anchor = lundi 11 mai 2026 à 12h UTC
  const monday = new Date(Date.UTC(2026, 4, 11, 12));

  it("daily : next is tomorrow", () => {
    const next = getNextOccurrence("FREQ=DAILY", monday, monday);
    expect(next).not.toBeNull();
    expect(next!.getUTCDate()).toBe(12);
  });

  it("weekly on Tuesday from Monday = next day", () => {
    const next = getNextOccurrence("FREQ=WEEKLY;BYDAY=TU", monday, monday);
    expect(next).not.toBeNull();
    // 11 mai 2026 = lundi, 12 mai = mardi
    expect(next!.getUTCDate()).toBe(12);
  });

  it("weekly on Tuesday from Tuesday = next Tuesday", () => {
    const tuesday = new Date(Date.UTC(2026, 4, 12, 12));
    const next = getNextOccurrence("FREQ=WEEKLY;BYDAY=TU", tuesday, tuesday);
    expect(next).not.toBeNull();
    expect(next!.getUTCDate()).toBe(19); // mardi suivant
  });

  it("monthly day 15 from May 11 = May 15", () => {
    const next = getNextOccurrence(
      "FREQ=MONTHLY;BYMONTHDAY=15",
      monday,
      monday,
    );
    expect(next).not.toBeNull();
    expect(next!.getUTCDate()).toBe(15);
    expect(next!.getUTCMonth()).toBe(4);
  });

  it("monthly day 15 from May 16 = June 15", () => {
    const may16 = new Date(Date.UTC(2026, 4, 16, 12));
    const next = getNextOccurrence(
      "FREQ=MONTHLY;BYMONTHDAY=15",
      monday,
      may16,
    );
    expect(next).not.toBeNull();
    expect(next!.getUTCMonth()).toBe(5); // juin
    expect(next!.getUTCDate()).toBe(15);
  });

  it("returns null for invalid rule", () => {
    expect(getNextOccurrence("NOT_VALID", monday, monday)).toBeNull();
  });
});

describe("extractRRuleComponents", () => {
  it("extracts daily", () => {
    expect(extractRRuleComponents("FREQ=DAILY")).toEqual({ preset: "daily" });
  });

  it("extracts weekly with byDay", () => {
    expect(extractRRuleComponents("FREQ=WEEKLY;BYDAY=MO,WE")).toEqual({
      preset: "weekly",
      byDay: ["MO", "WE"],
    });
  });

  it("extracts monthly with byMonthDay", () => {
    expect(extractRRuleComponents("FREQ=MONTHLY;BYMONTHDAY=22")).toEqual({
      preset: "monthly",
      byMonthDay: 22,
    });
  });

  it("falls back to custom for unknown freq", () => {
    expect(extractRRuleComponents("FREQ=YEARLY")).toEqual({ preset: "custom" });
  });
});
