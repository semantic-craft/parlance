# Changelog

## [0.0.12] - 2026-06-02

- Added a SkillOpt-style validation gate to the suggestion system prompt so every rewrite or phrasing suggestion must stay grounded in retrieved passages, disclose insufficiency, avoid invented sources/facts, and return strict JSON.
- Added prompt-contract coverage for the grounding gate.
