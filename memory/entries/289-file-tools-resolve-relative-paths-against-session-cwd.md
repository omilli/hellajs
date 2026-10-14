---
type: decision
title: File tools resolve relative paths against the session cwd, never the bash cd target
description: "In worktree runs, read/edit/write ignore bash's cd: give them absolute worktree paths or edits silently land in the main tree."
tags: [tooling, worktrees]
timestamp: 2026-10-14
last_confirmed: 2026-10-14
triggers: [worktree-run, file-edit, relative-path, main-tree]
---
# Why

A worker run executes inside `../hellajs-wt/<slug>/`, but the `read`/`edit`/`write` tools resolve relative paths against the session's working directory (the main tree), even when every `bash` call `cd`s into the worktree. An edit issued with a repo-relative path therefore mutates the main tree - exactly what the worktree protocol forbids (main-tree copies stay untouched until `bun merge`). The failure is silent: the edit succeeds, `git status` in the worktree shows nothing, and the first scoped test run runs stale worktree files. Ritual: absolute paths (`/home/milli/dev/hellajs-wt/<slug>/...`) for every file-tool call in a worktree run; when a stray main-tree edit is spotted, `cp` the edited files into the worktree and `git checkout HEAD -- <files>` in the main tree to restore purity. Symptom signature: scoped tests pass/fail against the wrong tree (test counts match the pre-edit files).

# Evidence

Session 2026-10-14 (worktree plans-dom-code-foreach-key-render-skip): three test-file edits issued as `packages/dom/tests/...` landed in `/home/milli/dev/hellajs/packages/...` while the bash-verified worktree stayed clean; the discrimination run in the worktree printed 79 pass / 0 fail (original files only). Fixed by `cp` main-tree edits into the worktree + `git checkout HEAD --` the three files in the main tree (`git status --porcelain` back to carries-only); absolute-path edits for the code fix behaved correctly.
