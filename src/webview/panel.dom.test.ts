// @vitest-environment jsdom
/// <reference lib="dom" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it, expect, vi } from "vitest";

import type { PhraseHit } from "../core/types";

// Execute the real webview script (not a copy) so this test breaks if the
// button wiring or message switch in media/panel.js drifts. Resolved from the
// project root (vitest's cwd) — under the jsdom env, import.meta.url is not a
// file:// URL.
const panelSrc = readFileSync(resolve(process.cwd(), "media/panel.js"), "utf8");

const HIT: PhraseHit = {
  key: "ABCD",
  chunk_idx: 0,
  distance: 0.234,
  snippet: "原文段落",
  title: "论隐私",
  creators: ["Solove, D"],
  date: "2006",
  venue: "HLR",
  doi: null,
};

interface LoadedPanel {
  postMessage: ReturnType<typeof vi.fn>;
  root: HTMLElement;
}

/** Fresh #root + stubbed VS Code API, then run media/panel.js against it. */
function loadPanel(): LoadedPanel {
  const initialRoot = document.createElement("div");
  initialRoot.id = "root";
  document.body.replaceChildren(initialRoot);
  const postMessage = vi.fn();
  (
    globalThis as unknown as { acquireVsCodeApi: () => unknown }
  ).acquireVsCodeApi = () => ({
    postMessage,
  });
  new Function(panelSrc)();
  const root = document.getElementById("root") as HTMLElement;
  return { postMessage, root };
}

function click(el: Element): void {
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
}

function postToWebview(data: unknown): void {
  window.dispatchEvent(new window.MessageEvent("message", { data }));
}

describe("panel.js — button clicks post messages to the extension", () => {
  it("posts a copy message carrying the snippet text", () => {
    const { postMessage, root } = loadPanel();
    postToWebview({
      type: "results",
      hits: [{ ...HIT, source: "Solove, D (2006) — 论隐私 · HLR" }],
    });
    const btn = root.querySelector(".copy-btn");
    expect(btn, "copy button is rendered").toBeTruthy();
    click(btn!);
    expect(postMessage).toHaveBeenCalledWith({
      type: "copy",
      text: "原文段落",
    });
  });

  it("posts a jump message carrying the item key", () => {
    const { postMessage, root } = loadPanel();
    postToWebview({
      type: "results",
      hits: [{ ...HIT, source: "Solove, D (2006) — 论隐私 · HLR" }],
    });
    const btn = root.querySelector(".jump-btn");
    expect(btn, "jump button is rendered").toBeTruthy();
    click(btn!);
    expect(postMessage).toHaveBeenCalledWith({ type: "jump", key: "ABCD" });
  });
});

describe("panel.js — incoming messages update the panel", () => {
  it("renders results HTML into the root", () => {
    const { root } = loadPanel();
    postToWebview({
      type: "results",
      hits: [{ ...HIT, snippet: "MATCH", source: "source" }],
    });
    expect(root.querySelector(".snippet")?.textContent).toBe("MATCH");
  });

  it("shows a loading state", () => {
    const { root } = loadPanel();
    postToWebview({ type: "loading" });
    expect(root.textContent).toContain("检索中");
  });

  it("renders errors as text, never as HTML (XSS-safe)", () => {
    const { root } = loadPanel();
    postToWebview({ type: "error", message: "<script>alert(1)</script>" });
    expect(root.querySelector("script")).toBeNull();
    expect(root.querySelector(".error")?.textContent).toBe(
      "<script>alert(1)</script>",
    );
  });
});

describe("panel.js — suggestions", () => {
  it("shows the suggest button when results have hits and posts suggest on click", () => {
    const { postMessage, root } = loadPanel();
    postToWebview({ type: "results", hits: [{ ...HIT, source: "source" }] });
    const btn = root.querySelector("#suggest-btn");
    expect(btn, "suggest button rendered").toBeTruthy();
    click(btn!);
    expect(postMessage).toHaveBeenCalledWith({ type: "suggest" });
  });

  it("hides the suggest button when there are no hits", () => {
    const { root } = loadPanel();
    postToWebview({ type: "results", hits: [] });
    expect(root.querySelector("#suggest-btn")).toBeNull();
  });

  it("fills the suggest slot, leaving the hits intact", () => {
    const { root } = loadPanel();
    postToWebview({
      type: "results",
      hits: [{ ...HIT, snippet: "HIT", source: "source" }],
    });
    postToWebview({
      type: "suggestions",
      suggestion: { diagnosis: "SG", rewrites: [], phrasings: [] },
    });
    expect(root.querySelector("#suggest-slot")?.textContent).toContain("SG");
    expect(root.querySelector("#hits")?.textContent).toContain("HIT");
  });

  it("renders a suggestion error as text, never as HTML (XSS-safe)", () => {
    const { root } = loadPanel();
    postToWebview({ type: "results", hits: [{ ...HIT, source: "source" }] });
    postToWebview({
      type: "suggestion-error",
      message: "<script>boom</script>",
    });
    expect(root.querySelector("#suggest-slot script")).toBeNull();
    expect(root.querySelector("#suggest-slot .error")?.textContent).toBe(
      "<script>boom</script>",
    );
  });

  it("renders result and model fields as text, never as HTML", () => {
    const { root } = loadPanel();
    const payload = "<img src=x onerror=alert(1)>";
    postToWebview({
      type: "results",
      hits: [{ ...HIT, key: payload, snippet: payload, source: payload }],
    });
    postToWebview({
      type: "suggestions",
      suggestion: {
        diagnosis: payload,
        rewrites: [{ text: payload, basis: payload }],
        phrasings: [{ text: payload, source: payload }],
        model: payload,
      },
    });
    expect(root.querySelector("img")).toBeNull();
    expect(root.textContent).toContain(payload);
  });
});
