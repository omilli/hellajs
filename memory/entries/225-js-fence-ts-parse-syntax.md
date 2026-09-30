---
type: decision
title: "Js-tagged doc fences fail doc-snippets on TS-only parse syntax — keep non-null assertions in the jsx block"
description: doc-snippets compiles js fences with checkJs false, so type errors vanish but parse syntax still fails — a non-null `!` in a js-tagged html fence raises TS8013; keep assertions in the jsx block.
tags: [docs, toolchain, doc-snippets]
timestamp: 2026-09-30
last_confirmed: 2026-09-30
triggers: [html-template-fence, non-null-assertion, ts8013-js-fence, doc-snippets-strict-tier, ui-concept-doc-html]
---

# Why

`scripts/doc-snippets.ts` compiles `LANGS_JS` fences (`js` tag) as JavaScript with `checkJs: false` (see 136 for the family split): type-level diagnostics are silenced, but parse-level TS-only syntax is not — a non-null assertion is a JS syntax error, so `form.errors().email!` inside a js-tagged html-template fence fails the strict tier with `TS8013: Non-null assertions can only be used in TypeScript files` even though nothing is type-checked. Authors porting a jsx example's accessor expressions into the html fence copy the `!` along and hit a red gate that 136's "js fences loosely" summary wrongly predicts away. The rule: js fences carry JS grammar only; drop the assertion (`[form.errors().email]` in the truthy branch is equivalent for the example) and keep the typed `!` in the doc's jsx block, which is strict-checked as TS and accepts it.

# Evidence

plans/ui/docs/component-docs-modernization unit 07 (2026-09-30): form.mdx's new `### html` fence carried `errors=${() => (form.errors().email ? [form.errors().email!] : [])}`; `bun doc-snippets` exited 1 with one strict diagnostic, `.doc-snippets/.../packages_ui_docs_concepts_form_mdx.js(18,60) TS8013`. Dropping the `!` in the js fence (jsx block keeps `form.errors().email!`) reran clean: exit 0, 158 docs, 734 blocks, 0 strict findings.
