import { Timestamp } from "firebase/firestore";
import { describe, expect, it, vi } from "vitest";

// Mock du module client Firebase pour éviter d'initialiser le SDK en test.
vi.mock("@/lib/firebase/client", () => ({
  functions: {},
}));
vi.mock("firebase/functions", () => ({
  httpsCallable: vi.fn(() => () => Promise.resolve({ data: {} })),
}));

import {
  applyParseHints,
  hintToAssigneeId,
  hintToDueDate,
  type ParseTaskOutput,
} from "./parse-task";

const ctx = {
  currentUserId: "uid-wesley",
  otherMemberId: "uid-camille",
};

describe("hintToAssigneeId", () => {
  it("maps 'me' to currentUserId", () => {
    expect(hintToAssigneeId("me", ctx)).toBe("uid-wesley");
  });

  it("maps 'partner' to otherMemberId", () => {
    expect(hintToAssigneeId("partner", ctx)).toBe("uid-camille");
  });

  it("returns undefined when partner is missing (solo cocon)", () => {
    expect(
      hintToAssigneeId("partner", { currentUserId: "uid-wesley" }),
    ).toBeUndefined();
  });

  it("returns undefined for 'unassigned'", () => {
    expect(hintToAssigneeId("unassigned", ctx)).toBeUndefined();
  });

  it("returns undefined for undefined hint", () => {
    expect(hintToAssigneeId(undefined, ctx)).toBeUndefined();
  });
});

describe("hintToDueDate", () => {
  const now = new Date("2026-05-11T10:00:00");

  it("returns undefined for 'none'", () => {
    expect(hintToDueDate("none", now)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(hintToDueDate(undefined, now)).toBeUndefined();
  });

  it("'today' returns 23:59:59 today", () => {
    const ts = hintToDueDate("today", now);
    expect(ts).toBeInstanceOf(Timestamp);
    const d = ts!.toDate();
    expect(d.getDate()).toBe(11);
    expect(d.getMonth()).toBe(4); // mai = 4
    expect(d.getHours()).toBe(23);
  });

  it("'tomorrow' returns 23:59:59 next day", () => {
    const ts = hintToDueDate("tomorrow", now);
    expect(ts!.toDate().getDate()).toBe(12);
  });

  it("'thisWeek' returns the next Sunday", () => {
    // 2026-05-11 est un lundi (jour 1) → +6 jours = dimanche 17
    const ts = hintToDueDate("thisWeek", now);
    expect(ts!.toDate().getDate()).toBe(17);
  });

  it("'thisWeek' on Sunday returns today", () => {
    const sunday = new Date("2026-05-10T10:00:00"); // dimanche
    const ts = hintToDueDate("thisWeek", sunday);
    expect(ts!.toDate().getDate()).toBe(10);
  });
});

describe("applyParseHints", () => {
  const now = new Date("2026-05-11T10:00:00");

  it("maps every hint to the matching task field", () => {
    const ai: ParseTaskOutput = {
      title: "Donner le traitement à Mochi",
      category: "Animaux",
      assigneeHint: "partner",
      dueDateHint: "tomorrow",
      effortHint: "quick",
      confidence: 0.92,
    };

    const fields = applyParseHints(ai, ctx, now);

    expect(fields.title).toBe("Donner le traitement à Mochi");
    expect(fields.category).toBe("Animaux");
    expect(fields.assigneeId).toBe("uid-camille");
    expect(fields.effort).toBe("quick");
    expect(fields.dueDate!.toDate().getDate()).toBe(12);
  });

  it("leaves fields undefined when hints are absent", () => {
    const ai: ParseTaskOutput = {
      title: "Penser à arroser les plantes",
      confidence: 0.7,
    };

    const fields = applyParseHints(ai, ctx, now);

    expect(fields.title).toBe("Penser à arroser les plantes");
    expect(fields.category).toBeUndefined();
    expect(fields.assigneeId).toBeUndefined();
    expect(fields.dueDate).toBeUndefined();
    expect(fields.effort).toBeUndefined();
  });
});
