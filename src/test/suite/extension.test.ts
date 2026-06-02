import * as assert from "node:assert";

import * as vscode from "vscode";

import type { ParlanceApi } from "../../extension";

const EXT_ID = "semantic-craft.parlance";
const SAMPLE = "个人信息处理者负有合规义务";

async function getApi(): Promise<ParlanceApi> {
  const ext = vscode.extensions.getExtension<ParlanceApi>(EXT_ID);
  assert.ok(ext, `extension ${EXT_ID} not found`);
  return ext.activate();
}

async function selectAll(content: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({ content, language: "plaintext" });
  const editor = await vscode.window.showTextDocument(doc);
  const end = doc.lineAt(doc.lineCount - 1).range.end;
  editor.selection = new vscode.Selection(0, 0, end.line, end.character);
}

describe("Parlance extension — no API key required", () => {
  it("activates without throwing", async () => {
    const ext = vscode.extensions.getExtension(EXT_ID);
    assert.ok(ext, "extension is present");
    await ext.activate();
    assert.strictEqual(ext.isActive, true);
  });

  it("registers the findSimilarPhrasing command", async () => {
    await getApi();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("parlance.findSimilarPhrasing"),
      "parlance.findSimilarPhrasing should be registered",
    );
  });

  it("registers the generateSuggestions command", async () => {
    await getApi();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("parlance.generateSuggestions"),
      "parlance.generateSuggestions should be registered",
    );
  });

  it("does not throw when run with no selection", async () => {
    await getApi();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    // No active editor → command shows a warning and returns; must not throw.
    await vscode.commands.executeCommand("parlance.findSimilarPhrasing");
  });

  it("enters the error state when zsearchPath is invalid", async () => {
    const api = await getApi();
    const cfg = vscode.workspace.getConfiguration("parlance");
    await cfg.update("zsearchPath", "zsearch-nope-xyz", vscode.ConfigurationTarget.Global);
    try {
      await selectAll(SAMPLE);
      await vscode.commands.executeCommand("parlance.findSimilarPhrasing");
      const state = api.getLastState();
      assert.ok(state, "panel state should be set");
      assert.strictEqual(state.kind, "error", `expected error, got ${state.kind}`);
      assert.ok(state.message && state.message.length > 0, "error has a message");
    } finally {
      await cfg.update("zsearchPath", undefined, vscode.ConfigurationTarget.Global);
    }
  });
});

describe("Parlance golden path — requires GEMINI_API_KEY + a populated index", () => {
  it("returns real passages for a Chinese selection", async function () {
    if (!process.env.GEMINI_API_KEY) {
      console.log("[skip] GEMINI_API_KEY not in env — skipping live golden path");
      this.skip();
    }
    this.timeout(120000);

    const api = await getApi();
    const cfg = vscode.workspace.getConfiguration("parlance");
    await cfg.update("zsearchPath", undefined, vscode.ConfigurationTarget.Global);
    await cfg.update("topK", 5, vscode.ConfigurationTarget.Global);
    try {
      await selectAll(SAMPLE);
      await vscode.commands.executeCommand("parlance.findSimilarPhrasing");
      const state = api.getLastState();
      assert.ok(state, "panel state should be set");
      assert.strictEqual(
        state.kind,
        "results",
        `expected results, got ${state.kind}: ${state.message ?? ""}`,
      );
      assert.ok((state.count ?? 0) >= 1, "at least one passage returned");
    } finally {
      await cfg.update("topK", undefined, vscode.ConfigurationTarget.Global);
    }
  });
});

describe("Parlance suggestions golden path — requires a Token Plan Qwen key", () => {
  it("generates grounded suggestions after a real search", async function () {
    const tokenPlanKey = process.env.TOKEN_PLAN_API_KEY
      || process.env.BAILIAN_TOKEN_PLAN_API_KEY
      || process.env.QWEN_TOKEN_PLAN_API_KEY
      || process.env.QWEN_API_KEY;
    if (!tokenPlanKey) {
      console.log("[skip] TOKEN_PLAN_API_KEY/QWEN_API_KEY not in env — skipping live suggestion path");
      this.skip();
    }
    this.timeout(120000);

    const api = await getApi();
    const cfg = vscode.workspace.getConfiguration("parlance");
    await cfg.update("zsearchPath", undefined, vscode.ConfigurationTarget.Global);
    await cfg.update("topK", 5, vscode.ConfigurationTarget.Global);
    await cfg.update("suggestModel", "qwen3.6-flash", vscode.ConfigurationTarget.Global);
    try {
      await selectAll(SAMPLE);
      await vscode.commands.executeCommand("parlance.findSimilarPhrasing");
      assert.strictEqual(api.getLastState()?.kind, "results", "search produced results");

      // The command fires the handler without awaiting it; poll until it leaves "loading".
      await vscode.commands.executeCommand("parlance.generateSuggestions");
      const start = Date.now();
      while (Date.now() - start < 90000) {
        const cur = api.getLastSuggestionState();
        if (cur && cur.kind !== "loading") break;
        await new Promise((r) => setTimeout(r, 500));
      }
      const st = api.getLastSuggestionState();
      assert.ok(st, "suggestion state set");
      assert.strictEqual(st.kind, "suggestions", `expected suggestions, got ${st.kind}: ${st.message ?? ""}`);
      assert.ok((st.count ?? 0) >= 1, "at least one rewrite");
      assert.strictEqual(st.model, "qwen3.6-flash", "badge reflects the pinned Qwen model");
    } finally {
      await cfg.update("topK", undefined, vscode.ConfigurationTarget.Global);
      await cfg.update("suggestModel", undefined, vscode.ConfigurationTarget.Global);
    }
  });
});

describe("Parlance Gemini fallback golden path — requires Qwen + Gemini keys", () => {
  it("falls back to Gemini when the Qwen model is unavailable", async function () {
    const tokenPlanKey = process.env.TOKEN_PLAN_API_KEY
      || process.env.BAILIAN_TOKEN_PLAN_API_KEY
      || process.env.QWEN_TOKEN_PLAN_API_KEY
      || process.env.QWEN_API_KEY;
    if (!tokenPlanKey || !process.env.GEMINI_API_KEY) {
      console.log("[skip] need both GEMINI_API_KEY + TOKEN_PLAN_API_KEY — skipping Qwen fallback path");
      this.skip();
    }
    this.timeout(120000);

    const api = await getApi();
    const cfg = vscode.workspace.getConfiguration("parlance");
    await cfg.update("zsearchPath", undefined, vscode.ConfigurationTarget.Global);
    await cfg.update("topK", 5, vscode.ConfigurationTarget.Global);
    // Force the Qwen primary to fail (nonexistent model) so the Gemini fallback runs.
    await cfg.update("suggestModel", "qwen-nonexistent-model-xyz", vscode.ConfigurationTarget.Global);
    await cfg.update("fallbackModel", "gemini-3.5-flash", vscode.ConfigurationTarget.Global);
    try {
      await selectAll(SAMPLE);
      await vscode.commands.executeCommand("parlance.findSimilarPhrasing");
      assert.strictEqual(api.getLastState()?.kind, "results", "search produced results");

      await vscode.commands.executeCommand("parlance.generateSuggestions");
      const start = Date.now();
      while (Date.now() - start < 90000) {
        const cur = api.getLastSuggestionState();
        if (cur && cur.kind !== "loading") break;
        await new Promise((r) => setTimeout(r, 500));
      }
      const st = api.getLastSuggestionState();
      assert.ok(st, "suggestion state set");
      assert.strictEqual(st.kind, "suggestions", `expected suggestions via Gemini fallback, got ${st.kind}: ${st.message ?? ""}`);
      assert.ok((st.count ?? 0) >= 1, "at least one rewrite from the Gemini fallback");
      assert.strictEqual(st.model, "gemini-3.5-flash", "badge reflects the Gemini fallback model");
    } finally {
      await cfg.update("suggestModel", undefined, vscode.ConfigurationTarget.Global);
      await cfg.update("fallbackModel", undefined, vscode.ConfigurationTarget.Global);
      await cfg.update("topK", undefined, vscode.ConfigurationTarget.Global);
    }
  });
});
