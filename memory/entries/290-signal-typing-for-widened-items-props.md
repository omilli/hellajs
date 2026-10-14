---
type: fact
title: Type reactive-items test signals by the array arm, never Props["items"]
description: signal<Props["items"]> captures the T[] | (() => T[]) union and fails tsc on index and prop-pass sites; declare signal<Entry[]>.
tags: [ui, tests, typescript]
timestamp: 2026-10-14
last_confirmed: 2026-10-14
triggers: [reactive-items-tests, signal-typing, widened-items-props]
---
# Why

The reactive-items family widened every `items` prop to `Entry[] | (() => Entry[])`, and the
tests drive the reactive arm with a signal. Indexing the props type —
`signal<TabsVariantProps["items"]>` — hands `Signal` the whole union: `liveItems()` then reads
`T[] | (() => T[])`, so `[..]` indexing errors TS7053 and passing the signal back to the prop
errors TS2322 (`Signal<union>` is not assignable to `() => T[]`). The signal models ONE list;
type it by the array arm — `signal<TabsItem[]>`, `signal<ToggleGroupEntryVariant[]>`,
`signal<RadioGroupEntryVariant[]>` (the mirror-interface entry types from
`packages/ui/tests/helpers/variants.ts`) — and pass it straight as the callable arm.

# Evidence

`bun coverage ui` first run exit 1 with 33 errors, 11 each in `tabs.test.ts`,
`toggle-group.test.ts`, `radio-group.test.ts` (TS7053 at `liveItems()[2]!` index sites + TS2322
at the `items: liveItems` prop sites), all rooted in the `signal<TabsVariantProps["items"]>`
declarations; retyping to the array arm → exit 0, 3324 pass, 0 fail.
