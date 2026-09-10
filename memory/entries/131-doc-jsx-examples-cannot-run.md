---
type: decision
title: "Doc JSX examples cannot run verbatim under bun -e: cut the JSX tail, close and invoke"
description: "Root tsconfig jsx:react-jsx makes bun import react/jsx-dev-runtime for JSX snippets; mdx verification harnesses rewrite imports to lib, cut at `return (`, close and invoke."
tags: [toolchain, docs, verification]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [doc-example-extraction, bun-e-jsx, mdx-verify-harness, reactive-example]
---

# Why

Docs-verification DoDs (`plans/…/audit/docs/*`) require extracted mdx code blocks to run via `bun -e` against `./lib/index.ts`. Two structural facts block a verbatim run of JSX-bearing blocks:

1. Root `tsconfig.json` sets `"jsx": "react-jsx"`, and bun's transpiler honors it for any `.tsx`/JSX input — including ad-hoc probe files, which never pass through the hella babel plugin. The transform injects `react/jsx-dev-runtime`, which is not installed, and the probe dies before executing anything.
2. The block's imports (`@hellajs/css`, `@hellajs/core`) resolve through workspace links to package `dist/`, which fresh worktrees may not have built (css dist absent in `plans-css-audit-docs` at seed).

Working harness shape (verified): extract the fenced block verbatim; rewrite import lines to `await import('./lib/index.ts')` and sibling `await import('../core/lib/index.ts')`; cut at `  return (`; append `return <bound-var>;\n};` then invoke the component and log the bound values plus `cssText()`. The JSX markup is irrelevant to registration-contract assertions (class string, rule text), so dropping it loses no verification surface.

# Evidence

Verified 2026-09-10 in worktree `plans-css-audit-docs`, unit `plans/css/audit/docs/02-vars-reactive-example.md`:

- Failing form: `packages/css/jsx-probe.tsx` containing `const App = () => <div>hi</div>;` → `bun jsx-probe.tsx` → `error: Cannot find module 'react/jsx-dev-runtime'` (Bun v1.3.3, exit 1).
- Working form: vars.mdx Reactive CSS Variables block extracted via regex, imports rewritten to lib sources, JSX tail cut and component invoked → `class = "h-btn-oauhs2"`, `cssText()` = brace-balanced `.h-btn-oauhs2{…}` rule, exit 0 — the DoD tick's evidence.
- Companion facts: memory 056 (run `bun -e` from inside `packages/<pkg>`, never /tmp scratch), memory 079 (css returns "" everywhere; `style()` returns the class; `cssText()` is the collector).
