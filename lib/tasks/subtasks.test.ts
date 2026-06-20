import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import type { Subtask, TaskStatus, WithId } from "@/types/cocon";

import {
  areAllSubtasksDone,
  countSubtasksDone,
  nextSubtaskPosition,
  sortSubtasks,
  swapSubtaskPositions,
} from "./subtasks";

const now = Timestamp.fromDate(new Date("2026-06-20"));

function makeSubtask(
  id: string,
  position: number,
  status: TaskStatus = "pending",
): WithId<Subtask> {
  return {
    id,
    title: `sub ${id}`,
    status,
    position,
    createdAt: now,
    createdBy: "u",
  };
}

describe("sortSubtasks", () => {
  it("trie par position ASC", () => {
    const subs = [
      makeSubtask("c", 3),
      makeSubtask("a", 0),
      makeSubtask("b", 1),
    ];
    expect(sortSubtasks(subs).map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("ne mute pas l'entrée", () => {
    const subs = [makeSubtask("a", 2), makeSubtask("b", 1)];
    const original = subs.map((s) => s.id);
    sortSubtasks(subs);
    expect(subs.map((s) => s.id)).toEqual(original);
  });
});

describe("areAllSubtasksDone", () => {
  it("false pour liste vide", () => {
    expect(areAllSubtasksDone([])).toBe(false);
  });

  it("true quand toutes done", () => {
    expect(
      areAllSubtasksDone([
        makeSubtask("a", 0, "done"),
        makeSubtask("b", 1, "done"),
      ]),
    ).toBe(true);
  });

  it("false si une seule pending", () => {
    expect(
      areAllSubtasksDone([
        makeSubtask("a", 0, "done"),
        makeSubtask("b", 1, "pending"),
      ]),
    ).toBe(false);
  });
});

describe("countSubtasksDone", () => {
  it("compte done/total", () => {
    const subs = [
      makeSubtask("a", 0, "done"),
      makeSubtask("b", 1, "pending"),
      makeSubtask("c", 2, "done"),
    ];
    expect(countSubtasksDone(subs)).toEqual({
      done: 2,
      total: 3,
      label: "2/3",
    });
  });

  it("label vide pour liste vide", () => {
    expect(countSubtasksDone([])).toEqual({
      done: 0,
      total: 0,
      label: "",
    });
  });
});

describe("nextSubtaskPosition", () => {
  it("0 pour liste vide", () => {
    expect(nextSubtaskPosition([])).toBe(0);
  });

  it("max + 1", () => {
    expect(
      nextSubtaskPosition([makeSubtask("a", 0), makeSubtask("b", 4)]),
    ).toBe(5);
  });

  it("gère positions négatives", () => {
    expect(
      nextSubtaskPosition([makeSubtask("a", -3), makeSubtask("b", -1)]),
    ).toBe(0);
  });
});

describe("swapSubtaskPositions", () => {
  it("renvoie les deux updates de swap", () => {
    const subs = [
      makeSubtask("a", 0),
      makeSubtask("b", 1),
      makeSubtask("c", 2),
    ];
    expect(swapSubtaskPositions(subs, 0, 1)).toEqual([
      { id: "a", position: 1 },
      { id: "b", position: 0 },
    ]);
  });

  it("retourne [] pour index invalides", () => {
    const subs = [makeSubtask("a", 0)];
    expect(swapSubtaskPositions(subs, 0, 5)).toEqual([]);
    expect(swapSubtaskPositions(subs, -1, 0)).toEqual([]);
  });
});
