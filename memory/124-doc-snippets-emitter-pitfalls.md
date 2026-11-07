---
title: doc-snippets emitter pitfalls - empty arrow bodies and inner-closer semicolons
description: "In tutorial tsx blocks, a context marker inside an arrow's parenthesized body (`use={(x) => (\\n //... \\n)}`) is a hard TS1109 (empty parens), and terminateStatements appends `;` after ANY line ending in `/>` or `</tag>` whose next line is not a continuation - including closers inside JSX children, where the semicolon parses as a valid text child."
tags: [doc-snippets, emit, tutorials, jsx, verification]
confirmed: 2026-11-07
---
# Why

`scripts/snippets/emit.ts::terminateStatements` scans for lines ending in `/>` or `</tag>` and appends a defensive `;` when the next non-empty line fails CONTINUATION_RE. It cannot distinguish statement-level closers from element closers inside JSX children, so `</span>` or `/>` followed by a sibling element gains a `;` text child - valid to parse (a stray-but-invisible trailing semicolon only matters cosmetically), but it shifts nothing structurally. The real syntax killer is different: an arrow body whose parentheses contain only a comment (`use={(todo) => (\n  //...\n)}`) leaves empty parens `()` and throws TS1109 "Expression expected". The marker must live in a JSX comment inside a valid expression, or the block must show a real element.

# Evidence

2026-11-07 todo tutorial pass: the emitted module failed TS1109 at exactly the `)} />` line of the `//...`-bodied ForEach in the Filtering section; replacing the empty body with `<li key={todo.id}>{/* ... same item markup as before ... */}</li>` cleared it. Probe: acorn+acorn-jsx parsed `<div><span>x</span>;\n<span>y</span></div>` clean, confirming the appended `;` after inner closers is valid JSX text; oxc (via hellajs-compiler transform) on the emitted module was the fastest balance oracle during diagnosis.
