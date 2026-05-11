# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-05-11

Initial public release.

### Added

- Side-panel UI scoped to `startupschool.org` tabs only.
- Floating pill on YC pages that opens the side panel.
- Project-context textarea: paste any plain-text description of your project.
- AI-distilled evaluation dimensions, reorderable by priority.
- Free-text hard requirements.
- One-click profile analysis with verdict (Worth it / Maybe / Skip), 0–100
  score, one-line summary, and per-dimension status icons (met / unknown /
  not met) with cited reasons.
- Per-profile evaluation cache, max 20 entries, LRU eviction.
- Markdown session export (project context + dimensions + requirements +
  all cached evaluations + raw profile texts) copied to clipboard for use
  in any AI chat.
- Claude and Gemini providers with live model-list dropdowns. BYO API key.
- JSON repair pass for truncated model responses.
