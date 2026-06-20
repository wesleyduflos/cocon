import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import type { Task, WithId } from "@/types/cocon";

import {
  countTasksMatching,
  filterTasks,
  filtersEqual,
  type TaskFilter,
} from "./filters";

const now = Timestamp.fromDate(new Date("2026-06-20T10:00:00Z"));

function makeTask(
  id: string,
  patch: Partial<Task> = {},
): WithId<Task> {
  return {
    id,
    title: `Task ${id}`,
    status: "pending",
    createdAt: now,
    createdBy: "wesley",
    updatedAt: now,
    ...patch,
  };
}

const WESLEY = "wesley-uid";
const CAMILLE = "camille-uid";

const tasks: WithId<Task>[] = [
  makeTask("a", { assigneeId: WESLEY }),
  makeTask("b", { assigneeId: CAMILLE }),
  makeTask("c", { assigneeId: undefined }),
  makeTask("d", { assigneeId: WESLEY }),
  makeTask("e", { assigneeId: undefined }),
];

describe("filterTasks", () => {
  it("retourne toutes les tâches quand aucun filtre actif", () => {
    expect(filterTasks(tasks, [])).toHaveLength(5);
  });

  it("filtre par un seul critère (me)", () => {
    const result = filterTasks(tasks, [{ kind: "me", uid: WESLEY }]);
    expect(result.map((t) => t.id)).toEqual(["a", "d"]);
  });

  it("filtre par un seul critère (unassigned)", () => {
    const result = filterTasks(tasks, [{ kind: "unassigned" }]);
    expect(result.map((t) => t.id)).toEqual(["c", "e"]);
  });

  it("combine plusieurs filtres en OR", () => {
    const result = filterTasks(tasks, [
      { kind: "me", uid: WESLEY },
      { kind: "unassigned" },
    ]);
    expect(result.map((t) => t.id)).toEqual(["a", "c", "d", "e"]);
  });

  it("retourne tableau vide si aucun match", () => {
    const result = filterTasks(tasks, [
      { kind: "member", uid: "ghost-uid" },
    ]);
    expect(result).toHaveLength(0);
  });

  it("dédoublonne implicitement (une tâche ne sort qu'une fois)", () => {
    // « À moi » + « membre Wesley » → tâche A ne doit pas être listée deux fois
    const result = filterTasks(tasks, [
      { kind: "me", uid: WESLEY },
      { kind: "member", uid: WESLEY },
    ]);
    expect(result.map((t) => t.id)).toEqual(["a", "d"]);
  });
});

describe("countTasksMatching", () => {
  it("compte uniquement les tâches pending", () => {
    const mix: WithId<Task>[] = [
      ...tasks,
      makeTask("done-1", { assigneeId: WESLEY, status: "done" }),
    ];
    expect(countTasksMatching(mix, { kind: "me", uid: WESLEY })).toBe(2);
  });

  it("est indépendant des autres filtres", () => {
    // Le compteur Wesley ne change pas même si on filtre par non-assigné
    expect(countTasksMatching(tasks, { kind: "me", uid: WESLEY })).toBe(2);
  });
});

describe("filtersEqual", () => {
  it("identifie deux filtres identiques", () => {
    expect(
      filtersEqual(
        { kind: "me", uid: WESLEY },
        { kind: "me", uid: WESLEY },
      ),
    ).toBe(true);
  });

  it("distingue me et member pour le même uid", () => {
    expect(
      filtersEqual(
        { kind: "me", uid: WESLEY },
        { kind: "member", uid: WESLEY },
      ),
    ).toBe(false);
  });
});
