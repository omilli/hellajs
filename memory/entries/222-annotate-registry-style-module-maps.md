---
type: decision
title: Annotate registry style-module maps Record-string before removing entries
description: Removing an entry from a ui registry style-module map requires annotating the map `: Record<string, string>`, or the ui bundle's splice-compile fails TS7053 on fallback-key indexing.
tags: [arch, contract]
timestamp: 2026-09-29
last_confirmed: 2026-09-29
triggers: [registry-style-module, map-entry-removal, ts7053]
---
# Why

Registry canonicals index these maps with union keys that include the removed names because those names are the props' fallback values (`props.variant ?? "default"` in marker, `props.variant ?? "icon"` in attachment). The canonicals standalone-typecheck against their `declare const variants: Record<string, string>` placeholders, but `applyStyleVariant` replaces the declare with the literal map type at compile, so a narrowed literal breaks indexing (`TS7053: Property 'default' does not exist on type '{ separator: string; border: string; }'`). Annotating the style-module map `Record<string, string>` matches the canonical's declared contract, keeps canonicals untouched, and changes no runtime output (`filter(Boolean)` drops the undefined exactly as it dropped the old `""`). Do NOT narrow the prop unions instead: the removed keys are live fallback values, and `data-variant`/default styling semantics would change.

# Evidence

`bun bundle ui` failed with TS7053 in `marker.css/marker.tsx`, `marker.tailwind/*`, `attachment.tailwind/*` after the empty-entry sweep; annotating `variants`/`mediaVariants` in `marker-css.ts`, `marker-tailwind.ts`, `attachment-tailwind.ts` made `bun coverage ui` exit 0 (2760 pass). Canonical declares: `packages/ui/registry/marker/marker.tsx` (`declare const variants: Record<string, string>`), `packages/ui/registry/attachment/attachment.tsx` (`declare const mediaVariants: Record<string, string>`); `style()` returns `string` (`packages/css/lib/style.ts`).
