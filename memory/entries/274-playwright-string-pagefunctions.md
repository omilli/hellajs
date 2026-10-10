---
type: decision
title: "Playwright string pageFunctions are expressions: self-invoke or they silently no-op"
description: "addInitScript/page.evaluate with a string source evaluates it as a plain expression — an arrow-function string is created and discarded silently; wrap in an IIFE with the payload baked in as JSON."
tags: [scripts, playwright]
timestamp: 2026-10-07
last_confirmed: 2026-10-07
triggers: [playwright-driver, in-page-code, string-expression]
---
# Why
A function-expression string passed to `addInitScript`/`evaluate` parses fine, returns a
function, and never runs — the failure is SILENT (an init script that never sets state, an
evaluate that returns `undefined`). Only function VALUES passed from Node are auto-invoked;
string sources are not. bench's driver wraps its in-page timing expression in an IIFE for
exactly this reason. Args cannot ride a string source either — bake them into the source via
`JSON.stringify`.

# Evidence
bun parity harness (scripts/ui-parity/): `addInitScript("() => { localStorage.setItem(\"theme\", \"dark\"); }")`
left `localStorage.theme` null and shadcn in light mode; the IIFE form
`"(() => { localStorage.setItem(\"theme\", \"dark\"); })();"` set `dark:true` (probed live,
2026-10-07). `page.evaluate` with a bare `([selector, styleProps]) => {...}` string returned
`undefined` ("undefined is not an object (evaluating 'raws.length')"); the self-invoking form
`(${SRC})(${JSON.stringify(payload)})` returned the tree. Contract now documented at
scripts/ui-parity/tree.ts + scripts/ui-parity/capture.ts.
