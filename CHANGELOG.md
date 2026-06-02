# Changelog

## [0.0.13] - 2026-06-02

- Updated the documented Qwen Token Plan stronger fallback from `qwen3.6-plus` to `qwen3.7-plus`, with `qwen3.7-max` noted as the parallel higher-end option.

## [0.0.12] - 2026-06-02

- Added a SkillOpt-style validation gate to the suggestion system prompt so every rewrite or phrasing suggestion must stay grounded in retrieved passages, disclose insufficiency, avoid invented sources/facts, and return strict JSON.
- Added prompt-contract coverage for the grounding gate.
