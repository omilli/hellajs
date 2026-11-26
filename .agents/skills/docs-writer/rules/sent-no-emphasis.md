---
title: Never teach with bold or italics
impact: MEDIUM
impactDescription: emphasis hides a contrast the sentence should state, so the reader leans on type weight instead of words
tags: emphasis, bold, italic, contrast
---

## Never teach with bold or italics

Emphasis never carries meaning in prose. A word that needs stressing marks a sentence that has not said the thing: rewrite it so the plain sentence carries the point, or move the contrast into the code as `// ❌` and `// ✅` comments with the reason after the mark. The reference page uses no bold and no italics in any prose sentence. Bold is structural only where a template fixes it: `**Returns**` under `## API`, index and tutorial link bullets, Code Explanation bullet labels, blockquote labels. Headings are not emphasis; a bold line acting as a heading is a heading or a sentence, never a third thing.

**Incorrect (what is wrong):**

````mdx
<!-- packages/dom/docs/concepts/templates.mdx ## Reactive Bindings -->
A signal **reference** is the simplest reactive binding. A **compound** expression (arithmetic, conditional, method call) calls the signal, and the compiler wires the reactivity for you.

<!-- packages/css/docs/concepts/styling.mdx ## Scoped Styles -->
Numbers *intelligently* convert to pixels.

<!-- packages/router/docs/concepts/routing.mdx ## Route Guards -->
Guards control navigation by what they **return**:
````

**Correct (what is right):**

````mdx
Write `{count}` to show a signal's value and `{count() * 2}` to show a calculation on it. Both update when `count` changes.

<!-- packages/core/docs/concepts/reactivity.mdx ### Side Effects -->
`effect` runs a function that re-runs whenever a `signal` it read changes. Dependencies are collected automatically on every run: whatever the function reads, it subscribes to.
````

Exceptions: the guide's sanctioned bold labels (`**Returns**`, `- **[`name`](/reference/...)**:  description` in Code Explanation and What You'll Learn bullets, `> **Label**:` blockquote labels, the index `### API` bullets); `<strong>` inside a `<Callout>` for a proper name.

Reference: `packages/core/docs/concepts/reactivity.mdx` (zero emphasis in prose) and `guides/docs.md §Callouts → Blockquote Callouts`
