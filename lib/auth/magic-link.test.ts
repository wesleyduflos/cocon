// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

// `magic-link.ts` importe `firebase/auth` via `client.ts`. Comme on ne teste
// que les helpers localStorage purs, on mocke entièrement les deux modules
// pour éviter l'initialisation de Firebase Auth.
vi.mock("@/lib/firebase/client", () => ({
  auth: {},
}));
vi.mock("firebase/auth", () => ({
  sendSignInLinkToEmail: vi.fn(),
  signInWithEmailLink: vi.fn(),
  isSignInWithEmailLink: vi.fn(),
}));

import {
  clearEmailForMagicLink,
  retrieveEmailForMagicLink,
  storeEmailForMagicLink,
} from "./magic-link";

describe("magic-link localStorage helpers", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("retrieveEmailForMagicLink returns null when nothing was stored", () => {
    expect(retrieveEmailForMagicLink()).toBeNull();
  });

  it("stores and retrieves an email", () => {
    storeEmailForMagicLink("wesley@example.com");
    expect(retrieveEmailForMagicLink()).toBe("wesley@example.com");
  });

  it("overwrites the previously stored email", () => {
    storeEmailForMagicLink("first@example.com");
    storeEmailForMagicLink("second@example.com");
    expect(retrieveEmailForMagicLink()).toBe("second@example.com");
  });

  it("clearEmailForMagicLink removes the stored value", () => {
    storeEmailForMagicLink("wesley@example.com");
    clearEmailForMagicLink();
    expect(retrieveEmailForMagicLink()).toBeNull();
  });

  it("clearEmailForMagicLink is a no-op when nothing was stored", () => {
    expect(() => clearEmailForMagicLink()).not.toThrow();
    expect(retrieveEmailForMagicLink()).toBeNull();
  });
});
