import { describe, it, expect } from "vitest";
import { escapeHtml, formatSource, renderHits } from "./render";
import type { PhraseHit } from "../core/types";

const base: PhraseHit = {
  key: "ABCD", chunk_idx: 0, distance: 0.234, snippet: "原文段落",
  title: "论隐私", creators: ["Solove, D"], date: "2006-05", venue: "HLR", doi: null,
};

describe("escapeHtml", () => {
  it("escapes angle brackets and ampersands", () => {
    expect(escapeHtml('<a> & "b"')).toBe("&lt;a&gt; &amp; &quot;b&quot;");
  });
});

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

describe("renderHits", () => {
  it("renders an empty-state message for no hits", () => {
    expect(renderHits([])).toContain("没有找到");
  });

  it("escapes snippet content to prevent injection", () => {
    const html = renderHits([{ ...base, snippet: "<script>x</script>" }]);
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders the distance and one block per hit", () => {
    const html = renderHits([base, { ...base, key: "EFGH" }]);
    expect(html).toContain("0.234");
    expect((html.match(/class="hit"/g) || []).length).toBe(2);
  });
});
