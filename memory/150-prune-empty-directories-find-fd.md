---
title: Prune empty directories with find, fd has no empty filter
description: "Empty-directory pruning after any tree reshuffle uses find -depth -type d -empty; fd rejects --empty with exit 2 and, under set -e, aborts the rest of the command."
tags: [shell, fd, find, directories]
confirmed: 2026-11-26
---
# Why

The tool table steers file lookup to `fd`, so an empty-dir prune reaches for `fd --type d --empty`. That flag does not exist: fd exits 2 (`unexpected argument '--empty' found`) and, inside a `set -euo pipefail` sequence, every command after it is skipped silently (a batch of `mv`s followed by the prune left the empty dirs behind and skipped the subsequent edits until re-run). `find <root> -depth -type d -empty -exec rmdir {} \;` removes nested empties in one pass (depth-first, so a child empties its parent before the parent is tested) and `rmdir` refuses non-empty dirs, so it cannot over-delete.

# Evidence

- `fd --type d --empty . plans` → exit 2, `error: unexpected argument '--empty' found` (2026-11-26).
- `find <root> -depth -type d -empty -exec rmdir {} \;` → pruned eleven vacated leaf folders plus their vacated parents in one pass; `fd . <root> --type d` afterwards listed only dirs holding files.
