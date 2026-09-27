---
type: decision
title: No in-repo remote/phone-control daemon - removed deliberately, reach for external tooling instead
description: The remote daemon (bun remote) and its agent-side web relay were removed on purpose - do not rebuild or re-propose phone-control infrastructure inside the repo.
tags: [scripts, orchestration]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [remote-daemon, phone-control, web-relay, bun-remote]
---
# Why

The remote script (`scripts/remote.ts` + `scripts/remote/`: WS daemon, web panel, run supervision, pi chat sessions, ntfy push) and the agent-side consumer half (`scripts/agent/web-relay.ts`, `FanOutRelay` in `driver.ts`, the `HELLAJS_REMOTE*` env trio) were removed 2026-09-27 by explicit user decision: the daemon was overly buggy, and phone-control functionality should come from an external solution if ever needed again. Terminal stdin (`makeRelay()` → `TerminalRelay`) is the only dialog surface.

# Evidence

- User statement 2026-09-27: "nuke the remote script, it's overly buggy and if I want that functionality I'll use some other solution" (scope confirmed in-session: both the daemon and the web-relay consumer half).
- Deletion executed the same session: `git status` shows `scripts/remote*` and `scripts/agent/web-relay.ts` deleted; repo-wide `rg 'HELLAJS_REMOTE|WebRelay|scripts/remote|bun remote'` (memory excluded) returns nothing; `makeRelay()` in `scripts/agent/driver.ts` returns the terminal relay only.
