---
type: decision
title: "Converting a doc fence js → jsx moves it into doc-snippets' strict tier — budget typed params, prop shapes, and family-scoped names"
description: doc-snippets checks jsx/tsx/ts fences strictly but js fences loosely (checkJs false); converting a fence js to jsx silently promotes it, so untyped params and js-family names start failing strict.
tags: [docs, toolchain, doc-snippets]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [js-to-jsx-fence-conversion, html-template-sweep, doc-snippets-implicit-any, fence-language-tag-change]
---

# Why

`scripts/doc-snippets.ts` splits a doc's fences by family: `LANGS_TS = {typescript, ts, tsx, jsx}` blocks concatenate into one strict-checked `.tsx` module; `LANGS_JS` blocks land in a sibling `.js` module compiled with `checkJs: false` ("JS examples are idiomatic-untyped by design"). Converting an html-template `js` fence to `jsx` (the §Example Syntax JSX-default sweep) therefore silently promotes the block from loose to strict:

1. Untyped params that were fine as js fail noImplicitAny: `(item) => <li key={item.id}>` needs `(item: { id: number; text: string }) =>`, untyped `element()` render `props` fall to `unknown` (TS2349 on `props.x?.()`), `signal([])` infers `never[]` and breaks the setter call (annotate `signal<T[]>([])`).
2. Cross-block names only chain within a family: a name imported or declared in a remaining js block does not reach the tsx module — the converted block must import what it uses (e.g. `ForEach`), and referenced-but-undeclared names (`FlakyComponent`) must be declared.
3. Attribute typing now applies: `null` is not a `HellaPrimitive` — a `() => string | null` getter needs `?? undefined` (or a default) at attribute positions.

Plan consequence: any html-syntax sweep DoD gating on `bun doc-snippets` must budget these annotations in its Strategy; they are not semantic drift, they are the strict tier's entry fee. See 078 for the literal-widening pitfalls inside the same tier.

# Evidence

plans/dom/audit/docs unit 01 (2026-09-10): converting 14 fences across 16 dom docs produced 7 strict diagnostics on first run, all in `packages_dom_docs_api_element_mdx.tsx` — TS2349 ×5 (untyped `props` getters), TS18046 ×2 (`item` unknown from an unannotated `use` param). Fixed by annotating render-fn props (extracted to named types per §Example Code Style), typing the `use` param, `signal<{ id: number; text: string }[]>([])`, and `props.avatar?.() ?? undefined`; hydration.mdx additionally needed a `ForEach` import the js family had inherited cross-block. Final `bun doc-snippets` exit 0, strict tier clean, block count 661 → 657 (4 collapsed fences). css/ssr/store/router docs still carry html-template js fences; their audit sweeps will hit the same promotion.
