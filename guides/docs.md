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
| Callable namespace member (`ssr.async`)? | §API Section → Callable Namespaces |
| Language tag for a code block? | §Code Examples → Language Tags |
| Both JSX and html in one example? | §Dual Syntax → Never Mix in One Block |
| Import style? | §Code Examples → Import Style |
| Cross-reference link format? | §Cross-References |
| Frontmatter rules? | §File Locations & Naming → Frontmatter |
| Length limits per doc type? | §Length Targets |
| Em/en dash usage? | §Typography |
| Section heading naming (banned generics)? | §Section Headings |
| Tutorial progressive-build? | §Tutorial Docs |
| Website wrapper page? | §Website Wrapper Pages |
| Site-only / cross-package page? | §Website Wrapper Pages → Site-Authored Content Pages |

Sections in order: File Locations & Naming · Decision Precedence · Template Selection · Function & Prefix Docs · Concept Docs · Pattern Docs · Index Docs · Tutorial Docs · Website Wrapper Pages · **Extending Existing Content** · Content Scope · API Section · Code Examples · Dual Syntax · Cross-References · Tables · Alert Boxes · `<details>` Sections · Content Tone · Typography · Section Headings · Length Targets · Verification Checklist.

## File Locations & Naming

| Type | Path | Naming |
|------|------|--------|
| API reference | `packages/{name}/docs/api/{export}.mdx` | Match export name exactly, lowercase (`signal.mdx`, `on.mdx`, `foreach.mdx`, `cssvars.mdx`) |
| Concept | `packages/{name}/docs/concepts/{topic}.mdx` | Lowercase, hyphenated (`error-handling.mdx`, `reactive-refs.mdx`, `lazy-loading.mdx`) |
| Pattern | `packages/{name}/docs/patterns/{topic}.mdx` | Lowercase topic (`reactivity.mdx`, `routing.mdx`, `styling.mdx`) |
| Package index | `packages/{name}/docs/index.mdx` | Always `index.mdx` |
| Website wrapper | `docs/src/pages/{section}/{package}/{name}.mdx` | Matches package doc |
| Tutorial | `examples/{name}/tutorial.mdx` | Lowercase app name, always `tutorial.mdx` |

### Frontmatter

- **Package docs** (`packages/*/docs/**/*.mdx`) and **tutorial content docs** (`examples/*/tutorial.mdx`): No frontmatter.
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
2. **Prefix Doc** — Prefix-based feature with no function signature (`on:`, `e:`, `hook:`, `error:`)
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

Tutorials follow a strict progressive-build pattern: each section adds code on top of the previous, building toward the complete app shown at the end. The tutorial doc AND the working app both live in `examples/{name}/` — `tutorial.mdx` sits next to the code it documents. The website page is a thin wrapper (§Website Wrapper Pages).

### Template

```astro
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

- **Frontmatter**: none — the wrapper page owns `title`, `description`, `layout`. **Language tag**: `tsx` (TS tutorials) / `jsx` (JS).
- **Progressive build**: each section adds code on top of the previous; never removes or rewrites earlier code. **Context markers** (`//... add after X`, `//... rest unchanged`) show placement — never full file repeats; the reader builds up from previous sections.
- **Exercise blanks**: `/**/` marks a reader-filled blank (`const filter = /**/;`), legal alongside `//...` markers. `bun doc-snippets` skips blocks containing `/**/` (answers vary); every non-blank line must still be valid for the language tag, and the answer must appear in a later section or Complete Code.
- **Code Explanation**: always after every code block — bullet list, bold backtick-wrapped API names linking to reference docs on first mention, factual tone.
- **Alert boxes**: `<div role="alert" class="alert alert-error">` + `<span>⚠️</span>` for critical warnings (mutation pitfalls, reactivity gotchas), followed by Good/Bad examples. No component imports — content docs live outside `docs/`.
- **Dev server callout**: in the section where the app first becomes reachable, the actual run command + URL — Vite: `npm run dev` + `http://localhost:5173`; Bun-served SSR: the serve command (`bun src/server.js`) + its URL.
- **What You'll Learn**: bold concept labels + brief descriptions, linked to reference docs on first mention. **Project Setup**: always `### Installation` (npm commands) + `### Configuration` (vite config, tsconfig).
- **Next Steps**: 3 links + one-line closing sentence. **Complete Code**: every source file under `examples/{name}/src/` appears identically (ambient shims like `vite-env.d.ts` may be omitted); single-file apps one block, multi-file one `### `src/...`` heading + block per file; configs appear in Project Setup.

### Concept Section Order

Arrange sections so each introduces one or two new concepts. Typical order: 1. **State** (signal/store) + mount → 2. **Styles** (css, style, vars) → 3. **Derived values** (computed) → 4. **Controls/View** (event handlers, ForEach, bind directives) → 5. **Effects** (effect, localStorage) — optional, last, only when persistence/side effects are part of the app. Adjust to the app's build-up; State always first; Styles and controls may merge for simple apps.

## Website Wrapper Pages

`docs/src/pages/` pages are thin wrappers that import and render package docs and example tutorials. **Zero content of their own** — except the sanctioned site-authored kind below.

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
| `@ssr/` | `packages/ssr/docs/` |
| `@examples/` | `examples/` |

### Rules

- **Reference wrapper** (`docs/src/pages/reference/{package}/{name}.mdx`): imports `@{package}/api/{name}.mdx`. **Concept wrapper** (`learn/concepts/{name}.mdx`): `@{package}/concepts/{name}.mdx`. **Pattern wrapper** (`learn/patterns/{name}.mdx`): `@{package}/patterns/{name}.mdx`.
- **Component name**: PascalCase from the file name (`signal.mdx` → `SignalContent`). **No content** between the import and the component tag.
- A wrapper MAY import and render multiple package docs, separated by `<div class="...border-t..."></div>`, when the site joins related concepts from different packages under one URL — each import still follows the alias + PascalCase rules, and the wrapper still carries zero prose.

### Site-Authored Content Pages

Content spanning packages or site-only (quick-start, testing patterns) may live as a **site-authored content page** under `docs/src/pages/`: full body content, complete frontmatter, no package-doc import. The zero-content rule applies only to import-rendering wrappers. Registration duties unchanged — `nav.ts` + enumeration index. `bun lint:structure` check 4 detects the kind by the absent package-doc import and exempts it from the zero-content rule, never from the frontmatter rule.

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
| Step-by-step app build | `examples/{name}/tutorial.mdx` |

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
- **Type accuracy**: interface/type signatures match the actual exported types from `index.ts`, including wrapper/view types. If the runtime type is a wrapper interface (a read-only view over an internal collection), document the wrapper by name — never substitute a familiar built-in (`Map`) implying capabilities it lacks. Code examples only call methods the documented interface exposes.

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

### Callable Namespaces

Members of a callable namespace (`ssr.async`, `ssr.stream`) must be shown as valid TypeScript — a typed namespace-object signature block or a real call site. Never pseudo-syntax like `ssr.async(node: HellaNode): Promise<string>`: it parses as neither a declaration nor an expression, so a reader cannot paste it into a `.ts` file.

```typescript
// ✅ Signature — typed namespace-object declaration
declare namespace ssr {
  function async(node: HellaNode): Promise<string>;
}

// ✅ Call site — a real expression
const body = await ssr.async(html`<p>Hello ${() => user(1)}</p>`);
```

```typescript
// ❌ Pseudo-syntax — not valid TypeScript
ssr.async(node: HellaNode): Promise<string>
```

Document each member as its own `###` under `## API` (Multi-Method Exports pattern) with the signature block above plus a self-contained example.

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
- Prefix docs (`on:`, `e:`, etc.) must also show imports in their first example.

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

- Examples must reflect actual behavior; simplifications that omit error handling/edge cases carry a comment noting what is simplified.
- **Static vs reactive**: `css()` and `style()` throw on function values — reactive leaves belong to `vars()`. Resolve conditions before the call; for style values that track signals, author tokens with `vars()` and consume its `var()` references.
- **No silent no-ops**: every example does what its comments claim. Demos of `get`/`read`/`data()` read keys written earlier in the same block (or a clearly-marked setup block) — a silent `undefined` return contradicts the prose and teaches the wrong contract. Methods whose effect depends on prior state (cache TTL, ongoing requests, configuration) seed that state explicitly.
- **Callback parameter types**: examples treat parameters as the type the implementation passes. A hook typed `(err: unknown) => void` passing the raw error → examples must not access `.category`/`.code` without a type guard; a callback the implementation never invokes for a condition (error handler skipped for aborts) → examples must not show it firing. Document categorized/wrapped variants separately from raw callbacks.

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

### Never Mix in One Block

A single fenced block never mixes the two syntaxes: no `html` tagged literal inside a `jsx`-tagged block, no JSX inside a `js`-tagged template block. The language tag promises one syntax (§Language Tags); a mixed block breaks that contract and teaches neither form in isolation. Show dual syntax as two separately-tagged examples per §How to Show Both.

```jsx
// ❌ jsx-tagged block carrying an html`` body — mixed syntax
onError(() => html`<div class="error">Something went wrong</div>`);
```

```jsx
// ✅ jsx block — JSX only
onError(() => <div class="error">Something went wrong</div>);
```

```js
// ✅ js block — html`` template only
onError(() => html`<div class="error">Something went wrong</div>`);
```

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
- Use `<div role="alert" class="alert alert-error">` with a `<span>⚠️</span>` for critical warnings in tutorials. Never import site-only components (e.g. `astro-icon`) in content docs — they live outside `docs/` and cannot resolve them.

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

## Typography

Em dashes (`—`, `&mdash;`, `&#8212;`, `&#x2014;`, `&#8213;`) and en dashes (`–`, `&ndash;`, `&#x2013;`) are **banned** in every user-facing file: root and site READMEs, `packages/{pkg}/docs/**/*.mdx`, package `README.md` / `CHANGELOG.md` / `{pkg}-comparison.md`, `plugins/{p}/README.md`, `examples/*/tutorial.mdx`, `docs/src/pages/**/*.mdx`, and `.changeset/*.md`. The ban covers prose, tables, frontmatter descriptions, and comments inside code blocks (fences are no exemption: tutorial code comments are user-visible). ASCII `-` stays legal everywhere (`--` CSS custom properties, `---` rules, hyphenated names).

Rewrite per occurrence, never a mechanical `" - "`:

- Definitional appositive (`X — Y` where Y defines X): colon, `X: Y`.
- Linked clauses: semicolon, or two sentences where emphasis deserves it.
- Aside or supplement: parentheses, or a comma when light. Paired dashes (`X — Y — Z`): parentheses or commas.
- Table cell (`Yes — detail`): `Yes: detail`.
- Code comment (`… — detail`): `…; detail` or `. detail` (fits §Code Examples → Comment Style & No Test Assertions).
- Numeric range: ASCII hyphen (`5-30`), never an en dash.

Rewrites must not change meaning, link targets, identifiers, or fenced code semantics. Where a sentence reads worse after rewrite, restructure the sentence instead of forcing a colon. Enforcement: `bun em-dash`, composed into `bun lint:guards` (CI). Agent-facing files (AGENTS.md, guides, memory, plans) are exempt.

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
- [ ] Site-authored content pages (no package-doc import) carry complete frontmatter and are registered in `nav.ts` + their enumeration index

**Structure (Function & Prefix docs)**
- [ ] `# Title` matches the export name exactly (`# signal`, `# ForEach`, `# on:`)
- [ ] One-line description immediately after the title
- [ ] `## API` present (Function docs only); `## Basic Usage` (functions) / `## Usage` (prefixes)
- [ ] Multi-method exports use `###` sub-headings under `## API`; no usage interleaved between methods
- [ ] Callable-namespace members shown as valid TypeScript — typed namespace-object block or call site, never pseudo-syntax (§API Section → Callable Namespaces)

**Code examples**
- [ ] `typescript` for pure API; `jsx` for JSX; `js` for html templates; correct tag per §Language Tags
- [ ] No fenced block mixes JSX and html-template syntax — dual syntax is two separately-tagged blocks (§Dual Syntax → Never Mix in One Block)
- [ ] Imports shown (package imports `@hellajs/...`, never relative); first example imports the documented export
- [ ] No test-framework assertions (`expect` / `toBe` / `describe` / `it` / `test`) — use comments and `console.log`
- [ ] No single-letter variable names (well-known `i`, `x`, `fn` excepted)
- [ ] No silent no-op — every `get`/`read`/`data()` demo reads a key that was written earlier in the block
- [ ] Blocks 5–30 lines; `//…` context markers for longer

**Tutorials**
- [ ] Dev-server callout: run command + served URL in the section where the app first becomes reachable (Vite `npm run dev` → `http://localhost:5173`; Bun-served → serve command + its URL)
- [ ] Exercise blanks are `/**/` only, remaining lines valid for the language tag, answers appear in a later section or Complete Code (doc-snippets skips `/**/` blocks)

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

**Typography**
- [ ] No em/en dashes or their HTML entities in any user-facing file (prose, tables, frontmatter descriptions, code-block comments); numeric ranges use ASCII hyphens; enforced by `bun em-dash` (composed into `bun lint:guards`)

**Length**
- [ ] Within target per §Length Targets; action taken if exceeded
