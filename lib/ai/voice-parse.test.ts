import { describe, expect, it, vi } from "vitest";

// Mock du client Firebase pour ne pas initialiser le SDK en test
vi.mock("@/lib/firebase/client", () => ({
  functions: {},
}));
vi.mock("firebase/functions", () => ({
  httpsCallable: vi.fn(() => () => Promise.resolve({ data: {} })),
}));

import {
  groupIntentsByType,
  intentLabel,
  type VoiceIntent,
} from "./voice-parse";

const fixture: VoiceIntent[] = [
  { type: "task", data: { title: "Appeler le médecin" }, confidence: 0.9 },
  { type: "shopping_item", data: { name: "Dentifrice" }, confidence: 0.95 },
  { type: "task", data: { title: "Sortir les poubelles" }, confidence: 0.8 },
  {
    type: "memory_entry",
    data: { title: "Code portail", type: "code" },
    confidence: 0.92,
  },
  { type: "unrecognized", data: {}, confidence: 0.2 },
];

describe("groupIntentsByType", () => {
  it("regroupe correctement par type", () => {
    const groups = groupIntentsByType(fixture);
    expect(groups.task).toHaveLength(2);
    expect(groups.shopping_item).toHaveLength(1);
    expect(groups.memory_entry).toHaveLength(1);
    expect(groups.unrecognized).toHaveLength(1);
  });

  it("retourne des arrays vides pour une liste vide", () => {
    const groups = groupIntentsByType([]);
    expect(groups.task).toEqual([]);
    expect(groups.shopping_item).toEqual([]);
    expect(groups.memory_entry).toEqual([]);
    expect(groups.unrecognized).toEqual([]);
  });
});

describe("intentLabel", () => {
  it("task → title", () => {
    expect(intentLabel(fixture[0])).toBe("Appeler le médecin");
  });
  it("shopping_item → name", () => {
    expect(intentLabel(fixture[1])).toBe("Dentifrice");
  });
  it("memory_entry → title", () => {
    expect(intentLabel(fixture[3])).toBe("Code portail");
  });
  it("unrecognized → fallback", () => {
    expect(intentLabel(fixture[4])).toBe("Non reconnu");
  });
  it("task sans titre → fallback", () => {
    expect(
      intentLabel({ type: "task", data: {}, confidence: 0.5 }),
    ).toBe("(tâche sans titre)");
  });
});
