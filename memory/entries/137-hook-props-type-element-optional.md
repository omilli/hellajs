---
type: fact
title: Hook props type element optional while runtime always passes it
description: dom hook props use ElementHook = (node?: Element) => void, so docs examples must keep element?. narrowing even though runHooks never passes undefined.
tags: [dom, types, docs]
timestamp: 2026-09-09
last_confirmed: 2026-09-09
triggers: [hook-mdx, element-hook-typing, doc-snippets-strict]
---
# Why
Dom docs fixing the "`Element | undefined`" claim in `api/hook.mdx` by deleting the
defensive narrowing (`element?.`, `if (!el) return`) breaks `bun doc-snippets` strict
tier: the narrowing is type-required, not phantom. The runtime claim alone (runHooks
always passes the element) is true but insufficient; the hook prop TYPE is optional.
`ElementMountFn = (element: HellaElement) => void` is NOT the hook prop type; hook
props route `attributes.d.ts` `[K in keyof ElementHooks as hook:...]` -> `ElementHooks`
-> `ElementHook = (node?: Element) => void` (nodes.d.ts).
# Evidence
`packages/dom/lib/types/nodes.d.ts:217` `type ElementHook = (node?: Element) => void`;
`packages/dom/lib/types/attributes.d.ts:72` maps `hook:${K}` to `ElementHooks[K]`;
`packages/dom/lib/internal/cleanup.ts` `runHooks` passes `node as Element` for every
element-receiving hook (only beforeMount/afterDestroy are zero-arg). Repro: replacing
`element?.tagName` with `element.tagName` in hook.mdx -> `bun doc-snippets` fails
`.doc-snippets/strict/packages_dom_docs_api_hook_mdx.tsx(35,32) TS18048: 'element' is
possibly 'undefined'`. Correct doc wording: parameter typed `node?: Element`, runtime
always provides it (plans/dom/audit/docs/02, operator-approved 2026-09-09).
