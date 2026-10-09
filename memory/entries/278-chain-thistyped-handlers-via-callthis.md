---
type: decision
title: "Chain a this-typed handler with function + call(this), never a bare optional call"
description: "Forwarding a user on:* handler inside an owned one needs `on:click={function (e) { userClick?.call(this, e); owned(); }}` — the literal `userClick?.(e)` fails tsc (TS2684)."
tags: [ui, typescript]
timestamp: 2026-10-07
last_confirmed: 2026-10-07
triggers: [rest-attrs, event-handler, chain, jsx-attrs]
---
# Why

dom's `PrefixedEventHandlers` types every `on:*` as `(this: HTMLElement, event: E) => void`, and TS forbids calling this-parameter functions without a receiver (TS2684 "The 'this' context of type 'void' is not assignable"). An arrow wrapper also cannot re-expose the element (arrows have lexical this, and delegated handlers must not read `e.currentTarget` — it stays the body). A `function` expression in the JSX attribute position gets contextual `this: HTMLElement`, so `userClick?.call(this, e)` forwards the delegation receiver faithfully; guides/code.md sanctions function expressions exactly when the body needs its own this binding. In html`` template slots there is no contextual typing — annotate both: `function (this: HTMLElement, e: MouseEvent)`. `on:error` additionally unions `string`, so only chain the keys you destructure; avoid chaining by using `e:`-prefixed owned wiring where the keys can simply differ (avatar image load/error precedent).

# Evidence

`tsc -p tsconfig.lint.json` over the first rest-attrs pass: TS2684 at accordion/collapsible/tabs triggers, TS2349 at avatar (`string | ((this, event) => void)` not callable). Fixed forms in registry/{accordion,collapsible,tabs}/*.tsx (+html) → tsc exit 0, `bun coverage ui` exit 0 with the chain scenarios green (handler fired AND state toggled across all four variants).
