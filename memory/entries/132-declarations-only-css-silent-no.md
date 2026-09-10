---
type: decision
title: "Declarations-only css() is a silent no-op that still pollutes cssText()"
description: An object with no selector keys passed to css() returns "", registers zero rules, fires no warning — and cssText() then carries the brace-less declarations as garbage text.
tags: [css, docs]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [declarations-only-css, css-silent-no-op, csstext-garbage, css-example-authoring]
---

# Why

`css()` only emits rules for selector-keyed objects; a declarations-only object (the `style()` input shape) emits brace-less text that `registerText`'s brace-depth-0 split turns into zero rules. Nothing warns: no `<style>` element, no injection, no error. Worse, the emitted text is still the `injectedMap` key, so `cssText()` serves invalid fragments (`background:blue;color:white`) to any SSR head that renders it. Doc examples and audits that show `css({ color: 'red' })` are silently broken — the audit that caught resetcss.mdx shipped exactly this bug in two published examples. When a css-package example styles one component flavorlessly, that call is `style()`, not `css()`; `css()` input starts at a selector key.

# Evidence

Empirical, worktree plans-css-audit-docs, 2026-09-10 (`bun -e` against `packages/css/lib/index.ts`): `css({ background: 'blue', color: 'white' })` returned `""` and `cssText()` returned `"background:blue;color:white"` (zero rules). The `style()` form returned `h-btn-12544n9` with `cssText()` = `".h-btn-12544n9{background:blue;color:white}"`. Mechanism: `process(obj, "", true)` emits brace-less text for a selector-less root; `internal/injection.ts` `registerText` splits at brace depth 0 → zero rules, no warning. Fixed in `packages/css/docs/api/resetcss.mdx` (plan set css/audit/docs unit 03).
