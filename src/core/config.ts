import * as vscode from "vscode";
import type { ParlanceConfig } from "./types";

export function readConfig(): ParlanceConfig {
  const c = vscode.workspace.getConfiguration("parlance");
  return {
    zsearchPath: c.get<string>("zsearchPath", "zsearch"),
    topK: c.get<number>("topK", 10),
  };
}
