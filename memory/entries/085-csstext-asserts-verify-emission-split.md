---
type: decision
title: "cssText() asserts verify emission, not split outcomes — split correctness is observable only via cssRules"
description: cssText() asserts verify emission only — the collector joins pre-split injectedMap keys, so a corrupted rule split stays green; anchor split correctness on sheet cssRules counts, never the collector.
tags: [testing, css]
timestamp: 2026-09-02
last_confirmed: 2026-09-02
triggers: [csstext-assert, rule-split-test, registerText-split, green-non-covering-test]
---

# Why

`cssText()` returns the `injectedMap` **keys** — the full emitted text stored by `registerText` as the identity key, independent of how the text splits into per-rule `upsertRule` calls. An exact-form `expect(cssText()).toBe(...)` therefore verifies `process()` emission only: a corrupted split (truncated rule, dropped sibling rules, wrong `ruleCount`) leaves the key byte-identical and the assert green. Combined with 049 (happy-dom re-serializes `cssRules[i].cssText` unreliably), the trustworthy split observables are `sheet.cssRules.length` counts and — where 049 permits — `cssRules[i].cssText` spot checks. A test targeting split/registerText behavior that asserts only through the collector is a green non-covering test.

# Evidence

`packages/css/lib/internal/injection.ts` `registerText`: `injectedMap.set(qualified, { count: 1, ruleCount: rules.length })` — the key is the full text no matter how `rules` split; `packages/css/lib/cssText.ts` joins those keys (css/AGENTS.md §Files `cssText.ts`). Empirical (brace-safe-split unit, 2026-09-02): a draft escaped-quote test whose input's backslash decoded away (`\"` in a single-quoted literal) corrupted the split — the string state exited early, the rule truncated — yet the `cssText()` exact-form assert stayed green; eslint `no-useless-escape` exposed the stripped backslash. The landed `css.test.ts` brace-safety tests anchor split behavior on `getCssSheet().cssRules.length` (tests/helpers.ts) and keep exact-form asserts on the collector for emission only.
