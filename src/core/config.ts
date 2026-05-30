import * as vscode from "vscode";
import type { ParlanceConfig, SuggestConfig } from "./types";

export function readConfig(): ParlanceConfig {
  const c = vscode.workspace.getConfiguration("parlance");
  return {
    zsearchPath: c.get<string>("zsearchPath", "zsearch"),
    topK: c.get<number>("topK", 10),
  };
}

export function readSuggestConfig(): SuggestConfig {
  const c = vscode.workspace.getConfiguration("parlance");
  return {
    model: c.get<string>("suggestModel", "gemini-3.5-flash"),
    maxPassages: c.get<number>("suggestMaxPassages", 6),
    apiKey: process.env.GEMINI_API_KEY,
    fallbackModel: c.get<string>("fallbackModel", "qwen-plus"),
    fallbackApiKey: process.env.DASHSCOPE_API_KEY,
    fallbackBaseUrl: c.get<string>(
      "fallbackBaseUrl",
      "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    ),
  };
}
