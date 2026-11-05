---
title: Type variant-typed signals with explicit generics for cva recipe props in skills fences
description: "`signal(\"sm\")` infers `Signal<string>`, so a Correct fence resolving a recipe with `button({ size: size() })` reds skills-check TS2322 - `CVAPropValue` demands `keyof VK & string`, fixed by declaring `signal<\"sm\" | \"lg\">(\"sm\")`."
tags: [css, cva, signal, skills-check, fences, best-practices-skills, generics]
confirmed: 2026-11-04
---

# Why

`vp run skills-check` typechecks Correct fences against the real `@hellajs/css` types. A recipe's prop type is `CVAPropValue<V[K], M>` - the scalar arm is `keyof VK & string`, the literal union of the variant's value names. A signal initialized from a plain string literal (`signal("sm")`) infers `Signal<string>` at the declaration site (literal widening), so `size()` returns `string` and `button({ size: size() })` fails with `TS2322: Type 'string' is not assignable to type 'CVAPropValue<...>'`. Declare the union explicitly: `signal<"sm" | "lg">("sm")`. Note the package docs' prose recipe `class={button({ size: size() })}` only compiles under this explicit-generic form.

# Evidence

- skills-check run (2026-11-04, worktree plans-skills-config-best-practices-skills): `.skills-snippets/css-best-practices_recipe-caller-reactivity.tsx(20,31) TS2322: Type 'string' is not assignable to type 'CVAPropValue<{ sm: ...; lg: ...; }, CVAMedia>'`; re-run green after the generic.
- Types read at `packages/css/lib/types.d.ts CVAPropValue` (`(keyof VK & string) | ({ initial?: keyof VK & string } & ...)`).
