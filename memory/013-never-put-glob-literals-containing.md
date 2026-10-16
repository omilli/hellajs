---
title: Never put glob literals containing star-slash in block comments
description: A glob like packages/*/dist or src/**/*.mjs written inside a /* */ or /** */ comment terminates the comment at the star-slash sequence and the formatter/parser dies with a confusing "Unexpected token" — spell globs out in prose in comments; globs belong in string literals.
tags: [lint, oxfmt, comments, jsdoc, globs, coverage]
confirmed: 2026-10-16
---
# Why

Any `*/` sequence closes a block comment, so glob literals (`packages/*/dist/*.js`, `plugins/**/*.mjs`, `**/*.{js,mjs}`) cannot appear in `/* */` or `/** */` text — the comment silently ends mid-glob and the remainder parses as code. The failure is doubly confusing because the reported error position lands lines after the real cause. Line comments (`//`) are unaffected. This bites constantly in this repo: scripts and configs are full of glob literals, and JSDoc prose naturally wants to quote them.

# Evidence

Reproduced and fixed in the vite-plus migration worktree, 2026-10-16: the rewritten head comment of `scripts/coverage.ts` quoted `packages/*/dist/*.js` and `plugins/**/*.mjs` inside its `/** */` block; `vp run lint` failed with `x Unexpected token` pointing at a line ~7 lines below the glob (`Formatting failed before analysis started`). Rewording the comment to prose ("top-level `dist` .js files plus `dist/internal`", "every plugin .mjs source") with the exact globs kept only in the `coverageFlags` string literals made `vp run lint` exit 0. The flags themselves are unaffected — only comments break.
