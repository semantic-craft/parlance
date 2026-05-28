import * as vscode from "vscode";
import { renderHits } from "../webview/render";
import type { PhraseHit } from "../core/types";

export class PanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "parlance.results";
  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
    };
    view.webview.html = this.shell(view.webview);
    view.webview.onDidReceiveMessage((msg) => {
      if (msg.type === "copy") {
        void vscode.env.clipboard.writeText(msg.text);
        void vscode.window.showInformationMessage("已复制到剪贴板");
      } else if (msg.type === "jump") {
        void vscode.env.openExternal(vscode.Uri.parse(`zotero://select/library/items/${msg.key}`));
      }
    });
  }

  showLoading(): void {
    void this.reveal();
    this.view?.webview.postMessage({ type: "loading" });
  }

  showResults(hits: PhraseHit[]): void {
    void this.reveal();
    this.view?.webview.postMessage({ type: "results", html: renderHits(hits) });
  }

  showError(message: string): void {
    void this.reveal();
    this.view?.webview.postMessage({ type: "error", message });
  }

  private async reveal(): Promise<void> {
    if (!this.view) {
      await vscode.commands.executeCommand("parlance.results.focus");
    }
    this.view?.show?.(true);
  }

  private shell(webview: vscode.Webview): string {
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "media", "panel.css"));
    const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "media", "panel.js"));
    return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="${cssUri}" rel="stylesheet" />
</head>
<body>
  <div id="root"><div class="empty">选中一段文字,运行「Parlance: 查找相近表达」。</div></div>
  <script src="${jsUri}"></script>
</body>
</html>`;
  }
}
