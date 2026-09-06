---
type: correction
title: "Torn git index after a failed nested git commit — phantom hash + mass staged deletions, files intact on disk: rm the index file and reset; plain `git reset` fails"
description: A failed nested git commit can tear the index (phantom hash, mass staged deletions, files intact) — diagnose with git ls-tree, recover by rm-ing the index file then git reset -q; plain reset fails.
tags: [process, git, tooling]
timestamp: 2026-09-06
last_confirmed: 2026-09-06
triggers: [torn-index, error-building-trees, phantom-hash]
---

# Why

When a nested `git add` + `git commit` (a hook's or a script's — any commit that runs from inside another git/tooling process) fails mid-flight, the index file can be written torn: truncated to a few KB, most entries missing (surfaces as hundreds of staged `D` entries even though every file exists on disk), and containing a garbage hash the repo's trees never referenced. Remaining nested-commit site in this repo: `scripts/release.ts` (`commit (--no-verify)` per `scripts/AGENTS.md`). Two traps:

- **`git fsck` misdirects** — it reports `missing blob <phantom>` because the *index* references it, which reads as object-store corruption. Discriminate before acting: `git ls-tree <recent-commit> <path>` — if every tree records a different (present) hash, the store is fine and only the index is corrupt. (This session: fsck said `missing ef0fa669`; `ls-tree` across `3ea1c7ff`/`fe0fdcb6`/`d0106c42`/`origin/v2` all recorded `eb3bf2b1` — index-only corruption.)
- **`git reset` fails first** — mixed reset two-way-merges the *current* index against the target tree and tries to read the phantom object: `fatal: unable to read <phantom>`. Recovery is deleting the index binary and resetting from the tree: `rm "$(git rev-parse --git-dir)/index" && git reset -q`. In a worktree the corrupt index is `<main-gitdir>/worktrees/<name>/index` (`git rev-parse --git-dir` from inside the worktree resolves it); the main tree's index is untouched.

After recovery, re-run or complete the interrupted script step manually — a script's success echo can fire unconditionally even when its nested commit died; never treat it as success evidence.

# Evidence

Session 2026-08-30 (worktree `hellajs-shadow-dom`, commit `d0106c42`): hook output interleaved `error: invalid object 100644 ef0fa669… for 'README.md'` / `Error building trees` with `Auto-committed CLAUDE.md and instruction file updates`; `git status --porcelain` then showed 736 `D` + 12 `RD` entries with every file present on disk; the index file measured 3,898 bytes; `git reset -q` failed `unable to read ef0fa669`; `rm` + `git reset -q` restored a clean status (3 `M` + 1 `??`); `git fsck --no-dangling` clean afterwards. Follow-up mirror commit `6d4d6d2f` completed the hook's interrupted work. (The mirror auto-commit hook that produced this incident was removed 2026-09-06 — `plans/root/config/remove-llm-mirror-sync.md`; the recovery procedure is mechanism-independent.)
