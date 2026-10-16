---
title: vp lint is oxlint: plugin(rule) format, declaration-site reports, warnings stay green
description: "Grep lint output for `plugin(rule)` (never `plugin/rule`); oxlint reports prefer-const at the declaration so eslint-era assignment-site suppressions are dead; warnings exit 0 — only errors fail the gate."
tags: [vp-lint, oxlint, eslint-migration, gate-semantics]
confirmed: 2026-10-16
---
# Why

The repo's lint gate is `vp lint` (Oxlint + tsgolint), not eslint — carry-over eslint habits misread it three ways. (1) Diagnostics print as `hella(no-iterator-loops)` / `eslint(prefer-const)` / `typescript(TS2339)` — a `hella/rule` grep silently matches nothing and makes a firing rule look absent. (2) Oxlint's `prefer-const` reports at the DECLARATION line; eslint reported at the assignment, so legacy `// eslint-disable-next-line prefer-const` comments sit on the wrong line — suppressions must move above the declaration (`// oxlint-disable-next-line <rule>` is honored). (3) Warnings exit 0; only errors fail the gate — oxlint defaults emit several old-world eslint errors as warnings.

Also verified in the same port: `no-constant-condition` accepts `checkLoops: false` (parity holds); oxlint's default global set covers node/browser/`Bun` — no env/globals overrides needed; `vp lint --debug=files` prints the lint set (proves a file entered linting when a scoped rule stays silent); JS-plugin rules self-scope via `context.filename`.

# Evidence

Worktree probes, vite-plus lint migration (2026-10-16): probe grep `hella/` matched 0 while `hella(` matched 2 on the same scratch file; `packages/resource/lib/resource.ts` — legacy eslint comment at the assignment (line ~362) inert, oxlint error at the declaration (line 172), cleared by `// oxlint-disable-next-line prefer-const` above line 172; old eslint binary exited 0 on the file oxlint flagged; `do…while (true)` sites clean under `["error", { checkLoops: false }]`; full-repo lint green with zero `no-undef` and no globals overrides.
