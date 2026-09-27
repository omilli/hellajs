---
type: correction
title: Link sibling ui component docs through /ui/<name>, never /learn/concepts/<name>
description: In packages/ui concept mdx, sibling-component cross-references resolve only as /ui/<name> (the demo astro pages); /learn/concepts/<name> is core concepts only and fails bun doc-links.
tags: [docs, ui, links]
timestamp: 2026-09-27
last_confirmed: 2026-09-26
triggers: [concept-page-crossref, component-doc-link, doc-links-guard]
---
# Why

The docs site registers ui component docs under `docs/src/pages/ui/<name>.astro` (self-contained demo pages; section renamed from `components/` to `ui/`, 2025-session), while `/learn/concepts/*` holds only the core framework concept wrappers. A concept mdx linking a sibling component the natural-looking way (`[Combobox](/learn/concepts/combobox)`) produces a dead site URL; `bun doc-links` (check: internal site URL matches an `.mdx`/`.astro` under `docs/src/pages/`) fails it after the fact. The old `/components/<name>` form is now a guard tripwire: still classified internal, resolves to no page, fails loudly. Writing the `/ui/<name>` form directly skips the guard-fail-fix cycle on every future component unit.

# Evidence

2025-09-24 rename session: all sibling links in `packages/ui/docs/concepts/{command,alert-dialog,breadcrumb}.mdx` rewritten `/components/…` → `/ui/…`; `bun doc-links` green after. Tripwire probe: a temporary `](/components/button)` link failed the guard with "`/components/button` matches no page under docs/src/pages". Registry: `docs/src/nav.ts` `ui` array maps to `docs/src/pages/ui/*.astro` only (`bun lint:structure` registration check enforces both directions).
