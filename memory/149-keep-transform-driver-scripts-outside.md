---
title: Keep transform driver scripts outside a component worktree; worktree.mjs diff stages untracked files via git add -A
description: "worktree.mjs diff computes the baseline-relative patch after git add -A inside the worktree, so any untracked helper script left there is staged into the component delta the merge runner commits; write transform drivers to a path outside the worktree."
tags: [worktree, diff, git-add-A, untracked, scratch, scripts, merge]
confirmed: 2026-11-25
---
# Why

A multi-step python transform is far less error-prone written once to a file than retyped as a heredoc, but inside the worktree it becomes component delta: `diff`, and therefore the merge runner, would carry a throwaway driver into the committed delta. Outside the worktree it is invisible to `git add -A` and still runs as `cd <worktree> && python3 <path>`.

# Evidence

`.agents/skills/worker/scripts/worktree.mjs`: `baselineDiff` runs `git -C <wt> add -A` before `git diff <baseline>` (read 2026-11-25). A docs-link sweep's replay driver kept at `/tmp/wt-sweep.py` and invoked from the worktree root left `git status --porcelain` showing only the intended `.mdx` files.
