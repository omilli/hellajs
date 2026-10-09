---
type: decision
title: Registry variant prop bags extend the component's HTMLAttributes base
description: A registry component's Props extending HTMLAttributes forces its tests/helpers variant bag to extend the same base — the variant fn slot is contravariant, so a plain bag fails tsc TS2322.
tags: [ui, contract, types]
timestamp: 2026-05-04
last_confirmed: 2026-05-04
triggers: [variant-bag, registry-migration, ts2322]
---
# Why
The compiled-variant slots in `packages/ui/tests/helpers/variants.ts` are typed as
`(props: {Name}VariantProps) => HellaNode`. Once the registry component's props
interface extends `HTMLAttributes<"tag">` (the rest-attrs migration), the
component fn requires its parameter type to accept every key GlobalHTMLAttributes
carries — including the `data-${string}` template index signature. A bag without
the base lacks those keys and is not assignable to the component's props, so the
`{Name}Variants` array fails `bunx tsc -p tsconfig.lint.json` with TS2322
("Index signature for type `data-${string}` is missing"). Extend the bag from
`HTMLAttributes<"root">` (tag-known roots) or `GlobalHTMLAttributes` (open maps /
part bags shared across roots), re-declaring `class?: string` narrowed, and drop
killed prop decls — rest keys stay assignable through the index signature.
# Evidence
`bunx tsc -p tsconfig.lint.json` during the attrs-spread set, unit 03: four
TS2322 errors at `packages/ui/tests/helpers/variants.ts` ScrollBarVariantProps
assignments plus TS2353 on part bags (`"on:click"` unknown); fix =
`ScrollBarVariantProps extends GlobalHTMLAttributes`,
`RadioGroupPartVariantProps`/`ToggleGroupPartVariantProps extends
HTMLAttributes<"button">` → tsc exit 0. Unit 02's precedent:
`AvatarPartProps extends GlobalHTMLAttributes`, `ButtonVariantProps extends
HTMLAttributes<"button">`.
