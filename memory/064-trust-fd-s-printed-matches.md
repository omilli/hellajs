---
title: Trust fd's printed matches, never its exit code
description: fd exits 0 whether or not a pattern matched, so collision and existence probes must read the printed lines, not the exit status.
tags: [discovery, fd, exit-codes, probes, file-lookup]
confirmed: 2026-10-30
---
# Why

Reading `$?` after an `fd` probe suggests "no results" and "results found" are distinguishable — they are not on this install (fd prints matches and exits 0 either way, including for patterns matching nothing). A basename-collision probe for a new test file (the `memory/063-never-create-test-file-whose` class of check) that reads the exit code can conclude "safe" without ever having searched, or misjudge a hit. The printed lines are the only signal: empty output means no match.

# Evidence

2026-10-30, from the repo root: `fd 'zzz-nonexistent-xyz' packages/` printed nothing and exited 0; `fd 'tabs.test' packages/` printed two files and exited 0; `fd 'toast' packages/` printed nothing and exited 0. The calibration pair (known-present vs known-absent pattern) is the cheap ritual before trusting any fd-based existence claim.
