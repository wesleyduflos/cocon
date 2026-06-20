import { describe, expect, it } from "vitest";

import {
  normalizeQuantityInput,
  sanitizeQuantityKeystroke,
} from "./quantity";

describe("normalizeQuantityInput", () => {
  it("retourne 1 pour une chaîne vide", () => {
    expect(normalizeQuantityInput("")).toBe(1);
  });

  it("retourne 1 pour une chaîne invalide", () => {
    expect(normalizeQuantityInput("abc")).toBe(1);
  });

  it("retourne 1 pour 0", () => {
    expect(normalizeQuantityInput("0")).toBe(1);
  });

  it("retourne 1 pour une valeur négative", () => {
    expect(normalizeQuantityInput("-5")).toBe(1);
  });

  it("retourne l'entier saisi", () => {
    expect(normalizeQuantityInput("12")).toBe(12);
  });

  it("ignore les décimales", () => {
    expect(normalizeQuantityInput("2.5")).toBe(2);
  });

  it("retourne 1 pour NaN", () => {
    expect(normalizeQuantityInput("NaN")).toBe(1);
  });
});

describe("sanitizeQuantityKeystroke", () => {
  it("conserve les chiffres", () => {
    expect(sanitizeQuantityKeystroke("123")).toBe("123");
  });

  it("autorise la chaîne vide", () => {
    expect(sanitizeQuantityKeystroke("")).toBe("");
  });

  it("retire les lettres", () => {
    expect(sanitizeQuantityKeystroke("1a2b3")).toBe("123");
  });

  it("retire les espaces et symboles", () => {
    expect(sanitizeQuantityKeystroke(" 1 . 2 ")).toBe("12");
  });

  it("retire les signes négatifs", () => {
    expect(sanitizeQuantityKeystroke("-5")).toBe("5");
  });
});
