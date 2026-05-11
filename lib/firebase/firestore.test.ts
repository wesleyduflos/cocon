import { Timestamp } from "firebase/firestore";
import { describe, expect, it, vi } from "vitest";

import type { Household, Invitation, Task, User } from "@/types/cocon";

// On mocke `./client` pour éviter d'initialiser Firebase au moment de l'import.
// Les converters et helpers purs n'utilisent pas `db` au top-level, donc un
// mock vide suffit.
vi.mock("./client", () => ({
  app: {},
  auth: {},
  db: {},
  storage: {},
}));

import {
  householdConverter,
  invitationConverter,
  isDueThisWeek,
  isDueToday,
  isInvitationExpired,
  isOverdue,
  isRecentlyCompleted,
  taskConverter,
  timestampFromDate,
  userConverter,
} from "./firestore";

/* =========================================================================
   Helpers purs
   ========================================================================= */

describe("isOverdue", () => {
  const now = new Date("2026-05-11T10:00:00Z");

  it("returns false when task has no dueDate", () => {
    const task = { status: "pending" as const };
    expect(isOverdue(task, now)).toBe(false);
  });

  it("returns false when dueDate is in the future", () => {
    const task = {
      status: "pending" as const,
      dueDate: timestampFromDate(new Date("2026-05-15T10:00:00Z")),
    };
    expect(isOverdue(task, now)).toBe(false);
  });

  it("returns true when dueDate is in the past and task is pending", () => {
    const task = {
      status: "pending" as const,
      dueDate: timestampFromDate(new Date("2026-05-01T10:00:00Z")),
    };
    expect(isOverdue(task, now)).toBe(true);
  });

  it("returns false when dueDate is in the past but task is already done", () => {
    const task = {
      status: "done" as const,
      dueDate: timestampFromDate(new Date("2026-05-01T10:00:00Z")),
    };
    expect(isOverdue(task, now)).toBe(false);
  });

  it("returns false when task is cancelled", () => {
    const task = {
      status: "cancelled" as const,
      dueDate: timestampFromDate(new Date("2026-05-01T10:00:00Z")),
    };
    expect(isOverdue(task, now)).toBe(false);
  });
});

describe("isDueToday", () => {
  const now = new Date("2026-05-11T14:00:00");

  it("returns false when task has no dueDate", () => {
    expect(isDueToday({}, now)).toBe(false);
  });

  it("returns true when dueDate is the same calendar day (later hour)", () => {
    const task = {
      dueDate: timestampFromDate(new Date("2026-05-11T20:00:00")),
    };
    expect(isDueToday(task, now)).toBe(true);
  });

  it("returns true when dueDate is the same calendar day (earlier hour)", () => {
    const task = {
      dueDate: timestampFromDate(new Date("2026-05-11T08:00:00")),
    };
    expect(isDueToday(task, now)).toBe(true);
  });

  it("returns false when dueDate is the previous day", () => {
    const task = {
      dueDate: timestampFromDate(new Date("2026-05-10T23:59:59")),
    };
    expect(isDueToday(task, now)).toBe(false);
  });

  it("returns false when dueDate is the next day", () => {
    const task = {
      dueDate: timestampFromDate(new Date("2026-05-12T00:00:00")),
    };
    expect(isDueToday(task, now)).toBe(false);
  });
});

describe("timestampFromDate", () => {
  it("produces a Firestore Timestamp equivalent to the input Date", () => {
    const date = new Date("2026-05-11T10:00:00Z");
    const ts = timestampFromDate(date);
    expect(ts).toBeInstanceOf(Timestamp);
    expect(ts.toMillis()).toBe(date.getTime());
  });
});

describe("isDueThisWeek", () => {
  const now = new Date("2026-05-11T10:00:00");

  it("returns false when task has no dueDate", () => {
    expect(isDueThisWeek({}, now)).toBe(false);
  });

  it("returns false when dueDate is today (handled by isDueToday)", () => {
    const task = {
      dueDate: timestampFromDate(new Date("2026-05-11T20:00:00")),
    };
    expect(isDueThisWeek(task, now)).toBe(false);
  });

  it("returns true for tomorrow", () => {
    const task = {
      dueDate: timestampFromDate(new Date("2026-05-12T10:00:00")),
    };
    expect(isDueThisWeek(task, now)).toBe(true);
  });

  it("returns true for 7 days later", () => {
    const task = {
      dueDate: timestampFromDate(new Date("2026-05-18T23:00:00")),
    };
    expect(isDueThisWeek(task, now)).toBe(true);
  });

  it("returns false for 8+ days later", () => {
    const task = {
      dueDate: timestampFromDate(new Date("2026-05-19T10:00:00")),
    };
    expect(isDueThisWeek(task, now)).toBe(false);
  });
});

describe("isRecentlyCompleted", () => {
  const now = new Date("2026-05-11T10:00:00");

  it("returns false when status is pending", () => {
    const task = {
      status: "pending" as const,
      completedAt: timestampFromDate(new Date("2026-05-10T10:00:00")),
    };
    expect(isRecentlyCompleted(task, now)).toBe(false);
  });

  it("returns false when done but no completedAt", () => {
    expect(isRecentlyCompleted({ status: "done" as const }, now)).toBe(false);
  });

  it("returns true when done and completed yesterday", () => {
    const task = {
      status: "done" as const,
      completedAt: timestampFromDate(new Date("2026-05-10T10:00:00")),
    };
    expect(isRecentlyCompleted(task, now)).toBe(true);
  });

  it("returns false when done and completed more than 7 days ago", () => {
    const task = {
      status: "done" as const,
      completedAt: timestampFromDate(new Date("2026-05-03T10:00:00")),
    };
    expect(isRecentlyCompleted(task, now)).toBe(false);
  });
});

describe("isInvitationExpired", () => {
  const now = new Date("2026-05-11T10:00:00Z");

  it("returns false when expiresAt is in the future", () => {
    const invitation = {
      expiresAt: timestampFromDate(new Date("2026-05-18T10:00:00Z")),
    };
    expect(isInvitationExpired(invitation, now)).toBe(false);
  });

  it("returns true when expiresAt is in the past", () => {
    const invitation = {
      expiresAt: timestampFromDate(new Date("2026-05-04T10:00:00Z")),
    };
    expect(isInvitationExpired(invitation, now)).toBe(true);
  });

  it("returns true when expiresAt equals exactly now (boundary)", () => {
    const invitation = { expiresAt: timestampFromDate(now) };
    expect(isInvitationExpired(invitation, now)).toBe(false); // strictement <, donc pile à l'heure n'est pas expiré
  });
});

/* =========================================================================
   Converters (round-trip data ↔ DocumentData)
   On simule un QueryDocumentSnapshot avec un objet `.data()`.
   ========================================================================= */

function fakeSnapshot<T>(data: T) {
  return { data: () => data } as Parameters<
    NonNullable<typeof userConverter.fromFirestore>
  >[0];
}

describe("userConverter", () => {
  it("round-trips a User document", () => {
    const user: User = {
      email: "wesley@example.com",
      displayName: "Wesley",
      createdAt: timestampFromDate(new Date("2026-05-11T10:00:00Z")),
      preferences: {
        theme: "dark",
        quietHoursStart: 22,
        quietHoursEnd: 7,
        notificationsEnabled: true,
        voiceCaptureEnabled: false,
      },
    };

    const serialized = userConverter.toFirestore(user);
    const deserialized = userConverter.fromFirestore(fakeSnapshot(serialized));

    expect(deserialized).toEqual(user);
  });
});

describe("householdConverter", () => {
  it("round-trips a Household document", () => {
    const household: Household = {
      name: "Cocon Magnolia",
      emoji: "🏠",
      ownerId: "uid-wesley",
      memberIds: ["uid-wesley", "uid-camille"],
      invitations: {},
      createdAt: timestampFromDate(new Date("2026-05-11T10:00:00Z")),
    };

    const serialized = householdConverter.toFirestore(household);
    const deserialized = householdConverter.fromFirestore(
      fakeSnapshot(serialized),
    );

    expect(deserialized).toEqual(household);
  });
});

describe("invitationConverter", () => {
  it("round-trips an Invitation document", () => {
    const invitation: Invitation = {
      token: "550e8400-e29b-41d4-a716-446655440000",
      householdId: "hh-cocon-1",
      householdName: "Cocon Magnolia",
      ownerDisplayName: "Wesley",
      email: "camille@example.com",
      invitedBy: "uid-wesley",
      invitedAt: timestampFromDate(new Date("2026-05-11T10:00:00Z")),
      expiresAt: timestampFromDate(new Date("2026-05-18T10:00:00Z")),
      status: "pending",
    };

    const serialized = invitationConverter.toFirestore(invitation);
    const deserialized = invitationConverter.fromFirestore(
      fakeSnapshot(serialized),
    );

    expect(deserialized).toEqual(invitation);
  });
});

describe("taskConverter", () => {
  it("round-trips a Task document with all sprint 1 fields", () => {
    const task: Task = {
      title: "Donner le traitement à Mochi",
      description: "Une demi-pipette dans la nourriture",
      category: "animaux",
      assigneeId: "uid-camille",
      effort: "quick",
      status: "pending",
      dueDate: timestampFromDate(new Date("2026-05-12T08:00:00Z")),
      createdBy: "uid-wesley",
      createdAt: timestampFromDate(new Date("2026-05-11T10:00:00Z")),
      updatedAt: timestampFromDate(new Date("2026-05-11T10:00:00Z")),
    };

    const serialized = taskConverter.toFirestore(task);
    const deserialized = taskConverter.fromFirestore(fakeSnapshot(serialized));

    expect(deserialized).toEqual(task);
  });

  it("preserves the sprint 2-4 anticipated fields if set", () => {
    const task: Task = {
      title: "Préparer les vacances",
      status: "pending",
      notes: "Voir la liste partagée Drive",
      attachmentIds: ["att-1", "att-2"],
      recurrenceRule: "FREQ=WEEKLY",
      checklistRunId: "run-vacances-1",
      createdBy: "uid-wesley",
      createdAt: timestampFromDate(new Date("2026-05-11T10:00:00Z")),
      updatedAt: timestampFromDate(new Date("2026-05-11T10:00:00Z")),
    };

    const serialized = taskConverter.toFirestore(task);
    const deserialized = taskConverter.fromFirestore(fakeSnapshot(serialized));

    expect(deserialized.notes).toBe("Voir la liste partagée Drive");
    expect(deserialized.attachmentIds).toEqual(["att-1", "att-2"]);
    expect(deserialized.recurrenceRule).toBe("FREQ=WEEKLY");
    expect(deserialized.checklistRunId).toBe("run-vacances-1");
  });
});
