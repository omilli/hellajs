---
title: Stash by pathspec and pop by explicit ref in a worktree; git stash is shared with the main tree
description: git stash is one stack per repository, shared by every linked worktree; inside a component worktree stash by explicit pathspec, check the push exit status, and pop only after confirming the top entry is yours.
tags: [git, stash, worktree, safety, discrimination]
confirmed: 2026-11-25
---
# Why

`git stash` is a single stack per repository. Inside a component worktree a `stash` / `stash pop` pair looks local, but both operate on the user's global stack: a push that fails or is skipped followed by a blind `pop` applies the user's newest stash to the worktree, and `git stash list` there shows every pre-existing entry from other branches. The pathspec form also confines the stash to the named files, leaving the rest of the index (a staged rename, other edits) exactly as it was.

# Evidence

2026-11-25, in a linked worktree under `../hellajs-wt/`:

    git stash push -m "<label>" -- packages/<pkg>/lib/style.ts packages/<pkg>/lib/removeStyle.ts   # exit 0
    git --no-pager stash list

listed the new entry at `stash@{0}` above twelve pre-existing user entries (`WIP on v2`, `bench perf fix authored on detached 648a2747`, `WIP on master`, ...); after `git stash pop` the twelve remained and `git status --porcelain` showed the staged `R ` rename untouched beside the restored ` M` files. `git rev-parse --git-common-dir` from the worktree resolves to the main tree's `.git`, so `refs/stash` is common to both.
