---
type: decision
title: "$-prefixed headings anchor to the $-stripped slug — link with #snapshot, never #$snapshot"
description: "github-slugger and the repo's headingSlug both drop `$` (non-word punctuation), so a heading `### $snapshot` anchors to `#snapshot`; a `#$snapshot` fragment never resolves."
tags: [docs, tooling, anchors]
timestamp: 2026-09-08
last_confirmed: 2026-09-08
triggers: [dollar-heading-anchor, slugger-strips-dollar, anchor-fragment, doc-structure-slug, dollar-prefix-api]
---

# Why

Both slug implementations strip characters outside `[\w -]`: `scripts/doc-structure.ts` `headingSlug` (`.replace(/[^\w -]/g, "")`, the lint:structure anchor-resolution guard's slugger) and Astro's default github-slugger on the docs site. `$snapshot` therefore slugs to `snapshot` — identical to the pre-rename heading's slug. A self-link written `[\`$snapshot()\`](#$snapshot)` fails the anchor-resolution guard (and 404s on the site); the fragment must be the stripped form `#snapshot`.

What breaks if ignored: any doc introducing a `$`-prefixed heading (store's `$snapshot`/`$update`/`$cleanup`/`$subscribe`, future `$`-prefixed APIs) copies the `$` into the fragment and ships a broken anchor; `bun lint:structure` catches it repo-wide, so the failure mode is a red guard mid-task, not silent rot.

# Evidence

Verified 2026-09-08 in the store $-prefix rename run: renamed `packages/store/docs/api/store.mdx` headings to `### \`$snapshot\`` etc. and kept fragments stripped (`[\`$snapshot()\`](#snapshot)`, `[\`$update()\`](#update)`) — `bun coverage store` green including lint:structure's anchor resolution; read `headingSlug` in `scripts/doc-structure.ts` (regex above). Slug stability is also why renamed headings keep their old in-bound anchors — no external link rot from the `$` rename.
