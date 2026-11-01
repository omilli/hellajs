---
title: doc-snippets strict tier skips code blocks importing relative specifiers
description: `vp run doc-snippets` never typechecks concept-doc examples importing `./components/x` - EXTERNAL_IMPORT_RE treats every non-`@hellajs/*` specifier (relative ones included) as external, so ui/headless concept pages emit no strict module and their DoD reads "zero diagnostics attributed to the doc" trivially.
tags: [ui, docs, doc-snippets, sweep-mechanics, verification]
confirmed: 2026-10-31
---
# Why

Sweep units gating on `vp run doc-snippets` misread a clean result as "my example typechecked". It did not run: any fenced block whose imports include a relative specifier is dropped before emission, so `packages/ui/docs/concepts/{tabs,tooltip,...}.mdx` (examples import `./components/<name>`) produce no `.doc-snippets/strict/packages_ui_docs_*` module at all - only pages importing bare `@hellajs/*` or nothing (e.g. theming.mdx) get checked.

# Evidence

`scripts/doc-snippets.ts` `EXTERNAL_IMPORT_RE = /^import\s[^"']*from\s+["'](?!@hellajs\/)[^"']+["']/` matches `import { Button } from "./components/button"` (the negative lookahead only excludes `@hellajs/`), and `extractBlocks` `continue`s such blocks; its doc comment says "bare specifiers" but the regex also matches relative ones (read 2026-10-31, during the tooltip sweep unit). Emission observed: the strict run dir held no `packages_ui_docs_concepts_tooltip_mdx.tsx` and no tabs equivalent, while `packages_ui_docs_concepts_theming_mdx.ts` was present. The 19 strict-tier diagnostics across the sweep are all `packages_headless_docs_api_*` blocks (foreign, pre-existing). The comment/regex mismatch itself is a bug candidate routing to plan; until fixed, scope doc-snippets DoD evidence to "zero diagnostics attributed to <doc>.mdx" and never claim the skipped block typechecked.
