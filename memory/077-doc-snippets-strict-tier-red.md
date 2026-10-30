---
title: "doc-snippets strict tier is red on base: 18 pre-existing diagnostics in 8 headless docs pages"
description: "As of 2026-11-20 `vp run doc-snippets` exits 1 repo-wide from 18 strict-tier TS diagnostics in 8 unmodified packages/headless/docs/api/*.mdx pages; a page-scoped pass means zero log lines for your page's emitted file, not a green tool exit."
tags: [doc-snippets, docs, verification, triage, headless, strict-tier]
confirmed: 2026-11-20
---
# Why

Any docs unit whose DoD says "`vp run doc-snippets` exits 0 for the edited page's blocks" hits a red tool exit even with a perfectly clean page, because the gate is repo-wide while the failures live elsewhere. Triaging this from scratch costs a full re-run plus log archaeology; the page-scoped pass criterion is: the run log contains no `.doc-snippets/strict/packages_<pkg>_docs_..._<page>_mdx.tsx` lines for your page. Fix or retire this entry when the 8 headless pages are repaired and the tool exits 0 again.

# Evidence

`vp run doc-snippets` in a v2-cut worktree, 2026-11-20: exit 1, "checked 139 docs, 677 blocks (18 strict, 93 tutorial findings)". All 18 strict diagnostics sit in `.doc-snippets/strict/packages_headless_docs_api_{toast,combobox,command,message-scroller,modal,scroll-area,slider,toggle-group}_mdx.tsx`; none of those files carried a worktree delta (git status clean vs base), so the failures reproduce identically on the base branch. The tutorial-tier findings (93) are informational per AGENTS.md §Scripts and never gate the exit code.
