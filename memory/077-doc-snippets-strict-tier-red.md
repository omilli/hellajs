---
title: "doc-snippets strict tier is red on base: 6 pre-existing diagnostics in the headless toast page"
description: "As of 2026-01-29 `vp run doc-snippets` exits 1 repo-wide from 6 strict-tier TS parse diagnostics in the unmodified `packages/headless/docs/api/toast.mdx` promise-overload fence; a page-scoped pass means zero log lines for your page's emitted file, not a green tool exit."
tags: [doc-snippets, docs, verification, triage, headless, strict-tier]
confirmed: 2026-10-31
---
# Why

Any docs unit whose DoD says "`vp run doc-snippets` exits 0 for the edited page's blocks" hits a red tool exit even with a perfectly clean page, because the gate is repo-wide while the failures live elsewhere. Triaging this from scratch costs a full re-run plus log archaeology; the page-scoped pass criterion is: the run log contains no `.doc-snippets/strict/packages_<pkg>_docs_..._<page>_mdx.tsx` lines for your page. Fix or retire this entry when the 6 headless pages are repaired and the tool exits 0 again.

# Evidence

`vp run doc-snippets` in a v2-cut worktree, 2026-10-31: exit 1, "checked 142 docs, 676 blocks (19 strict, 93 tutorial findings)". All 19 strict diagnostics sit in `.doc-snippets/strict/packages_headless_docs_api_{toast,accordion,combobox,command,modal,slider}_mdx.tsx`; none of those files carried a worktree delta (git status clean vs base), so the failures reproduce identically on the base branch. The tutorial-tier findings (93) are informational per AGENTS.md §Scripts and never gate the exit code.
