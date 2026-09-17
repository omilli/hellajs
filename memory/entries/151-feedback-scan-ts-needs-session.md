---
type: correction
title: feedback scan.ts needs a session file path when run from a worktree cwd
description: "feedback scan.ts fails with a no-session-dir error inside ../hellajs-wt worktrees; pass the session file path explicitly or report friction in lieu of the mechanical scan."
tags: [tooling, workers]
timestamp: 2026-09-18
last_confirmed: 2026-09-18
triggers: [worktree-feedback-scan, worker-completion-pipeline, session-dir-resolve]
---
# Why
Workers execute plan units inside component worktrees (`../hellajs-wt/<slug>/`), but the scan derives its session directory from the cwd and only maps main-tree session dirs. The completion pipeline's feedback step therefore cannot run mechanically from a worktree; discovering this mid-pipeline costs a round-trip. Alternatives: pass the session file path explicitly (if known), or evaluate the feedback trigger table directly from the session transcript and state the outcome in the report.

# Evidence
`bun .agents/skills/feedback/scripts/scan.ts` from `/home/milli/dev/hellajs-wt/plans-dom-code-dissolve-primitives` printed: `no session dir for cwd: /home/milli/.pi/agent/sessions/--home-milli-dev-hellajs-wt-plans-dom-code-dissolve-primitives-- — pass a session file path` (2026-09-18).
