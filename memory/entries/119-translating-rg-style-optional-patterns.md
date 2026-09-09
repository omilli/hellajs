---
type: decision
title: Translating rg-style optional-? patterns into TS regex literals — one escape plus quantifier, never two escapes; seeded probes are the only net
description: In a TS regex literal `\??` is escape+quantifier (optional `?`); writing `\?\?` narrows the guard to the two-`?` form — green but blind, caught only by a seeded-violation probe.
tags: [toolchain, guards, regex]
timestamp: 2026-09-08
last_confirmed: 2026-09-08
triggers: [regex-literal-escape, seeded-violation-probe, guard-pattern-translation, optional-question-mark]
---
# Why

Plan deltas and `rg` patterns carry regex sources as text (`children\?\?: unknown`), where `\??` = escaped literal `?` + quantifier `?` = an OPTIONAL question mark. Pasting that into a TS regex literal as `/children\?\?:\s*unknown/` double-escapes: `\?` + `\?` = TWO literal question marks, so the guard only matches `children??: unknown` — a construct nobody writes. The guard stays green on the real tree and on the sweep, because the narrowed pattern matches nothing; only a seeded violating line per sub-check (one `children?: unknown` insert) exposes the blindness.

What breaks if ignored: future guard sub-checks translated from plan/`rg` patterns ship green-but-blind, and the convention they claim to police regresses silently — exactly the failure mode the seeded-probe DoD exists to prevent.

# Evidence

- Verified 2026-09-08 in the doc-conventions Unit 04 worktree: `/children\?\?:\s*unknown/.test("... { children?: unknown })")` → null while `/children\??:\s*unknown/` matches (`bun` eval); the seeded probe initially reported 5/6 findings, fixed to 6/6 after de-escaping (`scripts/doc-structure.ts` `CHILDREN_UNKNOWN_RE`, probe log `/tmp/probe2.log`).
- `new RegExp("children\\??:...")` (string form, single backslash) matched the same line the literal double-escape missed — the literal/string asymmetry is the trap.
