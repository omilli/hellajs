---
title: Define or replace every technical word
impact: HIGH
impactDescription: an undefined library word (propagation, subtree, reactive context) stops a JavaScript developer who has never used HellaJS
tags: jargon, vocabulary, define, plain
---

## Define or replace every technical word

Write for a developer who knows JavaScript and nothing about this library. A word they do not bring (propagation, dependents, subtree, reconcile, reactive context, reactive link, hydrate, hoist, scope in its HellaJS sense) is either defined in the same sentence in everyday words or replaced by those everyday words. Never two undefined terms in one sentence. Test: read the sentence aloud to that developer; every noun they would ask about gets defined or replaced. Code identifiers are not jargon when they are code-wrapped and linked: `` `signal` `` is the thing they type, "the reactive context" is a word they must decode.

**Incorrect (what is wrong):**

````mdx
<!-- packages/core/docs/api/signal.mdx ### Reactive Links -->
Signals create reactive links when accessed inside other reactive contexts like [`computed`](/reference/core/computed) or [`effect`](/reference/core/effect).

<!-- packages/dom/docs/concepts/templates.mdx ## Static Markup Is Cheap -->
A fully static subtree (lowercase tag, literal props, static text) is allocated once per site and cloned on every later use, so repeating static markup costs almost nothing.
````

"Reactive links" and "reactive contexts" are two undefined terms in one sentence; the second paragraph decodes only after the reader already knows the answer.

**Correct (what is right):**

````mdx
A `computed` or `effect` re-runs when a `signal` it read changes. Reading the signal is what subscribes it; nothing is registered by hand.

<!-- packages/core/docs/concepts/reactivity.mdx ### Conditional Dependencies -->
A `computed` that reads different signals on different branches tracks only what its last run actually read.
````

Exceptions: a word the reader must know to act stays, defined once in the same sentence (the build step a Vite plugin performs, the class name format visible in DevTools); the reference page itself uses "propagate" and "track", so those two are library vocabulary, not findings.

Reference: `packages/core/docs/concepts/reactivity.mdx ### Conditional Dependencies` and `guides/docs.md §Content Strategy → Plain Language`
