import { describe, it, expect } from "vitest";
import { formatSource } from "./render";
import type { PhraseHit } from "../core/types";

const base: PhraseHit = {
  key: "ABCD", chunk_idx: 0, distance: 0.234, snippet: "原文段落",
  title: "论隐私", creators: ["Solove, D"], date: "2006-05", venue: "HLR", doi: null,
};

describe("formatSource", () => {
  it("extracts the year and joins a single author", () => {
    expect(formatSource(base)).toContain("Solove, D");
    expect(formatSource(base)).toContain("2006");
    expect(formatSource(base)).toContain("论隐私");
  });

  it("uses et al. for multiple authors", () => {
    expect(formatSource({ ...base, creators: ["A", "B", "C"] })).toContain("et al.");
  });

  it("falls back when title is null", () => {
    expect(formatSource({ ...base, title: null })).toContain("<无题>");
  });
});
