---
type: decision
title: "Phrase scan globs as prose in JSDoc, never as glob literals"
description: A `*/` inside a `/** */` JSDoc block (glob literals contain it) terminates the comment early and the parser error points after the culprit — phrase scan globs as prose in scripts/ JSDoc.
tags: [scripts, guards, jsdoc]
timestamp: 2026-09-06
last_confirmed: 2026-09-06
triggers: [jsdoc-glob, scan-scope-comment, guard-script, unexpected-star]
---
# Why

Guard scripts under `scripts/` document their scan scope in the collecting function's JSDoc (the JSDoc is often the only documentation, per `guides/scripts.md` §Functions & modules). Writing that scope as glob literals embeds `*/` — the sequence `docs/**/*.mdx` contains `**/`, which closes the `/** */` comment at that point. Everything after the premature close parses as code, and bun/tsc report `Unexpected *` at a line and column *after* the real culprit, so the error does not point at the offending glob. The established convention is prose phrasing: "every `.mdx` under each package's `docs/`" (`scripts/doc-links.ts` `collectScanFiles`, `scripts/em-dash.ts` `collectScanFiles`) — no glob literal, no `*/` hazard. Glob literals stay fine in code strings, regexes, and markdown (AGENTS.md rows, guides) where no comment parser is involved.

# Evidence

This session: `bun ./scripts/em-dash.ts` failed with `error: Unexpected *` at `scripts/em-dash.ts:42:13` while line 42 sat inside a `/** */` JSDoc; root cause was `**/` within the glob `docs/**/*.mdx` in the comment text. After rephrasing the JSDoc to prose, the guard ran green (`✔️ No em/en dashes in user-facing docs (217 files scanned)`, exit 0) and full `bun lint` (tsc + eslint over `scripts/em-dash.ts`) exited 0.
