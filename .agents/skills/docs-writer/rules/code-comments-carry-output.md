---
title: Show the result in the comment on the line that produces it
impact: MEDIUM
impactDescription: a comment that narrates what the line is ("create a signal") leaves the reader to work out what happened while the prose repeats it
tags: code, comments, output, examples
---

## Show the result in the comment on the line that produces it

Every example line whose result the prose relies on carries a trailing comment with the observable result, in the reader's words: the logged value (`// 0`), the rendered text, `// No update`, `// Throws`, `// Updates: now tracks todos, drops count`. The comment says what happens, never what the line is (`// Create a signal` is the line; `// 0` is the result). A multi-line setup ends in the read that shows the result. Mark the wrong and right way with `// ❌` and `// ✅` followed by the reason. Because every result sits on its line, prose never restates a result a comment shows; it carries only what the code cannot. `console.log` lines and `// Logs: "..."` comments stand in for test assertions, which never appear.

**Incorrect (what is wrong):**

````mdx
<!-- packages/core/docs/api/signal.mdx ## Basic Usage -->
```typescript
import { signal } from '@hellajs/core';

// Create a signal with an initial value
const count = signal(0);

// Read the current value
console.log(count()); // 0

// Update the value
count(5);
console.log(count()); // 5
```
````

Three comments narrate what each line is; only the two `// 0` and `// 5` carry a result.

**Correct (what is right):**

````mdx
<!-- packages/core/docs/concepts/reactivity.mdx ### Signal Collections -->
```typescript
import { signalArray, effect } from '@hellajs/core';

const items = signalArray([1, 2, 3]);

// Tracks element 0, not the whole array
effect(() => console.log('First:', items.get(0))); // Initial run: "First: 1"

items.push(4); // "First: 1"; the shape changed, element 0 did not
items.set(0, 9); // "First: 9"; only index-0 readers wake
items([9, 2, 3, 4]); // Equal elements write nothing; nothing wakes
```
````

Exceptions: signature blocks and prop tables carry no results; `//...` context markers in tutorials and long blocks (guide §Code Block Length) are placement, not results.

Reference: `packages/core/docs/concepts/reactivity.mdx ### Signal Collections` and `guides/docs.md §Code Examples → Comment Style & No Test Assertions`
