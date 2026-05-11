import { describe, expect, it } from "vitest";

import { isWithinQuietHours } from "./quiet-hours";

describe("isWithinQuietHours", () => {
  it("returns false when start === end (empty window)", () => {
    expect(isWithinQuietHours(10, 22, 22)).toBe(false);
  });

  it("simple window — inside", () => {
    expect(isWithinQuietHours(14, 13, 17)).toBe(true);
  });

  it("simple window — boundary inclusive at start", () => {
    expect(isWithinQuietHours(13, 13, 17)).toBe(true);
  });

  it("simple window — boundary exclusive at end", () => {
    expect(isWithinQuietHours(17, 13, 17)).toBe(false);
  });

  it("simple window — outside", () => {
    expect(isWithinQuietHours(10, 13, 17)).toBe(false);
  });

  // Default Cocon quiet hours : 22h → 7h
  describe("wraps midnight (22h → 7h)", () => {
    it("22h is inside", () => {
      expect(isWithinQuietHours(22, 22, 7)).toBe(true);
    });
    it("23h is inside", () => {
      expect(isWithinQuietHours(23, 22, 7)).toBe(true);
    });
    it("0h is inside", () => {
      expect(isWithinQuietHours(0, 22, 7)).toBe(true);
    });
    it("6h is inside", () => {
      expect(isWithinQuietHours(6, 22, 7)).toBe(true);
    });
    it("7h is outside (boundary exclusive)", () => {
      expect(isWithinQuietHours(7, 22, 7)).toBe(false);
    });
    it("12h is outside", () => {
      expect(isWithinQuietHours(12, 22, 7)).toBe(false);
    });
    it("21h is outside (just before window)", () => {
      expect(isWithinQuietHours(21, 22, 7)).toBe(false);
    });
  });

  it("returns false for invalid hours", () => {
    expect(isWithinQuietHours(-1, 22, 7)).toBe(false);
    expect(isWithinQuietHours(25, 22, 7)).toBe(false);
  });
});
