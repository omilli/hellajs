---
type: decision
title: Drive automated `bun plans` runs with a stdout-watching feeder, never pre-piped stdin
description: Piped-at-start stdin gets routed to steering and the dialog hangs; automated `bun plans` runs must answer on the `→ ` stdout tail via a feeder (`.plans-runner/feeder.ts` pattern).
tags: [scripts, automation]
timestamp: 2026-09-26
last_confirmed: 2026-09-26
triggers: [plans-runner, feeder, dialog-relay, steer-race, automated-bun-plans]
---
# Why

Automated runner runs (`bun worker` / `bun merge` / `bun audits` / `bun memory` → scripts/agent/driver.ts → scripts/agent/relay.ts `TerminalRelay`) are interactive by design: one shared stdin line-reader answers pending dialogs first, then routes `.stop` to abort and any other non-empty line to steering while an agent instance is active. Piping scripted answers at process start delivers the line milliseconds before any dialog exists — it is consumed immediately (steered if an agent is already active, dropped as idle otherwise); when the real dialog later renders, stdin sits at EOF and the run hangs at the `→ ` prompt until timeout. The fix is a feeder that mirrors the child's stdout and writes each scripted answer only when the stream tail after the last newline is exactly `→ ` (the relay writes that prompt without a trailing newline, so a fresh tail match is a reliable "answer now" signal; gate prompts via `askOrchestrator` render the same tail, so one feeder drives dialogs and the failure gate alike). Tail-matching also carries a known residual risk that a model text delta happens to end a chunk with `→ ` — accepted, never hit in practice.

# Evidence

- Hang: first probe attempt `printf '1\n' | bun plans --probe` aborted at timeout; `/tmp/plans-probe.log` shows the dialog rendered and the run stuck at `→ `, the answer already consumed as a steer.
- Fix verified: `.plans-runner/feeder.mjs` (gitignored scratch) mirroring stdout + answering on the `→ ` tail — probe exit 0 with `· tool ask_user_question done` in the stream (`/tmp/plans-probe3.log`); fixture runs A (`r`,`s` gate answers) and B (`h`) driven end-to-end through the same feeder with correct summaries and exit codes (`/tmp/plans-fixture-a.log`, `/tmp/plans-fixture-b.log`).
- Mechanism: `scripts/agent/relay.ts` `TerminalRelay.handleLine` (pending dialog → answer; `.stop` → abort; active agent → steer; idle → dropped) and `askOrchestrator`/`renderDialog` writing the `→ ` prompt via `process.stdout.write` with no trailing newline.
- Re-confirmed 2026-09-08 (merge-runner run): a fifo variant works when no feeder script is at hand — `mkfifo` stdin held open by a `sleep` writer (prevents EOF), poll captured stdout for the dialog title, then `echo 1 > fifo` answers; `coproc` fds do not survive non-interactive bash (read error 0). Two probes driven to exit 0 this way.
