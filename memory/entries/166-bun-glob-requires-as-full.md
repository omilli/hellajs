---
type: correction
title: "Bun.Glob requires ** as a full path segment — bunfig coveragePathIgnorePatterns negations are the coverage-table row whitelist, so a dead glob silently drops rows"
description: In bunfig coveragePathIgnorePatterns, a `**.js` last segment matches nothing (Bun.Glob needs `**` alone per segment); the `!`-negation entry doubles as the coverage-table row whitelist.
tags: [testing, tooling, bun]
timestamp: 2026-09-16
last_confirmed: 2026-09-16
triggers: [coverage-table-rows, bunfig-ignore-glob, bun-glob-segment, missing-coverage-row]
---
# Why

Two non-obvious bun behaviors compound into a silent reporting hole. First, `Bun.Glob` does not honor `**` inside a filename segment: `**/**/dist/registry/**.js` matches NO file, while `**/**/dist/registry/**/*.js` matches — `**` must be a full segment. Second, `bun test --coverage`'s text table does NOT list every loaded instrumented file: with bunfig `coveragePathIgnorePatterns` configured, per-file rows appear ONLY for files matching the negated (`!`-prefixed) patterns — a minimal bunfig without them yields an "All files" row and nothing else. So a dead glob inside the negation brace-group means: code executes, tests pass, coverage gates stay green, and the rows simply never report — no failure to triage, just absent evidence. Any DoD phrased as "coverage table carries X rows" depends on the glob actually matching.

Recall when: coverage rows are missing for loaded code, editing the bunfig ignore/negation list, or writing a DoD that names coverage-table rows.

# Evidence

- Probe: `bun -e 'new Bun.Glob("**/**/dist/registry/**.js").match("packages/ui/dist/registry/button/css/button.js")'` → false; same with `**/*.js` suffix → true.
- Minimal bunfig (preload only, no ignore patterns) + `bun test packages/ui/tests/button.test.ts --coverage` → table shows only `All files`; full bunfig → exactly the files matching the negated patterns (`**/**/dist/bundle.js`, `**/**/dist/index.js` rows present).
- Fix applied in bunfig.toml: `**/**/dist/registry/**.js` → `**/**/dist/registry/**/*.js`; next `bun coverage ui` printed all five `dist/registry` rows at 100% (previously absent despite the tests executing those exact files).
