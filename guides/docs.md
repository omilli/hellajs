# Package Docs Style Guide

Uniform conventions for all package documentation. Package docs live in `packages/{name}/docs/` and are imported by the website in `docs/src/pages/`.

## Contents

Decision index — jump to the section for the decision you are making. This guide is long; do not scan linearly. The barrel that defines which exports are documented is `lib/index.ts` (see `code.md` §Canonical paths).

| Decision | Section |
|---|---|
| Which of the 6 doc templates? | §Template Selection |
| Which file path? | §File Locations & Naming |
| Extending an existing doc (adding an option/field/method)? | §Extending Existing Content |
| Function vs Prefix doc structure? | §Function & Prefix Docs |
| Multi-method export (`resource`, `resourceCache`, `store`)? | §Multi-Method Exports |
| Which section does new content go in? | §Content Scope → What Goes Where |
| Signature format in `## API`? | §API Section |
| Overloaded function? | §API Section → Overloaded Functions |
| Language tag for a code block? | §Code Examples → Language Tags |
| Import style? | §Code Examples → Import Style |
| Cross-reference link format? | §Cross-References |
| Frontmatter rules? | §File Locations & Naming → Frontmatter |
| Length limits per doc type? | §Length Targets |
| Section heading naming (banned generics)? | §Section Headings |
| Tutorial progressive-build? | §Tutorial Docs |
| Website wrapper page? | §Website Wrapper Pages |

Sections in order: File Locations & Naming · Decision Precedence · Template Selection · Function & Prefix Docs · Concept Docs · Pattern Docs · Index Docs · Tutorial Docs · Website Wrapper Pages · **Extending Existing Content** · Content Scope · API Section · Code Examples · Dual Syntax · Cross-References · Tables · Alert Boxes · `<details>` Sections · Content Tone · Section Headings · Length Targets · Verification Checklist.

## File Locations & Naming

| Type | Path | Naming |
|------|------|--------|
| API reference | `packages/{name}/docs/api/{export}.mdx` | Match export name exactly, lowercase (`signal.mdx`, `on.mdx`, `foreach.mdx`, `cssvars.mdx`) |
| Concept | `packages/{name}/docs/concepts/{topic}.mdx` | Lowercase, hyphenated (`error-handling.mdx`, `reactive-refs.mdx`, `lazy-loading.mdx`) |
| Pattern | `packages/{name}/docs/patterns/{topic}.mdx` | Lowercase topic (`reactivity.mdx`, `routing.mdx`, `styling.mdx`) |
| Package index | `packages/{name}/docs/index.mdx` | Always `index.mdx` |
| Website wrapper | `docs/src/pages/{section}/{package}/{name}.mdx` | Matches package doc |
| Tutorial | `docs/src/pages/learn/tutorials/{name}.mdx` | Lowercase app name |

### Frontmatter

- **Package docs** (`packages/*/docs/**/*.mdx`): No frontmatter.
- **Website wrapper pages** (`docs/src/pages/**/*.mdx`): Always include `title`, `description`, `layout`:

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

## Template Selection

1. **Function Doc** — Export has a function/object signature (`signal`, `mount`, `css`, `router`, `store`, `ForEach`, `$ref`)
2. **Prefix Doc** — Prefix-based feature with no function signature (`on:`, `bind:`, `e:`, `hook:`, `error:`)
3. **Concept Doc** — Explanatory content (`templates`, `error-handling`, `lifecycle-hooks`)
4. **Pattern Doc** — Copy-paste snippets (`reactivity`, `routing`, `styling`)
5. **Tutorial Doc** — Progressive-build walkthrough (`counter`, `todo`, `blog`)
6. **Index Doc** — Package landing page

## Function & Prefix Docs

Function docs use this structure. **Prefix docs are identical except**: use `## Usage` instead of `## Basic Usage`, and omit `## API`.

```
# {exportName}

One-line description of what the export does.

## API                                    ← Function docs only

TypeScript signature with parameter descriptions.

## Basic Usage / ## Usage                 ← "Basic Usage" for functions, "Usage" for prefixes

Self-contained, runnable example with imports.

## Key Concepts (optional but common)

### {Concept Name}

Sub-sections explaining behavior, patterns, or features.

## Important Considerations (optional)

### {Gotcha Name}

Pitfalls, anti-patterns, and edge cases.
```

### Section Rules

- **`# Title`**: Always present. Matches the export name exactly (`# signal`, `# ForEach`, `# $ref`, `# on:`). Never skip.
- **One-line description**: Always present immediately after the title. One sentence. Be consistent within a package (period for definition-style, no period for tagline-style).
- **`## API`** (function docs only): Always present. TypeScript signature with parameter descriptions. Method `###` sub-headings (Multi-Method Exports pattern) are reserved for exported methods only — never interleave usage/examples/concepts between method sub-headings; those belong under `## Key Concepts` as a `###`.
- **`## Basic Usage` / `## Usage`**: Always present. Self-contained, runnable, with imports.
- **`## Key Concepts`**: Present when there are multiple behaviors/features to explain. `###` sub-headings for each. Any non-standard content lives here as a `###`.
- **`## Important Considerations`**: For gotchas/anti-patterns/non-obvious behaviors. `###` sub-headings for each.

## Concept Docs

For conceptual content in `packages/{name}/docs/concepts/`.

```
# {Concept Name}

One-line description of the concept.

## {Section Name}

Explanation with code examples.

### {Sub-topic}

Detailed explanation.

... repeat sections ...
```

### Rules

- **`# Title`**: Always present. Capitalized concept name (`# Routing`, `# State`, `# Styling`).
- **`##` sections**: Free-form, organized by topic. Use descriptive section names.
- **Code examples**: Self-contained with imports on first example per page.
- **Cross-references**: Link to API docs on first mention of each export.
- **`<details>` blocks**: Internal mechanics sections go at end of the doc.

## Pattern Docs

For copy-paste snippets in `packages/{name}/docs/patterns/`.

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

### Rules

- **`# Title`**: Always present. Capitalized topic name (`# Reactivity`, `# Routing`, `# Styling`).
- **No `## Basic Usage` or `## API`**: Patterns use `###` headings directly.
- **Self-contained**: Every code block includes imports. Patterns must be copy-pasteable.
- **One pattern per `###`**: Each pattern is independent and solves a specific task.
- **Cross-references**: Link to API docs on first mention of each export.

## Index Docs

Each package has an `index.mdx` landing page.

```
## {PackageName}

One-sentence description of the package.

### Installation

```bash
npm install @hellajs/{name}
```

### Example

Self-contained example demonstrating core functionality (15–40 lines, with imports).

### API

- **[export](/reference/{package}/{export})**: Description
- **[export](/reference/{package}/{export})**: Description

### Concepts

- **[Concept](/learn/concepts/{name})**: Description

### Patterns

- **[Pattern](/learn/patterns/{name})**: Description
```

### Rules

- **`## Title`**: Uses `##` (not `#`) because the page is embedded in a larger layout. No `#` heading.
- **No frontmatter.**
- **Installation**: Always present. Just the npm install command.
- **Example**: Self-contained, 15–40 lines, demonstrating the primary use case with imports.
- **API / Concepts / Patterns**: Bullet lists with bold backtick-wrapped names linking to reference docs. The bold-link format (`**[name](/reference/...)**`) follows this template and does **not** require backticks — the backtick-wrapping rule applies to inline prose references only. Link on first mention only.

## Tutorial Docs

Tutorials follow a strict progressive-build pattern: each section adds code on top of the previous, building toward the complete app shown at the end. The working app lives in `examples/{name}/`.

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

### Rules

- **Frontmatter**: Always include `title`, `description`, `layout`. Import `Icon` from `astro-icon/components` when using alert boxes.
- **Language tag**: `tsx` for TypeScript tutorials, `jsx` for JavaScript tutorials.
- **Progressive build**: Each section adds code on top of the previous. Never removes or rewrites earlier code.
- **Context markers**: Use `//...` comments to show placement (`//... add after X`, `//... rest of the code unchanged`). **Never show full file repeats** — only new/changed code with surrounding context. The reader builds up from previous sections.
- **Code Explanation**: Always present after every code block. Bullet list with bold backtick-wrapped API names linking to reference docs on first mention. Factual tone (not conversational).
- **Alert boxes**: Use `<div role="alert" class="alert alert-error">` with Icon import for critical warnings (mutation pitfalls, reactivity gotchas). Follow with Good/Bad code examples.
- **Dev server callout**: Include `npm run dev` + URL (`http://localhost:5173`) in the section where the app first becomes interactive.
- **What You'll Learn**: Bold concept labels with brief descriptions. Link to reference docs on first mention using `[Concept](/reference/path)`.
- **Project Setup**: Always includes `### Installation` (npm commands) and `### Configuration` (vite config, tsconfig).
- **Next Steps**: 3 links to relevant tutorials/guides/concepts + one-line closing sentence.
- **Complete Code**: Full runnable code block matching `examples/{name}/src/main.tsx` (or `.jsx`) identically.

### Concept Section Order

Arrange sections so each introduces exactly one or two new concepts. Typical order:

1. **State** (signal or store) + mount
2. **Styles** (css, cssVars)
3. **Derived values** (computed)
4. **Controls / View** (event handlers, ForEach, bind directives)
5. **Effects** (effect, localStorage, side effects) — optional, only when persistence/side effects are part of the app

Adjust to match the app's build-up. State always comes first. Effects are optional and come last when used. Styles and controls may be combined into a single section for simpler apps.

## Website Wrapper Pages

`docs/src/pages/` pages are thin wrappers that import and render package docs. **Zero content of their own.**

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

- **Reference wrapper** (`docs/src/pages/reference/{package}/{name}.mdx`): Imports `@{package}/api/{name}.mdx`.
- **Concept wrapper** (`docs/src/pages/learn/concepts/{name}.mdx`): Imports `@{package}/concepts/{name}.mdx`.
- **Pattern wrapper** (`docs/src/pages/learn/patterns/{name}.mdx`): Imports `@{package}/patterns/{name}.mdx`.
- **Component name**: PascalCase derived from the file name (`signal.mdx` → `SignalContent`).
- **No content** between the import and the component tag.
- A wrapper MAY import and render more than one package doc, separated by `<div class="...border-t..."></div>`, when the website joins related concepts from different packages under a single URL (e.g., core and store state docs colocated at one learn URL). Each import must still follow the alias and PascalCase-component-name rules, and the wrapper must still contain zero prose.

## Extending Existing Content

Most real doc work extends an existing doc; it does not create a new one. Traverse this when adding an option, field, method, or section to an existing `.mdx`. Derived from §Multi-Method Exports, §Content Scope, §API Section.

```
Extending an existing doc?
├─ New option on a multi-method export's interface (e.g. invalidates on ResourceOptions)
│   ├─ Add the field to the interface block (verbatim signature + one-line description)
│   └─ Earn a ### under ## Key Concepts when the behavior warrants explanation
│       └─ Else leave it inline in the interface block with its description
├─ New method on a multi-method export
│   └─ Add a ### sub-heading under ## API per §Multi-Method Exports (never interleave usage between methods)
├─ New standalone export (re-exported by lib/index.ts)
│   └─ New file docs/api/{export}.mdx (Function doc) + new website wrapper page
├─ New gotcha / pitfall on an existing export
│   └─ ### under ## Important Considerations
├─ New behavior spanning multiple exports
│   └─ New file docs/concepts/{topic}.mdx (Concept doc); cross-reference from each API doc
└─ Copy-paste recipe for a pattern
    └─ New ### in docs/patterns/{topic}.mdx, or new patterns file if the topic is new
```

Never duplicate (§Splitting & Duplicate Rules): if two docs would cover the same content, show a brief summary in one and cross-reference the other.

## Content Scope

### What Goes Where

| Content | Location |
|---------|----------|
| Function signature + params | `api/{name}.mdx` → `## API` |
| Basic usage example | `api/{name}.mdx` → `## Basic Usage` |
| Behavior explanation (1–2 paragraphs) | `api/{name}.mdx` → `## Key Concepts` |
| Multi-topic conceptual guide | `concepts/{name}.mdx` |
| Gotchas/anti-patterns | `api/{name}.mdx` → `## Important Considerations` |
| Copy-paste code snippets | `patterns/{name}.mdx` |
| Step-by-step app build | `docs/src/pages/learn/tutorials/{name}.mdx` |

### Splitting & Duplicate Rules

- Only document exports from `index.ts`. Testing utilities and internal state accessors exported from `internal/` paths are **not** documented.
- When an API doc exceeds ~350 lines, evaluate whether `## Key Concepts` sections should move to a `concepts/` doc. Leave a brief summary in the API doc with a cross-reference.
- **Cross-reference rather than duplicate.** If two docs cover the same topic, show a brief summary with a cross-reference. The `mount` doc should not re-document lifecycle hooks — reference the `hook:` prefix doc instead:

```markdown
Elements support lifecycle hooks via the [`hook:`](/reference/dom/hook) prefix. See [`hook:`](/reference/dom/hook) for all available hooks.
```

## API Section

### Format

```typescript
function exportName<T>(paramName: ParamType): ReturnType
```

Followed by a bullet list of parameters:

- `paramName`: Terse one-line description.
- **Returns**: Description of the return value.

### Rules

- Use `typescript` language tag for the signature block.
- **Returns**: uses bold + colon as a separate bullet.
- Generic parameters shown in the signature (`<T>`); list separately only if they have constraints.
- Complex types (interfaces, unions) may be inline or in separate blocks below the signature.
- **Type accuracy**: Interface/type signatures must match the actual exported types from `index.ts`, including wrapper/view types. If the runtime type is a wrapper interface (e.g., a read-only view over an internal collection), document the wrapper by name — never substitute a familiar built-in (e.g., `Map`) that implies capabilities the wrapper does not provide. Code examples must only call methods the documented interface exposes.

### Overloaded Functions

Show each overload as a separate block with an inline comment describing when to use it. **Do not collapse overloads into a single union signature.**

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

### Multi-Method Exports

For exports exposing multiple methods (`resource`, `resourceCache`, `store`), document each method as a `###` sub-heading under `## API` with its own description and code example. Group methods by category when the list is long:

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

### Complex API Exception

For exports with very large API surfaces (25+ options), inline TypeScript interfaces with JSDoc-style comments are acceptable instead of the bullet-list format. Use only when bullet-list would be impractical due to volume.

## Code Examples

### Language Tags

- **Pure API code** (no JSX/html templates): `typescript`
- **JSX code blocks**: `jsx`
- **html template code blocks**: `js` (html templates use tagged literals, not JSX)
- **CSS with JSX**: `jsx`
- **CSS with TypeScript features**: `tsx`
- **Config files**: file type (`js` for vite.config.js, `json` for tsconfig.json, `bash` for shell commands)

### Import Style

Every code block must show relevant imports at the top:

```typescript
import { signal, computed } from '@hellajs/core';
```

- Use package imports (`@scope/package-name`), never relative paths.
- Only show imports needed for the example — not every dependency.
- First example in a doc must show the import for the export being documented. Subsequent examples in the same doc may omit if they're the same.
- Prefix docs (`on:`, `bind:`, etc.) must also show imports in their first example.

### Good/Bad Patterns

- `❌` for bad patterns (with comment explaining why)
- `✅` for good patterns (with comment explaining why)
- `⚠️` for warnings/important notes (use sparingly)

```typescript
// ❌ Direct mutation - no updates triggered
todos()[0].text = 'Learn Signals';

// ✅ Create new reference to trigger updates
todos(todos().map(todo => 
  todo.id === 1 ? { ...todo, text: 'Learn Signals' } : todo
));
```

### Variable Names

Descriptive names for signals, computed values, and effects. No single-letter names (`a`, `b`, `c`, `x`, `y`, `z`) — they obscure meaning.

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

Well-known math names (`x` for coordinate, `i` for index, `fn` for function parameter) are acceptable in context.

### Comment Style & No Test Assertions

- Comments explain **why**, not what. Terse and conversational.
- Inline comments for output expectations: `// Logs: "The count is: 5"`
- **Never** use test-framework assertions (`expect`, `toBe`, `toThrow`, `describe`, `it`, `test`) in documentation. Use comments and `console.log` output instead.

```typescript
// ❌ Test assertion
expect(() => badComputed()).toThrow('fail');

// ✅ Comment with try/catch
try {
  badComputed(); // Throws: Error 'fail'
} catch {}
```

### Implementation Accuracy

- Examples must accurately reflect actual behavior. Simplifications that omit error handling/edge cases must include a comment noting what is simplified.
- **Static vs reactive**: `css()` evaluates values eagerly — never pass functions as property values (they are stringified into the output). For reactive styles, use `cssVars()` or resolve conditions before calling `css()`.
- **No silent no-ops**: Every example must do what its comments claim. If reading from a cache/store/resource, populate that source earlier in the same block (or in a clearly-marked prior setup block). Do not demonstrate `get`/`read`/`data()` against keys that were never written — the silent `undefined` return contradicts the prose and teaches the wrong contract. When demonstrating methods whose effect depends on prior state (cache TTL, ongoing requests, configuration), seed that state explicitly.
- **Callback parameter types**: Examples must treat parameters as the type the implementation actually passes. If a hook is typed `(err: unknown) => void` and passes the raw error, examples must not access `.category` or `.code` without a type guard. If the implementation never invokes a callback for a given condition (e.g., error handler skipped for aborts), examples must not show that callback firing. Document categorized/wrapped variants separately from raw callbacks.

### Code Block Length

5–30 lines. If >30, simplify. If the concept genuinely requires more, use context markers (`//...`) to omit irrelevant parts.

## Dual Syntax (JSX + html)

### When to Show Both

Show both JSX and html template syntax when:
- The feature is DOM-specific with meaningfully different JSX and html forms (`ForEach`, `Portal`, `Lazy`, `Transition`)

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

- Always backtick-wrap function/method names in cross-references. Plain text for concept references.
- Always use full path format — never relative links.
- Link on first mention of an export within a doc. Subsequent mentions don't need links.
- Section headings should not contain links.
- No `## Related` section — use inline cross-references in text.
- **Index bullets**: The bold-link format in index docs (`**[name](/reference/...)**`) follows the Index Docs template and does not require backticks. The backtick-wrapping rule applies to inline prose references only.

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

## Tables

Use for structured data: error categories/status enums, hook timing reference, option lists with types and descriptions, timeline comparisons.

```markdown
| Time | State | Behavior |
|------|-------|----------|
| 0-30s | Fresh | Returns cached data instantly |
| 30s+ | Stale | Returns cached data + background fetch |
```

- Tables supplement text explanations — don't use them as a replacement.
- Always include header row.
- Keep columns narrow enough for readable rendering.

## Alert Boxes

Use Astro alert syntax for callouts needing visual emphasis:

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

For single-sentence callouts needing more emphasis than an inline emoji but less than a full alert box, use a blockquote with leading `⚠️`:

> ⚠️ **Performance**: snapshot accesses every signal in the store.

At most one per section. Prefer inline `⚠️` for in-code warnings; Astro alert boxes for multi-sentence or critical warnings.

## `<details>` Sections

For internal implementation mechanics that are educational but not required for API usage.

```html
<details>
<summary>Internal Mechanics</summary>

Content explaining implementation details.

</details>
```

- Always use `Internal Mechanics` as the summary label.
- Place at the end of the doc (after all standard sections).
- Content explains *how* the system works internally, not *how to use* it.
- Use sparingly — most docs don't need them. Common in concept docs, rare in API docs.
- Good candidates: template AST structure, reconciliation algorithm internals, event delegation routing. Not needed for: configuration options, usage patterns, API behavior.

## Content Tone

All doc types: present tense, no hedging ("Prevents propagation" not "Helps prevent propagation").

- **API Docs**: Direct and factual. No "you can" or "you might want to". Describe behavior, not intentions: "Signals create reactive links" not "You can use signals to create reactive links". "Returns a class name" not "Will return a class name".
- **Concept Docs**: Explanatory and educational. May use analogies. Still present tense, no hedging. Cross-reference API docs on first mention of each export.
- **Pattern Docs**: Terse. Minimal prose, let the code speak. One sentence intro per pattern, then the code block.
- **Tutorial Docs**: Conversational ("Let's build...", "Now add...", "Try clicking..."). Present tense for descriptions, imperative for instructions. Code Explanation bullets use factual tone (not conversational).

## Section Headings

Headings at every level (`#`, `##`, `###`, `####`) must describe their specific topic. Generic labels — `Overview`, `Summary`, `Comparison`, `Implementation`, `Lifecycle`, `Details` — communicate nothing to a reader scanning the table of contents and are **banned**. Source-code dumps belong in a `<details>` block with the summary `Internal Mechanics` (see `<details>` Sections), not under a generic `### Implementation` heading.

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

## Verification Checklist

Run this when holding a Docs file (`.mdx` / `.md`). Each item is a yes/no or a cross-check. This is the audit floor stated where the rules live; the audit skill reads it instead of reconstructing it from prose. Docs-only input skips `bun coverage` — it verifies code, not prose.

**Location & template**
- [ ] File at the right path per §File Locations & Naming; filename matches export name (API) or is lowercase-hyphenated (concepts/patterns)
- [ ] Correct template from §Template Selection (Function / Prefix / Concept / Pattern / Index / Tutorial)
- [ ] Every new/extended section follows §Extending Existing Content

**Frontmatter**
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter
- [ ] Website wrappers (`docs/src/pages/**/*.mdx`) carry `title`, `description`, `layout`

**Structure (Function & Prefix docs)**
- [ ] `# Title` matches the export name exactly (`# signal`, `# ForEach`, `# on:`)
- [ ] One-line description immediately after the title
- [ ] `## API` present (Function docs only); `## Basic Usage` (functions) / `## Usage` (prefixes)
- [ ] Multi-method exports use `###` sub-headings under `## API`; no usage interleaved between methods

**Code examples**
- [ ] `typescript` for pure API; `jsx` for JSX; `js` for html templates; correct tag per §Language Tags
- [ ] Imports shown (package imports `@hellajs/...`, never relative); first example imports the documented export
- [ ] No test-framework assertions (`expect` / `toBe` / `describe` / `it` / `test`) — use comments and `console.log`
- [ ] No single-letter variable names (well-known `i`, `x`, `fn` excepted)
- [ ] No silent no-op — every `get`/`read`/`data()` demo reads a key that was written earlier in the block
- [ ] Blocks 5–30 lines; `//…` context markers for longer

**Accuracy**
- [ ] Every code example compiles against current source signatures (cross-check `lib/index.ts`)
- [ ] Interface signatures match the actual exported types verbatim (wrapper types named, never substituted)
- [ ] No claim contradicts the implementation — cross-checked against source and tests
- [ ] Callback parameter types match what the implementation passes

**Cross-references & tone**
- [ ] Function/method names backtick-wrapped in cross-references; concepts in plain text
- [ ] Full path format `/reference/{package}/{export}`; link on first mention only
- [ ] No `## Related` section; cross-references inline
- [ ] Present tense, no hedging; tone matches doc type (API = factual, Concept = educational, Pattern = terse)

**Length**
- [ ] Within target per §Length Targets; action taken if exceeded
