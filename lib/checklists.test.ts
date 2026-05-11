import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import { calculateRunProgress, isRunComplete } from "./checklists";
import type { Task, WithId } from "@/types/cocon";

function makeTask(
  id: string,
  status: Task["status"],
  runId?: string,
): WithId<Task> {
  return {
    id,
    title: id,
    status,
    checklistRunId: runId,
    createdAt: Timestamp.now(),
    createdBy: "u",
    updatedAt: Timestamp.now(),
  };
}

describe("calculateRunProgress", () => {
  it("retourne 0/0 si aucune task n'appartient au run", () => {
    expect(
      calculateRunProgress([makeTask("a", "pending", "other")], "target"),
    ).toEqual({ total: 0, completed: 0 });
  });

  it("compte les tasks pending et done du run", () => {
    const tasks = [
      makeTask("a", "pending", "R"),
      makeTask("b", "done", "R"),
      makeTask("c", "done", "R"),
      makeTask("d", "pending", "OTHER"),
    ];
    expect(calculateRunProgress(tasks, "R")).toEqual({
      total: 3,
      completed: 2,
    });
  });

  it("ignore les tasks cancelled", () => {
    const tasks = [
      makeTask("a", "done", "R"),
      makeTask("b", "cancelled", "R"),
    ];
    expect(calculateRunProgress(tasks, "R")).toEqual({
      total: 2,
      completed: 1,
    });
  });
});

describe("isRunComplete", () => {
  it("false si aucun item dans le run", () => {
    expect(isRunComplete([], "R")).toBe(false);
  });
  it("false si certains items sont pending", () => {
    const tasks = [makeTask("a", "done", "R"), makeTask("b", "pending", "R")];
    expect(isRunComplete(tasks, "R")).toBe(false);
  });
  it("true si tous les items sont done", () => {
    const tasks = [makeTask("a", "done", "R"), makeTask("b", "done", "R")];
    expect(isRunComplete(tasks, "R")).toBe(true);
  });
});
