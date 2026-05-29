import * as vscode from "vscode";
import { PanelProvider } from "./providers/panelProvider";
import type { PanelState, SuggestionState } from "./providers/panelProvider";
import { readConfig, readSuggestConfig } from "./core/config";
import { findPhrases } from "./core/zsearchClient";
import { generateSuggestions, SuggestError } from "./core/suggestClient";

/** Public API returned by activate(), consumed by integration tests. */
export interface ParlanceApi {
  getLastState(): PanelState | undefined;
  getLastSuggestionState(): SuggestionState | undefined;
}

export function activate(context: vscode.ExtensionContext): ParlanceApi {
  const provider = new PanelProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PanelProvider.viewType, provider),
  );

  provider.setSuggestionHandler(async (text, hits) => {
    provider.showSuggestionLoading();
    try {
      const suggestion = await generateSuggestions(text, hits, readSuggestConfig());
      provider.showSuggestions(suggestion);
    } catch (e) {
      const message = e instanceof SuggestError ? e.message : String(e);
      provider.showSuggestionError(message);
    }
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("parlance.findSimilarPhrasing", async () => {
      const editor = vscode.window.activeTextEditor;
      const selection = editor?.document.getText(editor.selection).trim();
      if (!selection) {
        void vscode.window.showWarningMessage("请先选中要检索的文本。");
        return;
      }
      provider.showLoading();
      try {
        const hits = await findPhrases(selection, readConfig());
        provider.showResults(selection, hits);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        provider.showError(message);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("parlance.generateSuggestions", () => {
      provider.requestSuggestions();
    }),
  );

  return {
    getLastState: () => provider.lastState,
    getLastSuggestionState: () => provider.lastSuggestionState,
  };
}

export function deactivate(): void {}
