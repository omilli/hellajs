---
type: decision
title: "A bare `{props.children}` sibling before a static element hydrates DUPLICATED: string children spread per-char, the hydrate pointer overshoots, and the trailing sibling re-mounts"
description: "Debugging an element that renders twice only after hydration: check the compiled children for `[...props.children, el]` with a string prop — switch the canonical slot to `{() => props.children}`."
tags: [arch, ui, registry, contract, ssr]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [duplicate-icon-hydration, props-children-string-spread, hydrate-pointer-overshoot, trigger-icon-twice]
---
# Why
The bare-member spread (`children.mjs` emits `...props.children` into the compiled children array)
is not just undefined/single-vnode-unsafe (entries 172/182/188) — with a STRING child it produces
one HellaNode child per character. `hydrateSequence` consumes static text positionally, so N chars
advance the DOM pointer past the server's trailing sibling (the icon svg); that sibling then
hydrates against `null` → "expected element node" mismatch warn → `replaceMismatch` mounts a fresh
copy → two identical icons per trigger. SSR HTML looks correct (chars concat back to the string);
only the hydrated DOM duplicates. The arrow slot `{() => props.children}` compiles to a marker-
bounded reactive region and is correct for every HellaChildren shape — same prescription as 188.

# Evidence
- Live repro (2026-09-27): docs `/ui/accordion` triggers carried two identical chevron svgs; curl
  SSR HTML had one per button → hydration-side duplication; six console warns
  "[dom] hydrate mismatch: expected element node" (one per trigger).
- Compiled pre-fix: `packages/ui/dist/registry/accordion/css/accordion.js` AccordionTrigger
  `children: [...props.children, { tag: "svg" ... }]` with `entry.trigger` a string.
- Fix applied to accordion.tsx, collapsible.tsx, input-otp.tsx (the only three
  `{props.children}`-before-sibling sites; rg-swept the registry); scratch ssr→hydrate test
  asserted 1 icon/trigger post-fix; `bun coverage ui` 2836 pass / 0 fail.
