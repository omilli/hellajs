# Package Docs Style Guide

Uniform conventions for all package documentation. Package docs live in `packages/{name}/docs/` and are imported by the website in `docs/src/pages/`.

## File Locations

| Type | Path | Example |
|------|------|---------|
| API reference | `packages/{name}/docs/api/{export}.mdx` | `packages/core/docs/api/signal.mdx` |
| Concept | `packages/{name}/docs/concepts/{topic}.mdx` | `packages/dom/docs/concepts/templates.mdx` |
| Pattern | `packages/{name}/docs/patterns/{topic}.mdx` | `packages/core/docs/patterns/reactivity.mdx` |
| Package index | `packages/{name}/docs/index.mdx` | `packages/core/docs/index.mdx` |
| Website wrapper | `docs/src/pages/{section}/{package}/{name}.mdx` | `docs/src/pages/reference/core/signal.mdx` |
| Tutorial | `docs/src/pages/learn/tutorials/{name}.mdx` | `docs/src/pages/learn/tutorials/counter.mdx` |

### File Naming

- **API docs**: Match the export name exactly, lowercase (`signal.mdx`, `on.mdx`, `foreach.mdx`, `cssvars.mdx`).
- **Concept docs**: Lowercase, hyphenated (`error-handling.mdx`, `reactive-refs.mdx`, `lazy-loading.mdx`).
- **Pattern docs**: Lowercase, match the topic (`reactivity.mdx`, `routing.mdx`, `styling.mdx`).
- **Index**: Always `index.mdx`.

### Frontmatter

- **Package docs** (`packages/*/docs/**/*.mdx`): No frontmatter.
- **Website wrapper pages** (`docs/src/pages/**/*.mdx`): Always include `title`, `description`, and `layout`.

```yaml
---
title: signal
description: A reactive primitive that holds a value...
layout: ../../../layouts/MainLayout.astro
---
```

## Decision Precedence

When rules conflict, resolve in this order:

1. **Accuracy** — code examples must reflect actual behavior
2. **Consistency** — follow the template structure and conventions
3. **Clarity** — a reader unfamiliar with the codebase understands the doc
4. **Brevity** — less prose, more code

## Which Template to Use

1. **Function Doc** — Export has a function or object signature (e.g., `signal`, `mount`, `css`, `router`, `store`, `ForEach`, `$ref`)
2. **Prefix Doc** — Prefix-based feature with no function signature (e.g., `on:`, `bind:`, `e:`, `hook:`, `error:`)
3. **Concept Doc** — Explanatory content about how things work (e.g., templates, error-handling, lifecycle-hooks)
4. **Pattern Doc** — Collection of copy-paste code snippets (e.g., reactivity, routing, styling)
5. **Tutorial Doc** — Progressive-build walkthrough building a complete app (e.g., counter, todo, blog)
6. **Index Doc** — Package landing page with overview, installation, and navigation links

## Page Structure — Function Docs

Use for all exports with a function or object signature.

```
# {exportName}

One-line description of what the export does.

## API

TypeScript signature with parameter descriptions.

## Basic Usage

Self-contained example showing the primary use case.

## Key Concepts (optional but common)

### {Concept Name}

Sub-sections explaining behavior, patterns, or features.

## Important Considerations (optional)

### {Gotcha Name}

Pitfalls, anti-patterns, and edge cases.
```

### Section Rules

- **`# Title`**: Always present. Matches the export name exactly (e.g., `# signal`, `# ForEach`, `# $ref`, `# on:`). Never skip this heading.
- **One-line description**: Always present immediately after the title. One sentence, no trailing period for tagline-style, or one sentence with period for definition-style. Be consistent within a package.
- **`## API`**: Always present. Shows the TypeScript signature with parameter descriptions. Method sub-headings under `## API` (via the Multi-Method Exports pattern) are reserved for exported methods only. Do not interleave usage patterns, examples, or conceptual content between method sub-headings — that content belongs under `## Key Concepts` as a `###` sub-heading.
- **`## Basic Usage`**: Always present. Self-contained, runnable example with imports.
- **`## Key Concepts`**: Present when there are multiple behaviors or features to explain. Use `###` sub-headings for each concept. Any content that doesn't fit the standard sections should live here as a `###` sub-heading.
- **`## Important Considerations`**: Present when there are gotchas, anti-patterns, or non-obvious behaviors. Use `###` sub-headings for each topic.

## Page Structure — Prefix Docs

Use for prefix-based features that have no function signature (`on:`, `bind:`, `e:`, `hook:`, `error:`).

```
# {prefix}

One-line description of what the prefix does.

## Usage

Self-contained example showing the primary use case.

## Key Concepts (optional but common)

### {Concept Name}

Sub-sections explaining behavior, attributes, or patterns.

## Important Considerations (optional)

### {Gotcha Name}

Pitfalls, anti-patterns, and edge cases.
```

### Section Rules

- Same rules as Function Docs, except use `## Usage` instead of `## Basic Usage` and there is no `## API` section.

## Page Structure — Concept Docs

Use for conceptual content in `packages/{name}/docs/concepts/`.

```
# {Concept Name}

One-line description of the concept.

## {Section Name}

Explanation with code examples.

### {Sub-topic}

Detailed explanation.

... repeat sections ...
```

### Section Rules

- **`# Title`**: Always present. Capitalized concept name (e.g., `# Routing`, `# State`, `# Styling`).
- **`##` sections**: Free-form, organized by topic. Use descriptive section names.
- **Code examples**: Self-contained with imports on first example per page.
- **Cross-references**: Link to API reference docs on first mention of each export.
- **`<details>` blocks**: Place internal mechanics sections at the end of the doc.

## Page Structure — Pattern Docs

Use for copy-paste code patterns in `packages/{name}/docs/patterns/`.

```
# {Topic}

Short intro sentence.

### {Pattern Name}

One-line description of the pattern.

Code block with imports.

### {Pattern Name}

One-line description.

Code block with imports.

... repeat patterns ...
```

### Section Rules

- **`# Title`**: Always present. Capitalized topic name (e.g., `# Reactivity`, `# Routing`, `# Styling`).
- **No `## Basic Usage` or `## API` sections**: Patterns use `###` headings directly.
- **Self-contained**: Every code block includes imports. Patterns should be copy-pasteable.
- **One pattern per `###`**: Each pattern is independent and solves a specific task.
- **Cross-references**: Link to API reference docs on first mention of each export.

## Page Structure — Index Docs

Each package has an `index.mdx` serving as its landing page.

```
## {PackageName}

One-sentence description of the package.

### Installation

```bash
npm install @hellajs/{name}
```

### Example

Self-contained example demonstrating core functionality.

### API

- **[export](/reference/{package}/{export})**: Description
- **[export](/reference/{package}/{export})**: Description

### Concepts

- **[Concept](/learn/concepts/{name})**: Description

### Patterns

- **[Pattern](/learn/patterns/{name})**: Description

### Section Rules

- **`## Title`**: Uses `##` (not `#`) because the page is embedded in a larger layout.
- **Installation**: Always present. Just the npm install command.
- **Example**: Self-contained, 15–40 lines, demonstrating the primary use case with imports.
- **API / Concepts / Patterns**: Bullet lists with bold backtick-wrapped names linking to reference docs. Link on first mention only.
- No frontmatter. No `#` heading.

## Tutorial Page Structure

Tutorials follow a strict progressive-build pattern. Each section adds code on top of the previous section, building toward the complete application shown at the end. The working app lives in `examples/{name}/`.

### Template

```astro
---
layout: ../../../layouts/MainLayout.astro
title: {Name} App
description: Learn ... by building ...
---

import {Icon} from 'astro-icon/components';

# Build a {Name} App

Brief intro paragraph.

Jump to the [Complete Code](#complete-code) for the finished application.

## What You'll Learn

- **[Concept](/reference/path)**:  Description
- **[Concept](/reference/path)**:  Description

We'll start simple and add complexity step by step, so you see how each concept builds on the previous ones.

## Project Setup

### Installation

npm create vite + npm install commands.

### Configuration

vite.config and tsconfig blocks.

## {Concept Section}

Intro sentence connecting to previous section.

Code block with context markers.

**Code Explanation**

- **`api`**:  Description
- **`api`**:  Description

... repeat concept sections ...

## Next Steps

- **[Link](/path)**:  Description
- **[Link](/path)**:  Description

Closing sentence.

## Complete Code

Full runnable code matching the example app.
```

### Section Rules

- **Progressive build**: Each section adds code on top of the previous. Never removes or rewrites earlier code.
- **Context markers**: Use `//...` comments to show placement (`//... add after X`, `//... rest of the code unchanged`).
- **Never show full file repeats**: Only show the new or changed code with surrounding context. The reader builds up from previous sections.
- **Code Explanation**: Always present after every code block. Bullet list with bold backtick-wrapped API names linking to reference docs on first mention.
- **Alert boxes**: Use `<div role="alert" class="alert alert-error">` with Icon import for critical warnings (mutation pitfalls, reactivity gotchas). Follow with Good/Bad code examples.
- **Dev server callout**: Include `npm run dev` + URL (`http://localhost:5173`) in the section where the app first becomes interactive.
- **What You'll Learn**: Bold concept labels with brief descriptions. Link to reference docs on first mention using `[Concept](/reference/path)`.
- **Project Setup**: Always includes `### Installation` (npm commands) and `### Configuration` (vite config, tsconfig).
- **Next Steps**: 3 links to relevant tutorials, guides, or concepts. Include a one-line closing sentence.
- **Complete Code**: Full runnable code block matching the example app in `examples/{name}/src/main.tsx` (or `.jsx`). Must be identical to the example app source.
- **Language tag**: Use `tsx` for TypeScript tutorials, `jsx` for JavaScript tutorials.
- **Frontmatter**: Always include `title`, `description`, `layout`. Import `Icon` from `astro-icon/components` when using alert boxes.

### Concept Section Order

Arrange sections so each introduces exactly one or two new concepts. Typical order:

1. **State** (signal or store) + mount
2. **Styles** (css, cssVars)
3. **Derived values** (computed)
4. **Controls / View** (event handlers, ForEach, bind directives)
5. **Effects** (effect, localStorage, side effects) - optional, only when persistence or side effects are part of the app

Adjust the order to match the app's natural build-up. State always comes first. Effects are optional and come last when used.

Styles and controls may be combined into a single section for simpler apps.

## Website Wrapper Pages

Website pages in `docs/src/pages/` are thin wrappers that import and render package docs. They contain zero content of their own.

### Format

```mdx
---
title: {name}
description: One-line description matching the package doc.
layout: ../../../layouts/MainLayout.astro
---

import ContentName from '@{package}/{type}/{name}.mdx'

<ContentName />
```

### Import Aliases

| Alias | Resolves to |
|-------|-------------|
| `@core/` | `packages/core/docs/` |
| `@dom/` | `packages/dom/docs/` |
| `@css/` | `packages/css/docs/` |
| `@resource/` | `packages/resource/docs/` |
| `@router/` | `packages/router/docs/` |
| `@store/` | `packages/store/docs/` |

### Rules

- **Reference wrapper** (`docs/src/pages/reference/{package}/{name}.mdx`): Imports from `@{package}/api/{name}.mdx`.
- **Concept wrapper** (`docs/src/pages/learn/concepts/{name}.mdx`): Imports from `@{package}/concepts/{name}.mdx`.
- **Pattern wrapper** (`docs/src/pages/learn/patterns/{name}.mdx`): Imports from `@{package}/patterns/{name}.mdx`.
- Component name is PascalCase derived from the file name (e.g., `signal.mdx` → `SignalContent`).
- No content between the import and the component tag.
- A wrapper MAY import and render more than one package doc, separated by a divider (`<div class="...border-t..."></div>`), when the website joins related concepts from different packages under a single URL (for example, core and store state docs colocated at one learn URL). Each import must still follow the alias and PascalCase-component-name rules above, and the wrapper must still contain zero prose of its own.

## Content Scope

### What Goes Where

| Content | Location | Why |
|---------|----------|-----|
| Function signature + params | `api/{name}.mdx` → `## API` | API surface |
| Basic usage example | `api/{name}.mdx` → `## Basic Usage` | Primary use case |
| Behavior explanation (1–2 paragraphs) | `api/{name}.mdx` → `## Key Concepts` | Fits alongside the API |
| Multi-topic conceptual guide | `concepts/{name}.mdx` | Broad topic spanning multiple exports |
| Gotchas/anti-patterns | `api/{name}.mdx` → `## Important Considerations` | Must appear alongside the API |
| Copy-paste code snippets | `patterns/{name}.mdx` | Practical recipes |
| Step-by-step app build | `docs/src/pages/learn/tutorials/{name}.mdx` | Progressive learning |

### Splitting Rule

When an API doc exceeds ~350 lines, evaluate whether `## Key Concepts` sections should move to a `concepts/` doc. Leave a brief summary in the API doc with a cross-reference.

Only document exports from `index.ts`. Testing utilities and internal state accessors exported from `internal/` paths should not be documented.

### Duplicate Content

Cross-reference rather than duplicate. If two docs cover the same topic:

- **API docs**: Show a brief summary with a cross-reference to the canonical doc. Do not re-document the same features.
- **Example**: The `mount` doc should not re-document lifecycle hooks — reference the `hook:` prefix doc instead.

```markdown
Elements support lifecycle hooks via the [`hook:`](/reference/dom/hook) prefix. See [`hook:`](/reference/dom/hook) for all available hooks.
```

## API Section

### Format

```typescript
function exportName<T>(paramName: ParamType): ReturnType
```

Followed by a bullet list of parameters:

- `paramName`: Description of the parameter.
- **Returns**: Description of the return value.

### Rules

- Use `typescript` language tag for the signature block.
- Parameter descriptions are terse, one-line each.
- Return value uses `**Returns**:` (bold, colon) as a separate bullet.
- Generic parameters are shown in the signature (`<T>`) but not listed separately unless they have constraints.
- Complex types (interfaces, unions) may be shown inline or as separate blocks below the signature.
- Interface and type signatures must match the actual exported types from `index.ts`, including wrapper/view types. If the runtime type is a wrapper interface (e.g., a read-only view over an internal collection), document the wrapper by name — do not substitute a familiar built-in (e.g., `Map`) that implies capabilities the wrapper does not provide. Code examples must only call methods the documented interface exposes.

### Overloaded Functions

Show each overload as a separate block with an inline comment describing when to use it:

```typescript
// With an initial value
function signal<T>(initialValue: T): {
  (): T; // getter
  (value: T): void; // setter
};

// Without an initial value
function signal<T>(): {
  (): T | undefined;
  (value: T | undefined): void;
};
```

Do not collapse overloads into a single union signature.

### Complex API Exception

For exports with very large API surfaces (25+ options), inline TypeScript interfaces with JSDoc-style comments are acceptable instead of the bullet-list format. Use this only when the bullet-list format would be impractical due to volume.

### Multi-Method Exports

For exports that expose multiple methods (e.g., `resource`, `resourceCache`, `store`), document each method as a `###` sub-heading under `## API` with its own description and code example. Group methods by category when the list is long:

```
## API

[Signature block with all overloads and interfaces]

### Read Methods

### `get`

Description of the method.

```typescript
// Self-contained example
```

### `map`

Description.

### Write Methods

### `set`

Description.
```

## Code Examples

### Language Tags

- **Pure API code** (no JSX or html templates): Always use `typescript`
- **JSX code blocks**: Use `jsx`
- **html template code blocks**: Use `js` (html templates use tagged literals, not JSX)
- **CSS with JSX**: Use `jsx`
- **CSS with TypeScript features**: Use `tsx`
- **Config files**: Use the file type (`js` for vite.config.js, `json` for tsconfig.json, `bash` for shell commands)

### Import Style

Every code block must show the relevant imports at the top:

```typescript
import { signal, computed } from '@hellajs/core';
```

- Use package imports (`@scope/package-name`), never relative paths.
- Only show imports needed for the example — don't include every dependency.
- First example in a doc should always show the import for the export being documented.
- Subsequent examples in the same doc may omit imports if they're the same.
- Prefix docs (`on:`, `bind:`, etc.) must also show imports in their first example.

### Good/Bad Patterns

Use emoji markers for anti-patterns and recommended patterns:

- `❌` for bad patterns (with comment explaining why)
- `✅` for good patterns (with comment explaining why)
- `⚠️` for warnings and important notes (use sparingly)

```typescript
// ❌ Direct mutation - no updates triggered
todos()[0].text = 'Learn Signals';

// ✅ Create new reference to trigger updates
todos(todos().map(todo => 
  todo.id === 1 ? { ...todo, text: 'Learn Signals' } : todo
));
```

### Variable Names

Use descriptive names for signals, computed values, and effects in examples. Single-letter names (`a`, `b`, `c`, `x`, `y`, `z`) obscure meaning and make examples harder to follow.

```typescript
// ❌ Single-letter names - meaningless
import { signal } from '@hellajs/core';
const a = signal(1);
const b = signal(2);
const c = computed(() => a() * b());

// ✅ Descriptive names - self-documenting
import { signal, computed } from '@hellajs/core';
const count = signal(1);
const multiplier = signal(2);
const doubled = computed(() => count() * multiplier());
```

Well-known mathematical names (like `x` for coordinate, `i` for index, `fn` for function parameter) are acceptable in context.

### Comment Style

- Comments explain **why**, not what.
- Use inline comments for output expectations: `// Logs: "The count is: 5"`
- Keep comments terse and conversational.

### No Test Assertions

Never use test-framework assertions (`expect`, `toBe`, `toThrow`, `describe`, `it`, `test`) in documentation code examples. Use comments and `console.log` output instead.

```typescript
// ❌ Test assertion
expect(() => badComputed()).toThrow('fail');

// ✅ Comment with try/catch
try {
  badComputed(); // Throws: Error 'fail'
} catch {}
```

### Implementation Accuracy

Implementation examples in API docs must accurately reflect actual behavior. Simplifications that omit error handling or edge cases must include a comment noting what is simplified.

- **Static vs reactive**: `css()` evaluates values eagerly — never pass functions as property values (they are stringified into the output). For reactive styles that respond to signal changes, use `cssVars()` or resolve conditions before calling `css()`.

### No Silent No-Ops

Every example must do what its comments claim. If an example reads from a cache, store, or resource, it must populate that source earlier in the same block (or in a prior block clearly marked as setup). Do not demonstrate `get`/`read`/`data()` against keys that were never written — the silent `undefined` return contradicts the prose and teaches the wrong contract. When demonstrating methods whose effect depends on prior state (cache TTL, ongoing requests, configuration), seed that state explicitly.

### Callback Parameter Types

Callback examples must treat their parameters as the type the implementation actually passes. If a hook is typed `(err: unknown) => void` and the implementation passes the raw error, examples must not access properties like `.category` or `.code` on the argument without a type guard. If the implementation never invokes a callback for a given condition (e.g., an error handler that is skipped for aborts), examples must not show that callback firing for that condition. Document categorized/wrapped variants separately from raw callbacks.

### Code Block Length

Keep examples between 5–30 lines. If an example exceeds 30 lines, simplify it. If the concept genuinely requires more, use context markers (`//...`) to omit irrelevant parts.

## Dual Syntax (JSX + html)

### When to Show Both

Show both JSX and html template syntax when:
- The feature is DOM-specific with meaningfully different JSX and html forms (e.g., `ForEach`, `Portal`, `Lazy`, `Transition`)

Show only one syntax when:
- The feature is package-agnostic (signal, computed, effect, store, resource)
- The feature only exists in one syntax form

### How to Show Both

1. Show the primary example in JSX (under `## Basic Usage`).
2. Show the html template equivalent immediately after, under the same section or a dedicated `### html Template Syntax` sub-heading.
3. Both examples should be self-contained with imports.

## Cross-References

### Link Format

```markdown
[`name`](/reference/{package}/{name})
```

Always backtick-wrap function/method names in cross-references. Plain text for concept references.

```
[signal](/reference/core/signal)  → WRONG
[`signal`](/reference/core/signal) → CORRECT
[templates](/learn/concepts/templates) → CORRECT (concept, not a function)
```

### URL Scheme

| Target | Path pattern |
|--------|-------------|
| API reference | `/reference/{package}/{export}` |
| Concepts | `/learn/concepts/{topic}` |
| Patterns | `/learn/patterns/{topic}` |
| Tutorials | `/learn/tutorials/{name}` |

### Rules

- Always use the full path format — never relative links.
- Section headings should not contain links.
- Do not use a `## Related` section — use inline cross-references in text.
- Link on first mention of an export within a doc. Subsequent mentions do not need links.
- **Index bullets**: The bold-link format in index docs (`**[name](/reference/...)**`) follows the Index Docs template and does not require backticks. The backtick-wrapping rule applies to inline prose references only.

## Tables

Use tables for structured data like:

- Error categories or status enums
- Hook timing reference
- Option lists with types and descriptions
- Timeline comparisons

```markdown
| Time | State | Behavior |
|------|-------|----------|
| 0-30s | Fresh | Returns cached data instantly |
| 30s+ | Stale | Returns cached data + background fetch |
```

### Rules

- Tables supplement text explanations — don't use them as a replacement.
- Always include header row.
- Keep columns narrow enough for readable rendering.

## Alert Boxes

Use Astro alert syntax for callouts that need visual emphasis:

```html
<div role="alert" class="alert alert-info alert-soft">
  <span>ℹ️</span>
  <span>Content here</span>
</div>
```

- Use sparingly — most information belongs in normal text.
- Prefer `alert-info` for informational notes. Avoid `alert-warning` (use `⚠️` inline instead).
- Use `<div role="alert" class="alert alert-error">` for critical warnings in tutorials (requires Icon import).

### Blockquote Callouts

For single-sentence callouts that need more emphasis than an inline emoji but less than a full alert box, use a blockquote with a leading `⚠️`:

> ⚠️ **Performance**: snapshot accesses every signal in the store.

Use this form sparingly — at most one per section. Prefer inline `⚠️` for in-code warnings and Astro alert boxes for multi-sentence or critical warnings.

## `<details>` Sections

Use collapsible `<details>` blocks for internal implementation mechanics that are educational but not required for API usage.

### Format

```html
<details>
<summary>Internal Mechanics</summary>

Content explaining implementation details.

</details>
```

### Rules

- Always use `Internal Mechanics` as the summary label.
- Place at the end of the doc (after all standard sections).
- Content should explain *how* the system works internally, not *how to use* it.
- Use sparingly — most docs should not need them. Common in concept docs, rare in API docs.

Good candidates: template AST structure, reconciliation algorithm internals, event delegation routing. Not needed for: configuration options, usage patterns, API behavior.

## Content Tone

### API Docs

- Direct and factual. No "you can" or "you might want to".
- Describe behavior, not intentions: "Signals create reactive links" not "You can use signals to create reactive links".
- Present tense: "Returns a class name" not "Will return a class name".
- No hedging: "Prevents propagation" not "Helps prevent propagation".

### Concept Docs

- Explanatory and educational. May use analogies.
- Still present tense, still no hedging.
- Cross-reference API docs on first mention of each export.

### Pattern Docs

- Terse. Minimal prose, let the code speak.
- One sentence intro per pattern, then the code block.

### Tutorial Docs

- Conversational: "Let's build..." "Now add..." "Try clicking..."
- Present tense for descriptions, imperative for instructions.
- Code Explanation bullets use factual tone (not conversational).

## Section Headings

Section headings at every level (`#`, `##`, `###`, `####`) must describe their specific topic. Generic labels — `Overview`, `Summary`, `Comparison`, `Implementation`, `Lifecycle`, `Details` — communicate nothing to a reader scanning the table of contents and are banned. Source-code dumps belong in a `<details>` block with the summary `Internal Mechanics` (see `<details>` Sections), not under a generic `### Implementation` heading.

Name the subject directly: `### JSX vs html vs Raw AST` instead of `### Comparison`; `### Connection, Disconnection, and Reconnection` instead of `### Lifecycle`.

## Length Targets

| Doc type | Target | Maximum | Action when exceeded |
|----------|--------|---------|---------------------|
| API docs | 100–350 lines | 400 lines | Split Key Concepts to `concepts/` |
| Concept docs | 40–250 lines | 350 lines | Split into multiple concept docs |
| Prefix docs | 50–200 lines | 250 lines | Split Key Concepts to `concepts/` |
| Pattern docs | 100–300 lines | 400 lines | Split by sub-topic |
| Index docs | 40–70 lines | 100 lines | Simplify the example |
| Code blocks | 5–30 lines | 40 lines | Simplify or use context markers |

