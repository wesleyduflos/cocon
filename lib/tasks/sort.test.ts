import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import type { Task, WithId } from "@/types/cocon";

import { sortByPriorityThenDue } from "./sort";

function makeTask(
  partial: Partial<Task> & { id: string; title?: string },
): WithId<Task> {
  const { id, title, ...rest } = partial;
  return {
    id,
    title: title ?? id,
    status: "pending",
    createdAt: Timestamp.fromDate(new Date("2026-01-01")),
    updatedAt: Timestamp.fromDate(new Date("2026-01-01")),
    createdBy: "u",
    ...rest,
  } as WithId<Task>;
}

describe("sortByPriorityThenDue", () => {
  it("priorité d'abord", () => {
    const tasks = [
      makeTask({ id: "a", priority: false }),
      makeTask({ id: "b", priority: true }),
      makeTask({ id: "c", priority: false }),
    ];
    expect(sortByPriorityThenDue(tasks).map((t) => t.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("à priorité égale, due date ascendante", () => {
    const tasks = [
      makeTask({
        id: "a",
        dueDate: Timestamp.fromDate(new Date("2026-05-15")),
      }),
      makeTask({
        id: "b",
        dueDate: Timestamp.fromDate(new Date("2026-05-12")),
      }),
      makeTask({
        id: "c",
        dueDate: Timestamp.fromDate(new Date("2026-05-20")),
      }),
    ];
    expect(sortByPriorityThenDue(tasks).map((t) => t.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("sans due-date en dernier", () => {
    const tasks = [
      makeTask({ id: "a" }),
      makeTask({
        id: "b",
        dueDate: Timestamp.fromDate(new Date("2026-05-12")),
      }),
    ];
    expect(sortByPriorityThenDue(tasks).map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("priorité l'emporte sur due date", () => {
    const tasks = [
      makeTask({
        id: "non-prio-tot",
        priority: false,
        dueDate: Timestamp.fromDate(new Date("2026-05-12")),
      }),
      makeTask({
        id: "prio-tard",
        priority: true,
        dueDate: Timestamp.fromDate(new Date("2026-05-20")),
      }),
    ];
    expect(sortByPriorityThenDue(tasks).map((t) => t.id)).toEqual([
      "prio-tard",
      "non-prio-tot",
    ]);
  });

  it("ne mute pas l'entrée", () => {
    const tasks = [
      makeTask({ id: "a", priority: false }),
      makeTask({ id: "b", priority: true }),
    ];
    const original = tasks.map((t) => t.id);
    sortByPriorityThenDue(tasks);
    expect(tasks.map((t) => t.id)).toEqual(original);
  });

  it("titre alphabétique en dernier recours", () => {
    const tasks = [
      makeTask({ id: "z", title: "Zoo" }),
      makeTask({ id: "a", title: "Apple" }),
      makeTask({ id: "m", title: "Maison" }),
    ];
    expect(sortByPriorityThenDue(tasks).map((t) => t.id)).toEqual([
      "a",
      "m",
      "z",
    ]);
  });
});
