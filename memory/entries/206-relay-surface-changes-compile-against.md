---
type: correction
title: Relay-surface changes compile against five consumer files - four makeRelay runner sites and merge/gate.ts - rg the surface, never trust a plan's Files list
description: Retyping the Relay surface (scripts/agent/relay.ts) compiles against four runner sites and merge/gate.ts - measure with rg, never trust a plan's Files list.
tags: [scripts, agent-driver]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [relay-interface, makeRelay, runner-retype, agent-driver-retype, relay-surface-sweep]
---
# Why

The `Relay` interface (`scripts/agent/relay.ts`) is consumed by every orchestrator runner and the relay implementation, and the runner set drifts as entry skills gain scripts (`plans/run.ts` became `worker/run.ts`; `memory/run.ts` was added later). Every consumer now annotates `relay: Relay` via a direct `type { Relay }` import (the old inference-from-`makeRelay()` shape is gone), so a retype lands as compile errors in each of them. A plan's Files list that measures the blast radius by memory (or a stale grep) lists only the obvious pair and lands the retype half-done — tsc then surfaces the missed files one red round at a time. Root AGENTS.md §Method already mandates the repo-wide `rg` before changing a shared symbol; the trap is trusting a plan's quoted measurement over running the sweep. (The former `agent/web-relay.ts` consumer and its `remote/probe.ts` behavioral driver were removed with the remote daemon on 2026-09-27.)

# Evidence

- Verified 2026-09-27: `rg -n 'makeRelay|type \{ Relay \}|implements Relay' scripts/` — `scripts/worker/run.ts` (makeRelay ×2, `askGate`, `runUnitWithGate`), `scripts/memory/run.ts` (makeRelay, `askGate`), `scripts/audits/run.ts` (makeRelay, `askGate`, `runSectionWithGate`), `scripts/merge/run.ts` (makeRelay, `askComponentGate`, `mergeComponent`), `scripts/merge/gate.ts` (`type { Relay }` import, `askFixGate`, `unionGate`), `scripts/agent/driver.ts` (`makeRelay()` definition returning the terminal relay), `scripts/agent/relay.ts` (`TerminalRelay implements Relay`).
