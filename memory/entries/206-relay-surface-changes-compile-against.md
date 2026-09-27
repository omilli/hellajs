---
type: correction
title: Relay-surface changes compile against six consumer files - four makeRelay runner sites, merge/gate.ts, and web-relay.ts - rg the surface, never trust a plan's Files list
description: Retyping the Relay surface (scripts/agent/relay.ts) compiles against four runner sites, merge/gate.ts, and web-relay.ts - measure with rg, never trust a plan's Files list.
tags: [scripts, agent-driver]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [relay-interface, makeRelay, runner-retype, agent-driver-retype, web-relay]
supersedes: 123
---
# Why

The `Relay` interface (`scripts/agent/relay.ts`) is consumed by every orchestrator runner and both relay implementations, and the runner set drifts as entry skills gain scripts (`plans/run.ts` became `worker/run.ts`; `memory/run.ts` was added later). Every consumer now annotates `relay: Relay` via a direct `type { Relay }` import (the old inference-from-`makeRelay()` shape is gone), and `agent/web-relay.ts` implements the interface — a retype lands as compile errors in each of them. `remote/probe.ts` drives `makeRelay()` dynamically over RPC: not type-checked, but behaviorally coupled. A plan's Files list that measures the blast radius by memory (or a stale grep) lists only the obvious pair and lands the retype half-done — tsc then surfaces the missed files one red round at a time. Root AGENTS.md §Method already mandates the repo-wide `rg` before changing a shared symbol; the trap is trusting a plan's quoted measurement over running the sweep.

# Evidence

- Verified 2026-09-26: `rg -n 'makeRelay|type Relay|implements Relay' scripts/` — `scripts/worker/run.ts` (makeRelay ×2, `askGate`, `runUnitWithGate`), `scripts/memory/run.ts` (makeRelay, `askGate`), `scripts/audits/run.ts` (makeRelay, `askGate`, `runSectionWithGate`), `scripts/merge/run.ts` (makeRelay, `askComponentGate`, `mergeComponent`), `scripts/merge/gate.ts` (`type { Relay }` import, `askFixGate`, `unionGate`), `scripts/agent/web-relay.ts` (`WebRelay implements Relay`, line 76), `scripts/agent/driver.ts` (`makeRelay()` at line 86, TerminalRelay + WebRelay fan-out under `HELLAJS_REMOTE`), `scripts/remote/probe.ts` (drives makeRelay via embedded RPC string — behavioral only). `scripts/plans/` no longer exists.
- Supersedes 123: its `plans/run.ts` reference is gone and its "annotate `relay: TerminalRelay` via inference from `makeRelay()`" mechanism no longer matches source — gate files import `type { Relay }` directly.
