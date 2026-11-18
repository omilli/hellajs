---
title: "Treat the core env probes as internal: never reference them in user-facing docs or skills"
description: "hasWindow/hasDocument/hasNavigator stay barrel-exported for internal workspace use only; user-facing docs, the docs site, and the *-best-practices skills must not mention them."
tags: [core, env-probes, haswindow, hasdocument, hasnavigator, docs, skills, api-classification]
confirmed: 2026-02-06
---
# Why

The probes live in `packages/core/lib/internal/env.ts` and are re-exported from the barrel (`packages/core/lib/index.ts`) because sibling packages consume them through their own `lib/internal/core.ts` shims (`packages/dom`, `packages/css`, `packages/store`, `packages/resource`, `packages/router`) and `packages/core/tests/env.test.ts` exercises them. That makes them public-by-position but internal-by-contract: they carry no `docs/api/` page and are not enumerated in `packages/core/docs/index.mdx`. A user decision settled the classification: referencing them in user-facing surfaces teaches an API the public docs never define, so docs and skills must use documented exports or plain JS (`typeof window === 'undefined'`) instead. Browser-state pattern recipes in core docs follow the localStorage-pattern precedent: no server guard, seed initial values inside the effect.

# Evidence

User decision plus scrub, verified green: removed `hasWindow` from `packages/core/docs/patterns/reactivity.mdx` (Mirror Browser State pattern), removed the `hasDocument()` parenthetical from `packages/css/docs/api/css.mdx`, deleted the `env-probe-globals` rule from `.agents/skills/core-best-practices/rules/` (plus its `_sections.md` category row and all four SKILL.md references), regenerated the compiled skill AGENTS.md via `vp run skills-build core-best-practices`, and synced the core-best-practices row in root `AGENTS.md`. Guards after the scrub: `vp run skills-check`, `lint:structure`, `doc-links`, `em-dash`, `dead-exports` all exit 0; `doc-snippets` exit 1 is the pre-existing headless toast base-red, with zero diagnostics for the edited pages. Repo-wide rg confirms no probe references remain under `packages/*/docs`, `docs/src`, or `.agents/skills`.
