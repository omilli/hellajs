---
title: Treat function-valued HellaChildren as fragment carriers and signal writes as synchronous drains
description: "resolveNode returns a carrier DocumentFragment for every function/signal child (so a bare signal ForEach item is multi-node, not single-root), and a signal write outside batch() drains scheduled effects synchronously - effects never see an explicit flush()."
tags: [dom, core, ForEach, resolveNode, signal, flush, fragments, reactive-regions]
confirmed: 2026-10-20
---
# Why

Planning DOM work from the `nodeType` of a resolved child without this fact mispredicts behavior twice. First, `resolveNode(value)` (`packages/dom/lib/internal/render.ts`) returns a detached carrier `DocumentFragment` holding the reactive region's persistent anchor for ANY function/signal value - a `use` renderer returning a bare signal is a multi-node region item, not a single node, so "items are elements or text nodes" contracts silently exclude live reactive-item returns that two keyed suites exercised. Second, `signal()` writes call `!batchDepth && flush()` (`packages/core/lib/signal.ts`) - outside `batch()`, scheduled effects run during the write statement itself, so a throw originating in an effect surfaces at the write line and a following bare `flush()` is a no-op. Tests that assert effect-time throws must wrap the write, not the flush.

# Evidence

`packages/dom/lib/internal/render.ts` `resolveNode`: `isFunction(value)` branch builds `anchor` + `carrier` fragment, registers the region effect on the anchor, returns `carrier` (read 2026-10-20). `packages/core/lib/signal.ts` line 76: `!batchDepth && flush(); // Process effects immediately unless batching`. Verified behaviorally 2026-10-20: with a throw at ForEach's fragment-item build check, `vp test packages/dom/tests/foreach-fragments.test.tsx` attributed the error to the `items([...])` write line; moving the assertion onto the write (`expect(() => items([...])).toThrow(...)`) went green.
