---
type: decision
title: Hoist indexed-access tuple casts in tests into a type alias; bun's transpiler rejects them inline
description: An inline `as [A, B, T["k"][]` cast fails bun's parser (Expected "]" but found ")"); hoist `type Row = [A, B, T["k"]]` above the suite and cast `as Row[]`.
tags: [testing, bun]
timestamp: 2026-09-30
last_confirmed: 2026-09-30
triggers: [test-each, as-cast, indexed-access-type, parser-error, typed-tuple]
---
# Why

Bun's type-stripping parser mis-lexes an indexed-access type (`T["k"]`) followed by `[]` inside an expression-position `as` tuple cast, and the failure surfaces as a runtime parse error from `bun test` — not a tsc error, so typecheck gates never catch it. The same type in a type-alias position parses fine, and tsc accepts both forms. Existing inline casts over plain identifiers (`[Placement, number][]` in computeanchorposition.test.ts) parse because there is no indexed access; the bracketed key is the trigger.

# Evidence

`packages/dom/tests/onswipe.test.ts`: `] as [number, number, SwipeCommit["direction"][])(...)` produced three bun parse errors (`Expected "]" but found ")"` at the cast, then cascade). Hoisting `type SwipeCase = [number, number, SwipeCommit["direction"]];` above `describe` and casting `as SwipeCase[]` fixed it; 13 pass / 0 fail in the scoped run, then `bun coverage dom` exit 0 (548 pass / 0 fail, 2026-09-30).
