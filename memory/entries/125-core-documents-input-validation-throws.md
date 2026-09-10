---
type: decision
title: Core documents input-validation throws on factory JSDoc only - lib .d.ts carry no @throws
description: Core keeps every input-validation @throws on the factory declaration; its .d.ts carry none (store/resource do put @throws on interface methods) - container-callable throws document at the factory.
tags: [core, docs, jsdoc]
timestamp: 2026-09-10
last_confirmed: 2026-09-10
triggers: [core-throws-jsdoc, dts-throws-placement, factory-jsdoc-validation, container-callable-throws]
---

# Why

`guides/code.md` §Error Handling says to document thrown errors "on the signature the consumer calls (function declaration; each public overload; interface method for object singletons)". Read literally over `@hellajs/core`'s collection containers — callable interfaces (`SignalArray`/`SignalMap`/`SignalSet`) whose write overloads live in `lib/types.d.ts` — that would demand `@throws` on the `.d.ts` call signatures. Operative convention is the opposite split: core keeps ALL validation `@throws` on factory declarations (`signal`, `computed`, `signalArray`/`signalMap`/`signalSet`), and core's `.d.ts` carry none, while store (`lib/types.d.ts`) and resource (`lib/types/*.d.ts`) DO carry `@throws` on interface methods. A future audit applying the store/resource shape to core would flag every factory-placed `@throws` as misplacement — it is not; the plan fork (plans/core/audit/code unit 01, operator-resolved) pinned factory placement for the container reconcile throws.

# Evidence

- `rg -c '@throws' -g '*.d.ts' packages` (2026-09-10): `packages/store/lib/types.d.ts` 2, `packages/resource/lib/types/resource.d.ts` 1 + `cache.d.ts` 5, core 0 matches anywhere in `packages/core/lib`.
- `packages/core/lib/signalArray.ts`/`signalMap.ts`/`signalSet.ts`: both new structural-input conditions documented as `@throws {Error} When ...` on the factory JSDoc; container call signatures in `lib/types.d.ts` keep one-line behavior comments only.
- AGENTS.md prose carries the full six-message contract (packages/core/AGENTS.md §Public exports), matching the repo's "thrown errors live in JSDoc + AGENTS.md prose" docs convention.
