import * as vscode from "vscode";
import { PanelProvider } from "./providers/panelProvider";
import { readConfig } from "./core/config";
import { findPhrases } from "./core/zsearchClient";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new PanelProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PanelProvider.viewType, provider),
  );

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
        provider.showResults(hits);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        provider.showError(message);
      }
    }),
  );
}

export function deactivate(): void {}
