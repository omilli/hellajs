---
type: decision
title: Probe for a second live writer before mutating memory/ — concurrent pi sessions interleave KB writes
description: The KB has no write lock; before rebuild/prune/supersede/delete in memory/, check `ps` for another pi and entry mtimes newer than your last read — a mid-flight session's writes interleave with yours.
tags: [memory, orchestration]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [kb-concurrency, memory-writes, concurrent-sessions, writer-probe]
---
# Why

`memory/` mutations (rebuild, `prune --apply`, supersede, entry edits) carry no lock, and nothing stops two pi sessions running in the same main tree at once. AGENTS.md's live-instance rule scopes only `../hellajs-wt/` worktrees ("never run mutating commands in one you don't own") — main-tree KB concurrency is uncovered. The failure mode is silent interleaving: a rebuild landing between another session's `add` and its fill slugs the bare template into an active schema-violating entry; a prune can delete a file another session is mid-referencing; concurrent gap-fill `add`s collide on the same id.

Probe before mutating: `ps aux | rg -w pi` for a second session, and `ls -la --time-style=full-iso memory/entries/` for mtimes newer than your own last read. Anything live → defer writes and verify read-only.

# Evidence

- 2026-09-27 collision: this session's retroactive archive prune ran while a second instance (pi PID 177177, started 08:13) was mid-flight on the remote-removal memory pass — it wrote entries 206/122/154, two `add`s (one abandoned template, both gap-filling id 005), and log appends at 08:28:28–08:29:02, while this session's rebuild slugged the bare template into an active schema-violating entry (removed afterwards by the owning session).
- Detection signal that caught it: entry mtimes newer than in-session reads plus `ps` showing the second `pi`.
