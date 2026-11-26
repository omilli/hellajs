---
title: Open the page with what the reader does and gets
impact: HIGH
impactDescription: a feature list or a mechanism claim in the opener leaves the reader unable to say what the page helps them do
tags: opener, lead, page, title
---

## Open the page with what the reader does and gets

One or two short sentences directly under the `#` title (under `## {Package}` in index docs): the first says what the reader does, the second, when there is one, says what they get. Plain words, no more than about twenty each. The opener never lists features ("with hooks, guards, and redirects"), never sells ("seamlessly", "powerful", "fine-grained control"), never names a mechanism (the compiler, a virtual DOM, a hash) and never compares the library to another. In API docs the one-line description under `# {export}` is the opener: one sentence, same test.

**Incorrect (what is wrong):**

````mdx
<!-- packages/router/docs/concepts/routing.mdx # Routing -->
Reactive client-side routing that integrates seamlessly with the reactivity system, with lifecycle hooks, guards, and redirects for controlling navigation.

<!-- packages/dom/docs/concepts/templates.mdx # Templates -->
Write UI as JSX: the compiler wires your signals to the DOM, and updates touch only what changed. No virtual DOM, no runtime template parsing.
````

The first lists four features and sells with "seamlessly"; a reader still cannot say what routing does for them. The second explains a mechanism and argues against a competitor.

**Correct (what is right):**

````mdx
Route the app's URLs to handlers that update your signals. Guards, redirects, and lifecycle hooks decide when a navigation commits.

<!-- packages/core/docs/concepts/reactivity.mdx # Reactivity -->
Declare data and track dependencies, only computations affected by a change re-run.

Every value computes at most once per update, and effects never observe partially updated state.
````

Exceptions: tutorials open with "Build a {Name} App" plus one sentence naming the app (guide §Tutorial Docs); ui component docs carry no opener because the ui-section wrapper page owns the `<p>` lead line, which takes this rule.

Reference: `packages/core/docs/concepts/reactivity.mdx # Reactivity` and `guides/docs.md §Content Strategy → Task-First Framing`
