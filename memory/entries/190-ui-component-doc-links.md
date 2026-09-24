---
type: decision
title: Link sibling ui component docs through /components/<name>, never /learn/concepts/<name>
description: In packages/ui concept mdx, sibling-component cross-references resolve only as /components/<name> (the demo astro pages); /learn/concepts/<name> is core concepts only and fails bun doc-links.
tags: [docs, ui, links]
timestamp: 2026-09-22
last_confirmed: 2026-09-22
triggers: [concept-page-crossref, component-doc-link, doc-links-guard]
---
# Why

The docs site registers ui component docs under `docs/src/pages/components/<name>.astro` (self-contained demo pages), while `/learn/concepts/*` holds only the core framework concept wrappers. A concept mdx linking a sibling component the natural-looking way (`[Combobox](/learn/concepts/combobox)`) produces a dead site URL; `bun doc-links` (check: internal site URL matches an `.mdx` under `docs/src/pages/`) fails it after the fact. Writing the `/components/<name>` form directly skips the guard-fail-fix cycle on every future component unit.

# Evidence

`bun doc-links` exited 1 twice on `packages/ui/docs/concepts/command.mdx` ("`/learn/concepts/combobox` matches no page under docs/src/pages"); after rewriting both links to `/components/combobox` and `/components/dialog`, `bun doc-links` printed "No doc-link export mismatches or missing pages found" (same session). Registry: `docs/src/nav.ts` components array maps to `docs/src/pages/components/*.astro` only.
