// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import {
  clearPendingInviteToken,
  retrievePendingInviteToken,
  storePendingInviteToken,
} from "./invite-storage";

describe("invite-storage", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("retrieves null when no token is stored", () => {
    expect(retrievePendingInviteToken()).toBeNull();
  });

  it("stores and retrieves a token", () => {
    const token = "550e8400-e29b-41d4-a716-446655440000";
    storePendingInviteToken(token);
    expect(retrievePendingInviteToken()).toBe(token);
  });

  it("overwrites a previously stored token", () => {
    storePendingInviteToken("token-1");
    storePendingInviteToken("token-2");
    expect(retrievePendingInviteToken()).toBe("token-2");
  });

  it("clearPendingInviteToken removes the stored value", () => {
    storePendingInviteToken("any-token");
    clearPendingInviteToken();
    expect(retrievePendingInviteToken()).toBeNull();
  });
});
