---
type: decision
title: Relay-surface changes touch five files - the three makeRelay runners plus merge/gate.ts, not just plans and merge
description: "Retyping scripts/agent/relay.ts's Relay surface touches plans/run.ts, merge/run.ts, audits/run.ts, and merge/gate.ts - measure with rg, never trust a plan's Files list."
tags: [scripts, agent-driver]
timestamp: 2026-09-11
last_confirmed: 2026-09-11
triggers: [relay-interface, makeRelay, runner-retype, agent-driver-retype]
---
# Why

The `Relay` interface (`scripts/agent/relay.ts`) is consumed by every orchestrator runner, and two of them type against it without naming it in prose: `scripts/audits/run.ts` and `scripts/merge/gate.ts` annotate `relay: TerminalRelay` parameters reached via inference from `makeRelay()`. A plan's Files list that measures the blast radius by memory (or by a stale grep) lists only the obvious consumers (`plans/run.ts`, `merge/run.ts`) and the retype lands half-done - tsc then surfaces the missed files one red round at a time. Root AGENTS.md §Method already mandates the repo-wide `rg` before changing a shared symbol; the trap is trusting a plan's quoted measurement over running the sweep.

# Evidence

- Verified 2026-09-11 (remote-control set, unit 02): the plan claimed "those two files' imports plus `agent/driver.ts` are the only `TerminalRelay` references in `scripts/`". `rg -n 'TerminalRelay' scripts/` after the retype found `scripts/audits/run.ts` (import + `askGate` + `runSectionWithGate`) and `scripts/merge/gate.ts` (import + `askFixGate` + `unionGate`) as well.
- Full consumer set at that commit: `scripts/plans/run.ts` (`askGate`, `runVenue`, `runUnitWithGate`), `scripts/merge/run.ts` (`askComponentGate`, `mergeComponent`), `scripts/audits/run.ts` (`askGate`, `runSectionWithGate`), `scripts/merge/gate.ts` (`askFixGate`, `unionGate`), all fed by `makeRelay()` from `scripts/agent/driver.ts`.
