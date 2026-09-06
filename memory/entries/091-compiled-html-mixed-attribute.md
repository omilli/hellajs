---
type: decision
title: "Compiled html`` mixed-attribute interpolation emits `+` concatenation, never runtime parts arrays; runtime parity is clone-time concatenation"
description: Compiled html`` folds mixed-attribute parts into `+` concatenation — runtime parity is clone-time concatenation (concatParts); judging from the parser layer alone yields a false parity model.
tags: [arch, dom, babel, contract]
timestamp: 2026-09-06
last_confirmed: 2026-09-06
triggers: [mixed-attr-concatenation, compiled-html-parity, attr-parts-array, babel-builder-concat]
---
# Why

Two layers on the compiled side disagree about shape. `parsers/attributes.mjs` `parseAttributes` returns a parts array (`["btn ", { __slot: 0 }]`) for mixed-content attribute values — the same shape the runtime parser (`parseAttrValue` in `packages/dom/lib/internal/template.ts`) now stores in the cached AST. But that array never survives compilation: `processors/attributes.mjs` `processComponentAttributes` routes array values through `componentNodeToBabel`, whose array branch builds a `binaryExpression("+")` chain. Compiled output for `html`<div class="btn ${x}">x</div>`` is `props: { class: "btn " + x }` — one concatenated string at runtime, no separator.

Ignoring this forks runtime and compiled semantics. Storing the parts array as the prop VALUE (the tempting "mirror the parser shape" move) sends it through `renderProp`'s array branch (`value.filter(Boolean).join(" ")`), rendering `"btn  active"` (double space: template's trailing space + join separator) where the compiled path renders `"btn active"` — a silent parity break, worse than the original bug it was fixing. Correct shape: parts array lives only in the cached pre-clone AST (so `markIfStatic` can scan elements for `{ placeholder }` markers and per-invocation values substitute), then `cloneWithValues`' props path concatenates the cloned parts (`concatParts`, no separator, `String()` coercion matching `+` semantics).

General trap: tracing a compiled-path claim stops at the parser layer. Verify through the CONSUMING builder (`builders/ast.mjs` + `processors/attributes.mjs`) — or run a transform probe — before modeling runtime behavior on it. (A plan contract in plans/dom/code/audit-findings/template-parser.md carried exactly this false premise and had to be amended mid-run.)

# Evidence

- `plugins/babel/src/parsers/attributes.mjs` `parseAttributes` — parseTextContent fallthrough produces the parts array (parser layer only).
- `plugins/babel/src/processors/attributes.mjs` `processComponentAttributes` — `Array.isArray(value)` branch calls `componentNodeToBabel`.
- `plugins/babel/src/builders/ast.mjs` `componentNodeToBabel` — array branch builds `binaryExpression("+")` over parts (comment says "Handle arrays (mixed content in attributes)").
- Transform probe (2026-09-06, `transformJSX` from `plugins/babel/tests/helpers.ts`): `html`<div class="btn ${x}">x</div>`` → `{ tag: "div", props: { class: "btn " + x }, children: ["x"] }`; `title="n-${n}-of-3"` → `"n-" + n + "-of-3"`.
- Runtime mirror: `packages/dom/lib/internal/template.ts` — `parseAttrValue` (exact-single-slot fast path, no-slot literal, else parts array), `cloneWithValues` props path + `concatParts`, `markIfStatic` array element scan. `bun coverage dom` 419 pass / 0 fail, 100.00% lines; tests assert `class="btn active"` and `title="n-1-of-3"` exact.
