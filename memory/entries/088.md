---
type: decision
title: Use non-colon em-dash rewrites inside wrapper frontmatter descriptions
description: "Unquoted YAML `description:` values cannot contain a colon-space pair, so the em-dash rewrite conventions' colon branch is unavailable there; use semicolon, parentheses, comma, or restructure instead."
tags: [docs, guides]
timestamp: 2026-09-06
last_confirmed: 2026-09-06
triggers: [em-dash-rewrite, typography-rule, frontmatter-description, wrapper-page]
---
# Why

The em-dash rewrite conventions (plans/root/docs/em-dash-eradication/index.md, later guides/docs.md §Typography) default `X — Y` definitional appositives to a colon. A docs-site wrapper page's `description:` value is an unquoted YAML plain scalar, and `description: X: Y` is invalid YAML ("mapping values are not allowed here"), which breaks frontmatter parsing for `bun lint:structure` and the Astro site build. Unit 04's typography rule must carry this caveat; any future wrapper-description edit that reaches for the colon branch invalidates the page it touches. Semicolon, parentheses, comma, and sentence-restructure branches keep the value one sentence, non-empty, and parseable.

# Evidence

`python3 -c "import yaml; yaml.safe_load('description: Variant recipes: typed variant props')"` fails with "mapping values are not allowed here" (verified this session). Unit 03 (plans/root/docs/em-dash-eradication/03-site-pages.md) rewrote 12 wrapper `description:` values using only semicolon/parentheses/comma/restructure branches; `bun lint:structure` passed ("Docs structure clean (190 mdx files, 5 checks)", exit 0).
