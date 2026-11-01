---
title: Mount compiled registry parts directly in test render helpers; never wrap in a div
description: A compiled registry part returns a mark()ed template build — mount() it as the mount root so container.firstElementChild is the part itself; wrapping it in `<div>{rendered}</div>` makes the wrapper the firstElementChild and every data-slot/handler assertion reads the wrong node.
tags: [ui, registry, testing, mount, template-build, isTemplate, renderPart]
confirmed: 2026-10-31
---
# Why

Compiled registry components (and headless factory parts) return `mark()`-ed build
functions; `component()` flags plain function results `isTemplate: true`, but the raw
compiled export carries only the mark. A test helper that mounts the result as the mount
root gets the built element as `container.firstElementChild`; a helper that wraps it
(`<div>{rendered}</div>`) gets the wrapper div instead — `data-slot` reads null and
dispatched clicks never reach the part's handler. Several ui test files carry an
`"isTemplate" in rendered ? rendered : <div>{rendered}</div>` ternary in their
`renderPart` helper: the template-build branch is the LIVE path for every compiled part
(they are all template builds), not dead code — deleting it or wrapping unconditionally
breaks part-level suites while root-level suites stay green.

# Evidence

`packages/dom/lib/component.ts` — plain fn results flagged `build.isTemplate = true`
(read 2026-10-31); `packages/dom/lib/internal/utils.ts` — `isTemplateBuild`. Probe:
wrapping the compiled `AlertDialogHeader` result mounts
`<div><div data-slot="alert-dialog-header" ...>` so `firstElementChild.getAttribute`
returns null while `container.innerHTML` holds the part; direct `mount(rendered,
container)` returns the part node. Fix verified green: `vp run coverage ui` exits 0,
69 files / 1868 tests (2026-10-31).
