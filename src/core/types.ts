export interface PhraseHit {
  key: string;
  chunk_idx: number;
  distance: number;
  snippet: string;
  title: string | null;
  creators: string[];
  date: string | null;
  venue: string | null;
  doi: string | null;
}

export interface ParlanceConfig {
  zsearchPath: string;
  topK: number;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export type CommandRunner = (cmd: string, args: string[]) => Promise<CommandResult>;

export type ErrorKind = "not-installed" | "no-api-key" | "no-index" | "empty-selection" | "unknown";

export type SuggestErrorKind = "no-api-key" | "no-hits" | "network" | "bad-output" | "unknown";

export interface Suggestion {
  diagnosis: string;
  rewrites: { text: string; basis: string }[];
  phrasings: { text: string; source: string }[];
}

export interface SuggestConfig {
  model: string;
  maxPassages: number;
  apiKey: string | undefined;
}

export interface GeminiRequest {
  apiKey: string;
  model: string;
  systemInstruction: string;
  prompt: string;
}

export type GeminiGenerator = (req: GeminiRequest) => Promise<string>;
