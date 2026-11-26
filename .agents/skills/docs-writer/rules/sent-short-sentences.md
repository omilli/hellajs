---
title: One idea per sentence, three sentences per paragraph
impact: MEDIUM
impactDescription: a three-clause sentence or a four-sentence paragraph makes the reader re-read before the next line lands
tags: sentences, paragraphs, length
---

## One idea per sentence, three sentences per paragraph

One idea per sentence: at most two clauses (one comma or one conjunction), never more than thirty words. A sentence that needs a colon, a semicolon, or three commas to hold together is two sentences. One to three sentences per paragraph; the fourth starts a new paragraph or is cut. The reference page's longest sentence is twenty-eight prose words (code spans excluded) and its longest paragraph is three sentences; those are the ceilings. Measure: the plan probe's `S30` (sentences over thirty words) and `P3` (paragraphs over three sentences) both read zero on the reference page.

**Incorrect (what is wrong):**

````mdx
<!-- packages/core/docs/api/signal.mdx ### Writing undefined Clears the Value -->
Whether a call reads or writes depends on the argument count, not the value: calling the signal with `undefined` is a write, not a read. A signal created without an initial value legitimately holds `undefined`, so a stored `undefined` is indistinguishable from never-set. Put fallbacks at read sites.
````

Three sentences, each three clauses, joined by a colon and a "so": one idea stretched across a paragraph.

**Correct (what is right):**

````mdx
The call counts arguments, not values: `count(undefined)` is a write. A signal with no initial value holds `undefined` until the first write, so read with a fallback: `count() ?? 0`.

<!-- packages/core/docs/concepts/reactivity.mdx ### Reactive State -->
Call a `signal` with no argument to read the current value, or call it with an argument to write a new one.

New values are compared by reference.
````

Exceptions: tutorials' Code Explanation bullets are one bullet per API name and may run longer as labels (guide §Tutorial Docs); `## API` parameter bullets are one line each by template.

Reference: `packages/core/docs/concepts/reactivity.mdx` (every paragraph) and `guides/docs.md §Content Strategy → Plain Language`
