---
type: decision
title: "Bare `{fn}` bindings are the house style for zero-arg calls — `{() => fn()}` wrappers were eradicated (2026-10-07): every consumption path calls function values with zero args, so the wrapper is a dead call frame"
description: Never write `{() => fn()}` for a zero-arg fn/signal — pass `{fn}`; dom/ssr call fn values with zero args in all three positions. Exceptions: member fns, optional-param handlers, mixed-string attrs.
tags: [style, dom, registry, docs-demos]
timestamp: 2026-10-07
last_confirmed: 2026-10-07
triggers: [arrow-wrapper-smell, bare-fn-binding, zero-arg-handler, signal-getter-prop, fn-child-region]
---

# Why

`{() => fn()}` allocates a closure that does nothing dom does not already do. Verified equivalence, per position:

- **Props (getter form)**: `mountNode`'s prop loop (`packages/dom/lib/internal/render.ts` `objectLoop(props, ...)` isFunction branch) registers an effect calling `value()` with ZERO args — a bare signal and a wrapper thunk are indistinguishable. The html/JSX transform passes both verbatim (`maybeReactive`'s top-level function guard never double-wraps; a bare identifier contains no call and passes unwrapped).
- **Children**: `resolveDeep` (`packages/dom/lib/internal/utils.ts`) calls every non-isDynamic function with zero args, and its isDynamic while-guard makes even signal-of-isDynamic-fn children identical; ssr's `walkChild` (`packages/ssr/lib/ssr.ts`) uses the same resolveDeep parity.
- **Event handlers** (`on:`/`e:`): the bare reference DOES receive the event the wrapper discarded — harmless iff the fn declares no params it reads (every registry handler is `(): void`; JS drops extra args).

`Signal<T>` (`packages/core/lib/types.d.ts`) is a dual-signature callable, assignable to `() => T` prop slots.

General-case exceptions (none present in this repo at eradication time): member fns (`() => obj.method()` → `obj.method` loses `this`), and handlers with read optional params (`toggle(force?)` would receive the Event). Mixed-string attrs (`class="a ${x} b"`) MUST keep call syntax — the concat stringifies a bare fn; only full-slot attrs (`attr="${fn}"`) accept the bare form.

# Evidence

- Empirical transform probe (2026-10-07, babel plugin): `data-state="${() => state()}"` → `"data-state": () => state()` vs `data-state="${state}"` → `"data-state": state` — both function-valued props.
- Sweep: 111 files (registry tsx/html, ui+ssr docs mdx, docs-site astro pages, dom tests, babel double-wrap fixture input changed to `fn(1)` to keep the guard tested without the shape), regenerated `docs/src/generated/install/` + `docs/src/components/ui/` via `bun bundle ui && bun install-sources` + the `add` vendoring command.
- Gates: `bun coverage ui` (2897 pass), `bun coverage dom` (575 pass), `bun test plugins/babel/tests` (246 pass), `bun doc-snippets` strict clean, full `bun lint` green; repo-wide `rg '\{\(\) => \w+\(\)\}'` → zero matches (memory/archive deliberately untouched — retired history).
