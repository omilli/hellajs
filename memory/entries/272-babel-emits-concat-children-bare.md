---
type: decision
title: Babel emits `[].concat(children…)` — bare `{props.children}` is contract-safe for every HellaChildren shape; dom splices nested array children in mount and hydrate
description: "The JSX pipeline's spread emission and dom's array-child drop are fixed: bare passthrough needs no arrow slot; arrow-wrap only genuinely dynamic/compound children."
tags: [arch, contract, ui, registry, babel, ssr]
timestamp: 2026-09-27
last_confirmed: 2026-09-27
triggers: [props-children-concat, bare-children-passthrough, nested-array-children-splice, children-emission-shape]
supersedes: 270
---
# Why
The bare-member spread (`children: [...props.children]`) was only correct for array children —
strings split per-character (duplicating trailing siblings under hydration), single vnodes and
nullish children threw. `buildChildrenValue` (`plugins/babel/src/builders/children.mjs`) now emits
the whole children list as one `[].concat(parts…)` call whenever a bare `{props.children}` is
present: arrays splice flat, strings/vnodes append as single children, nullish entries degrade.
Dom's engine matched ssr's array-children contract in the same pass: `appendToParent`
(`packages/dom/lib/internal/render.ts`) splices nested array children (the natural
`{items.map(…)}` JSX shape, previously silently dropped) and `hydrateSequence`
(`packages/dom/lib/internal/hydrate.ts`) recurses into array children positionally plus skips
null/undefined/false like ssr's walker. Consequence: bare `{props.children}` (jsx) and
`${props.children}` (html, static values) are the canonical passthrough idiom again; keep the
arrow slot (`{() => props.children}`) ONLY for genuinely dynamic or compound children — it is a
reactivity choice now, not a crash workaround. The registry reverts landed in the same change
(93 arrow slots across 12 tsx canonicals back to bare; the five `() => props.children ?? fallback`
compound sites stay arrowed).

# Evidence
- `plugins/babel/src/builders/children.mjs` `buildChildrenValue` + wiring in `vnode.mjs` /
  `component.mjs`; plugin suite 250 pass including new concat-shape assertions
  (processor.test.ts).
- `packages/dom` `appendToParent` Array.isArray branch + `hydrateSequence` array recursion and
  null/false skip; dom suite 587 pass including nested-array mount/hydrate and nullish-children
  hydration tests (html.test.ts, hydrate.test.ts).
- Registry: `bun coverage ui` 2836 pass / 0 fail (command/select nested-array groups render via
  bare passthrough); scratch ssr→hydrate probes confirmed 1 icon/trigger and command items
  surviving hydration. Full blast radius: 12 registry tsx files, 59 install-source entries
  regenerated, plugins/babel + plugins/astro + packages/ui AGENTS.md comments synced.
