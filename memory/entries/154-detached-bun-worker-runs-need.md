---
type: decision
title: Detached `bun worker` runs need a FIFO stdin — `/dev/null` wedges operator dialogs forever
description: Launch unattended `bun worker` runs with stdin on a held-open FIFO so relayed dialogs and failure gates can be answered later; `/dev/null` stdin wedges the run forever.
tags: [worker, orchestration]
timestamp: 2026-09-18
last_confirmed: 2026-09-18
triggers: [worker-unattended, dialog-stdin, bun-worker-detach, operator-gate]
---
# Why

The runner relays every pi `ask_user_question` and orchestrator gate to stdin (`TerminalRelay.startStdin` reads line-by-line; a line answers the pending dialog — select dialogs accept leading integers, exact option strings are the safe contract). A run launched `nohup bun worker … &` from a non-interactive shell gets `/dev/null` stdin: the first load-bearing fork (foreign failure, plan gap, failure gate) blocks forever with no way to answer — `/proc/<pid>/fd/0` confirmed `/dev/null` on a wedged run. Recovery is kill + relaunch with a writable channel: `mkfifo /tmp/wfifo && (sleep infinity > /tmp/wfifo &) && nohup bun worker <set> < /tmp/wfifo > log 2>&1 &` — the keeper holds the write end so the reader never sees EOF, and any later shell answers with `printf '<option>\n' > /tmp/wfifo`. Ticks are durable across the restart; the fresh instance resumes at the first unticked task. (For phone-side operation `bun remote` renders the same gates as panel cards.)

# Evidence

Unit 15 execution session: run 1 (nohup, /dev/null stdin) reached the gate, printed a foreign-red fork dialog, and wedged — `/proc/29062/fd/0 -> /dev/null`; after kill + FIFO relaunch the identical fork re-fired and `printf '1\n' > /tmp/ui15-fifo` resolved it; the run completed (`15-ui-demos-inline-astro-pages.md done`, attempt 1). Relay mechanics: `scripts/agent/relay.ts` `startStdin`/`TerminalRelay.ask` (leading-integer parsing noted in `ask`'s docstring).
