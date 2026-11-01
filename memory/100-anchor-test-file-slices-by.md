---
title: Anchor test-file slices by content, not line numbers from another snapshot
description: When splitting a file by line ranges, compute every span from the SAME snapshot you slice, treat the final test before a closing brace as having no blank-line buffer, and verify moved bodies by name-keyed diff, never by line arithmetic.
tags: [refactoring, test-splits, line-slicing, git-index, byte-identity]
confirmed: 2026-10-31
---
# Why

Three failure modes recur when a suite is split into sibling files by line spans, and all three surfaced in one run while splitting the ui test suites:

1. The span formula `end = nextStart - 2` (assuming a blank separator line before the next mark) silently cuts one line off the FINAL test in a describe block — the last test is followed directly by the block's closing `});` with no blank line, so the end must be `closeLine - 1`. Symptom: a lost closing `  );` / `}` at the tail of the moved block.
2. Line numbers taken from one snapshot (a `rg`/read of the working tree) do not match another snapshot (`git show :path`, the staged index) whenever earlier work left unstaged deltas — the staged copy can differ by import-block lines, shifting every helper-block slice into junk or cutting a function's closing brace. Anchor slices on content (comment lines, declaration starts, brace-balanced walks to a closing line), not on numbers imported from a different read.
3. Extract-and-diff verification must key test bodies by NAME against the pre-split text and treat the extractor's own boundary as suspect: a last-in-file test's captured tail includes the describe close (and, in the original, the following describe header), which shows up as a phantom diff that is not a content change.

# Evidence

Observed 2026-10-31 splitting `packages/ui/tests` over-cap suites into sibling files: the last-test cut dropped `  );` from `dropdown-menu.test.ts`'s final test; a helpers-block slice built from working-tree line numbers on an index whose import block differed produced 10 junk head lines and a missing function brace in two `helpers.ts` files; the name-keyed extract-and-diff harness (bodies from `^  test` marks to the next mark or the last `\n});`) reported 0 real diffs across 217 moved test bodies once boundary artifacts were excluded. Final gate: `vp run coverage ui` exit 0 (85 files, 1892 tests), `vp run lint` exit 0.
