---
title: Name the topic in five words or fewer
impact: HIGH
impactDescription: a scaffold title (Mental Model, The Shape of X) tells a scanning reader nothing about what the section covers
tags: headings, title, scanning
---

## Name the topic in five words or fewer

Every heading names its topic or its action in one to five words: a noun phrase (`## How Effects Run`, `## Handling Errors`), an imperative (`### Replace, Don't Mutate`), or the thing explained (`### Custom Equality`). A reader scanning the table of contents can predict every section from its title alone. Never a scaffold (`Mental Model`, `The Shape of a Template`, `Understanding X`, `Working with X`, `Overview`, `Basics`, `How it works`): it describes the section's role in the doc, not its subject. Never a mechanism claim (`## Static Markup Is Cheap`, `## Only What You Use Ships`): a title that sells how the library works names no reader task. A heading that needs six words is two sections or a sentence.

**Incorrect (what is wrong):**

````mdx
<!-- packages/router/docs/concepts/routing.mdx line 5 -->
## Mental Model

<!-- packages/dom/docs/concepts/templates.mdx line 5 -->
## The Shape of a Template
````

**Correct (what is right):**

````mdx
<!-- packages/core/docs/concepts/reactivity.mdx -->
## How Effects Run
### Draining Effects Early
## Reducing Unnecessary Work
### Building on the Previous Value
````

Exceptions: template-fixed headings (`# {export}`, `## Basic Usage`, `## Usage`, `## API`, `## Key Concepts`, `## Important Considerations`, `## Complete Code`, `## Installation`, `## Configuration`) are set by the guide and never reworded.

Reference: `packages/core/docs/concepts/reactivity.mdx` (every heading) and `guides/docs.md §Section Headings`
