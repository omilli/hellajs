---
type: correction
title: eslint no-useless-assignment counts template-consumed writes as unused — delete the dead counter, don't reform it
description: A variable whose written value is never read by a subsequent statement flags no matter the form — `++x`/`+=`/`x = x + 1` consumed only by the enclosing interpolation all flag; delete the state.
tags: [eslint, linting]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [no-useless-assignment, sonner, lint-fix, dead-store]
---
# Why

The rule tracks the WRITTEN value's subsequent reads, not the assignment expression's own result — a same-statement consumption (template interpolation) never satisfies it. When a counter's final value has no consumer, every reform (`(x += 1)`, `(x = x + 1)` inline) stays flagged; exhausting enumerated fallbacks means the state itself is dead. Runtime-identical deletion (constant fold: `let n = 0; `t${++n}`` → `"t1"`) beats laundering the store into an artificial statement form; never eslint-disable.

# Evidence

sonner canonical: `let toastInstanceCount = 0; const INSTANCE = \`t${++toastInstanceCount}\`;` flagged at the `++` (76:24); compound `+=` form flagged again (76:23); explicit `= toastInstanceCount + 1` form flagged again — three scoped `bunx eslint packages/ui/registry/sonner` runs. Resolution `const INSTANCE = "t1";` (every module copy computed `0++ → 1`) → `bunx eslint packages/ui/registry` exit 0.
