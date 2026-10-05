---
type: correction
title: A `continue` in a lib/ cached while loop must re-increment the index first — trailing `i++` is skipped and the test suite hangs
description: "`continue` inside the canonical cached while loop skips the trailing `i++`; restructure to `i++; continue;` (or if/else) or the loop spins forever and the test run times out instead of failing."
tags: [arch, contract]
timestamp: 2026-10-05
last_confirmed: 2026-10-05
triggers: [continue-guard, cached-while-loop, test-timeout, infinite-loop, ssr-props-loop]
---
# Why

The guide's canonical loop form puts `i++` at the END of the while body. Any
`continue` added into that body silently bypasses the increment — there is no
error, the loop just never advances. The failure surfaces as a hung `bun test`
(timeout), which reads like infra flake, not a code bug, inviting
symptom-patching or gate-skipping instead of a one-line fix.

# Evidence

`packages/ssr/lib/ssr.ts` `ssrImpl` props loop: adding a prefixed-key skip as
`if (startsWith(...)) continue;` hung `bun test packages/ssr/tests/ssr.test.ts`
(60s+ timeout, twice); fixing it to `i++; continue;` with the same assertions
greened the file (47 pass) in 149ms. Rule source: `guides/code.md` §Loops
canonical form.
