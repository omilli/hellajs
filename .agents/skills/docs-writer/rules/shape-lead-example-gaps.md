---
title: Shape every section as lead, example, gaps
impact: HIGH
impactDescription: a section that opens with a list, a fence, or nothing gives the reader no sentence to hang the code on
tags: section, structure, lead, example, list
---

## Shape every section as lead, example, gaps

Every `##` and `###` runs the same three beats. **Lead**: one or two plain sentences stating the behavior the section shows (the API name code-wrapped, first mention linked). **Example**: one runnable block whose trailing comments show each result. **Gaps**: zero to two sentences carrying only what the code cannot show, a constraint, a failure mode, a pointer to another page. Never a list before the first sentence, never a heading straight into a fence or a table, never a heading straight into a sub-heading in a concept doc, never prose that restates a result a comment already shows, never a second code block where one more comment line would do.

**Incorrect (what is wrong):**

````mdx
<!-- packages/router/docs/concepts/routing.mdx ## Mental Model -->
## Mental Model

HellaJS routing works through three primitives:

- **[`router`](/reference/router/router)** configures route patterns and their handlers
- **[`route`](/reference/router/route)** is a reactive signal holding the current path, params, query, and handler

<!-- packages/router/docs/concepts/routing.mdx ## Navigation in Components, next line after the heading -->
## Navigation in Components

```jsx
import { navigate } from '@hellajs/router';
````

A list opens the first section; the second jumps from the heading into a fence.

**Correct (what is right):**

````mdx
<!-- packages/core/docs/concepts/reactivity.mdx ### Draining Effects Early -->
### Draining Effects Early

When the next line needs the effects already run, reading a log written by an `effect`, or handing control to non-reactive code, call [`flush`](/reference/core/flush) to run the queued effects synchronously.

```typescript
import { signal, effect, flush } from '@hellajs/core';

const count = signal(0);
const runs: number[] = [];

effect(() => runs.push(count())); // Initial run: runs is [0]

count(5);
count(6);
console.log(runs); // [0]: both writes wait for the batch

flush(); // Runs the queued effects now
console.log(runs); // [0, 6]: one run, final value only
```
````

Exceptions (template-fixed, fence or list first by the guide): `## API` and its `###` members (signature block or prop table), `## Complete Code` and its per-file `###`, `## Installation`, `### Installation`, `### Configuration`, index `### Example`, `### API`, `### Concepts`, `### Patterns`, tutorial `## What You'll Learn` and `## Next Steps` (link lists), `## Key Concepts` and `## Important Considerations` and `## Project Setup` as containers whose `###` children each carry their own lead. Index docs: `## {Package}` takes the opener as its lead.

Reference: `packages/core/docs/concepts/reactivity.mdx ### Draining Effects Early` and `guides/docs.md §Content Strategy → Examples First`
