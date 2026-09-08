---
type: decision
title: "Four canonical divergences separate runtime html`` output from compiled output: static flags, empty fields, joined string children, root-text fragment wrap"
description: "Runtime html`` vs compiled deep-equal only after a projection: drop static flags and empty props/children, coalesce adjacent string children, unwrap single-string `$` fragments."
tags: [arch, dom, babel, contract]
timestamp: 2026-09-06
last_confirmed: 2026-09-06
triggers: [html-parity-projection, compiled-vs-runtime-shape, root-text-fragment-wrap, static-children-join, canonical-projection]
---
# Why

Both paths produce DOM-equivalent trees but structurally different objects; a naive deep-equal between them always fails, and each divergence is intentional on its own side:

1. `static` flags: runtime `markIfStatic` tags zero-placeholder subtrees; compiled `hoistStaticSubtrees` hoists them as module consts. Same marker, different placement.
2. Empty `props`/`children`: runtime `parseHTML` materializes both (`props: {}`, `children: []`); `buildHellaNode` omits empty fields entirely (`<input type="text" />` compiles without a children key).
3. Adjacent string children: `vnode.mjs` joins all-StringLiteral children into one string (`<div>a</span>b</div>` compiles to `children: ["ab"]`); the runtime keeps `["a", "b"]`. Identical rendered text.
4. Root-level text: runtime `parseHTML` wraps bare root strings in `{ tag: "$", children: [str] }` (pinned by dom `html.test.ts` "root-level string wraps in fragment"); compiled emits the bare string.

Attribute mixed-content parts are NOT a fifth divergence — both sides concatenate to a single string (see entry 091).

# Evidence

- `plugins/babel/tests/parity.test.ts` `canonical()`: the projection implementing exactly these four normalizations; test.each over the 10-entry corpus (malformed recovery set + well-formed controls + slot-bearing void) deep-equals the projected runtime and compiled results, green under `bun test plugins/babel/tests` (256/0).
- Compiled join probe (2026-09-06): `transformJSX("const n = html\`<div>a</span>b</div>\`;")` → `{ tag: "div", children: ["ab"], static: true }`; runtime same template → `children: ["a", "b"]`.
- Runtime root-text wrap: `packages/dom/tests/html.test.ts` "root-level string wraps in fragment"; compiled `html\`<div>a</div>b\`` → `children: [{div}, "b"]` bare string (probe).
