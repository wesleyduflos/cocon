import { describe, expect, it } from "vitest";

import { matchQuery, tokenize } from "./tokenize";

describe("tokenize", () => {
  it("retourne [] pour une chaîne vide", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("met en minuscules", () => {
    expect(tokenize("Bonjour")).toEqual(["bonjour"]);
  });

  it("retire les accents", () => {
    expect(tokenize("Café Crème")).toEqual(["cafe", "creme"]);
  });

  it("split sur les caractères non-alphanumériques", () => {
    expect(tokenize("Wi-Fi Salon")).toEqual(["wi", "fi", "salon"]);
  });

  it("filtre les tokens trop courts", () => {
    expect(tokenize("a b c d")).toEqual([]);
    expect(tokenize("ab cd")).toEqual(["ab", "cd"]);
  });

  it("déduplique", () => {
    expect(tokenize("code code code")).toEqual(["code"]);
  });

  it("garde les chiffres", () => {
    expect(tokenize("Code 1234")).toEqual(["code", "1234"]);
  });
});

describe("matchQuery", () => {
  const entries = [
    { searchTokens: ["wifi", "salon", "freebox", "5g"] },
    { searchTokens: ["code", "portail", "1234"] },
    { searchTokens: ["mochi", "veto", "lefevre", "0123456789"] },
  ];

  it("retourne tout si query vide", () => {
    expect(matchQuery(entries, "")).toEqual(entries);
  });

  it("match exact sur un token", () => {
    expect(matchQuery(entries, "wifi")).toEqual([entries[0]]);
  });

  it("match insensible aux accents", () => {
    expect(matchQuery(entries, "véto")).toEqual([entries[2]]);
  });

  it("match prefix", () => {
    // "salo" → match "salon"
    expect(matchQuery(entries, "salo")).toEqual([entries[0]]);
  });

  it("plusieurs tokens (AND)", () => {
    expect(matchQuery(entries, "code portail")).toEqual([entries[1]]);
  });

  it("aucun match", () => {
    expect(matchQuery(entries, "inexistant")).toEqual([]);
  });
});
