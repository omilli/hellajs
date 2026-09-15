---
type: decision
title: resource's api mdx mirrors the whole ResourceOptions interface
description: Any `packages/resource/lib/types/resource.d.ts` type change must sync the same line in the `docs/api/resource.mdx` ResourceOptions interface fence — a grep-blind typed-surface pair like dom's.
tags: [contract, docs, resource]
timestamp: 2026-09-15
last_confirmed: 2026-09-15
triggers: [resource-options, type-surface, doc-mirror, resource-d-ts]
---
# Why

`docs/api/resource.mdx` contains a full `ResourceOptions` interface mirror inside a typechecked fence, line-for-line with `lib/types/resource.d.ts`. There is no import edge between them, so `rg` for a renamed/retyped symbol finds both, but a diff-scoped search finds only the `.d.ts` — the mdx drifts silently and then contradicts source. Same hazard class as dom's `lib/types/nodes.d.ts` + `lib/types/attributes.d.ts` mirror pair. A plan that changes a resource option type must list the mdx mirror line in its Files (or its blast radius), or the worker must sync it as typed-surface "widen both or neither".

# Evidence

Hit this session (2026-09-15, resource nit-sweep unit 04): widening `onMutate` from `Promise<unknown> | unknown` to `unknown` in `lib/types/resource.d.ts:107` — the plan's Files and its Docs no-change conclusions missed `docs/api/resource.mdx:97`, which mirrored the exact old union; found by repo-wide `rg onMutate` and synced. Confirmed the fence is whole-interface, not an example snippet (lines ~55-104, closed by `}` + fence).
