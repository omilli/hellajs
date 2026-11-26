---
title: Describe behavior, never mechanism or rationale
impact: HIGH
impactDescription: a paragraph on hashing or tree-shaking answers a question the reader never asked and pushes the behavior they need below the fold
tags: internals, mechanism, rationale, budget
---

## Describe behavior, never mechanism or rationale

The reader learns two things: what they will see and what they must do. How the library achieves it (allocation, cloning, hashing, reconciliation, tree-shaking, which runtime module the compiler loads) and why it was designed that way ("no virtual DOM", "cheap", "ships only what you use") never appear, unless the mechanism changes what the reader writes. Then it is one clause of behavior plus the action: "the same object always yields the same class name, so share the call", not how the hash is computed. Test each candidate fact with the guide's Internals Budget: does knowing this change what the reader writes, calls, or debugs? Fails, cut the whole sentence or section, never soften it. A section whose title is a mechanism claim goes with it.

**Incorrect (what is wrong):**

````mdx
<!-- packages/dom/docs/concepts/templates.mdx ## Static Markup Is Cheap -->
## Static Markup Is Cheap

A fully static subtree (lowercase tag, literal props, static text) is allocated once per site and cloned on every later use, so repeating static markup costs almost nothing. Expressions, components, spreads, and prefixed attributes (`on:`, `hook:`, ...) disqualify a subtree from this treatment; static children inside a dynamic parent still benefit individually.

<!-- packages/css/docs/concepts/styling.mdx ## Scoped Styles -->
The hash is computed from the object's contents.
````

The whole first section is mechanism plus a performance claim the reader cannot act on; the second sentence explains hashing where the reader needs only "the same object yields the same class".

**Correct (what is right):**

````mdx
The same style object always produces the same class name, on the server and the client. Two components using the same style share one rule.

<!-- packages/core/docs/concepts/reactivity.mdx ## Reducing Unnecessary Work -->
Every re-run costs. These patterns keep recomputation proportional to what actually changed.
````

Exceptions: a mechanism the reader must configure or debug stays as behavior with the action (the build plugin that compiles JSX, the dispose handle a `document` listener requires); the guide's §Internals Budget is the arbiter when a fact is borderline.

Reference: `packages/core/docs/concepts/reactivity.mdx ## Reducing Unnecessary Work` and `guides/docs.md §Content Strategy → Internals Budget`
