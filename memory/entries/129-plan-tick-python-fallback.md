---
type: decision
title: "Ticking plan DoD lines: fall back to python by-index after one exact-match failure"
description: "After one failed edit-tool oldText match on a plan DoD line, switch to a python heredoc rewriting lines by index with startswith asserts; do not retry reconstructed strings."
tags: [worker, tools]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [plan-tick, edit-tool-match, backslash-pattern, worker-completion]
---
# Why
Ticking `plans/css/audit/docs/06-docs-sweep.md`, three constructed oldText variants (edit tool x2, python substring x1) all failed to match a DoD line containing `class=\{\(\)`; a python heredoc that asserted `lines[n].startswith(prefix)` and replaced by index with author-controlled text worked first try. Long reconstructed oldText strings are fragile regardless of cause (escaping layers or composition slips); index-anchored replacement with asserts cannot silently tick the wrong line and does not depend on byte-exact reconstruction of existing prose.

# Evidence
Session 2026-09-10, worktree plans-css-audit-docs: edit tool rejected the oldText 2x ("Could not find edits[2]"), python `s.count(old) == 0` on a line later shown byte-identical by `repr`; the by-index rewrite with per-line `startswith` asserts succeeded first try (`rg -c '\[ \]'` exit 1 confirms zero unticked boxes). Caveat recorded honestly: root cause not isolated; the probe with identical escaping counts 1 against the rewritten line, so composition error is the likely culprit — which is exactly why index-anchored asserts (not reconstructed oldText) are the reliable path.
