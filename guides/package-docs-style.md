# Package Docs Style Guide

Uniform conventions for all package reference documentation (`packages/{name}/docs/{export}.mdx`).

## Page Structure — Function Docs

Use this template for all exports with a function or object signature (e.g., `signal`, `mount`, `css`, `router`, `store`).

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

## Page Structure — Prefix Docs

Use this template for prefix-based features that have no function signature (`on:`, `bind:`, `e:`, `hook:`, `error:`).

# {prefix}

One-line description of what the prefix does.

## Usage

Self-contained example showing the primary use case.

## Key Concepts (optional but common)

### {Concept Name}

Sub-sections explaining behavior, attributes, or patterns.

## Important Considerations           (optional)

### {Gotcha Name}

Pitfalls, anti-patterns, and edge cases.

### Section Rules

- **`# Title`**: Always present. Matches the export name exactly (e.g., `# signal`, `# ForEach`, `# $ref`, `# on:`). Never skip this heading.
- **One-line description**: Always present immediately after the title. One sentence, no trailing period for tagline-style, or one sentence with period for definition-style. Be consistent within a package.
- **`## API`** (function docs) — Always present. Shows the TypeScript signature with parameter descriptions.
- **`## Basic Usage`** (function docs) / **`## Usage`** (prefix docs) — Always present. Show a self-contained, runnable example with imports.
- **`## Key Concepts`**: Present when there are multiple behaviors or features to explain. Use `###` sub-headings for each concept. Any content that doesn't fit the standard sections should live here as a `###` sub-heading.
- **`## Important Considerations`**: Present when there are gotchas, anti-patterns, or non-obvious behaviors to warn about. Use `###` sub-headings for each topic.

### Forbidden Headings

Do not use these as `##` section headings (they create inconsistency with the standard structure):

- `## Overview`: The one-line description after `# Title` serves this purpose. Use `## Key Concepts` or expand the description if more context is needed.
- `## Signature`: Use `## API` instead.
- `## How It Works`: Use `## Key Concepts` with an `### Implementation` sub-heading if internal mechanics are relevant.
- `## When You Need This`: Fold into `## Basic Usage` as introductory text.
- `## Comparison`: Use `## Key Concepts` with an `### Comparison` sub-heading.
- `## Related`: Use inline cross-references in text instead of a dedicated section.

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

### Complex API Exception

For exports with very large API surfaces (e.g., `resource` with 25+ options), inline TypeScript interfaces with JSDoc-style comments are acceptable instead of the bullet-list format. Use this only when the bullet-list format would be impractical due to volume.

### Multi-Method Exports

For exports that expose multiple methods (e.g., `resourceCache`, `store`), document each method as a `###` sub-heading under `## API`. Group methods by category when the list is long:

markdown
## API

### Read Methods

### `get`

Description of the method.

### `map`

Description.

### Write Methods

### `set`

Description.

## Code Examples

### Language Tags

- **Core, Router, Store**: Always use `typescript`
- **DOM with JSX**: Use `jsx`
- **DOM with html templates**: Use `js` (html templates use tagged literals, not JSX)
- **CSS with JSX**: Use `jsx`
- **CSS with TSX**: Use `tsx` (only when showing TypeScript-specific features like typed styles)

### Import Style

Every code block must show the relevant imports at the top:

```typescript
import { signal, computed } from '@hellajs/core';
```

- Use package imports (`@hellajs/core`, `@hellajs/dom`), never relative paths.
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

## Cross-References

Link to related functions using this format:

```markdown
[`name`](/reference/{package}/{name})
```

Always backtick-wrap function/method names in cross-references. Plain text for concept references.

[signal](/reference/core/signal)` → WRONG
[`signal`](/reference/core/signal)` → CORRECT
[templates](/learn/concepts/templates)` → CORRECT (concept, not a function)

### Rules

- Always use the full path format `/reference/{package}/{name}`.
- Link on first mention only — don't link the same export multiple times in a doc.
- Section headings should not contain links.
- Do not use a `## Related` section — use inline cross-references in text.

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

## Content Scope

Reference docs (`packages/{name}/docs/`) should focus on **API surface and basic usage**. Conceptual content (patterns, advanced features, detailed behavioral explanations) belongs in the learn section (`docs/src/pages/learn/`).

When a reference doc grows beyond ~500 lines, evaluate whether conceptual sections should move to `/learn/`.

## Package-Specific Conventions

### Core (`@hellajs/core`)

- All code blocks use `typescript` language tag.
- Always show `import { ... } from '@hellajs/core'`.

### DOM (`@hellajs/dom`)

- JSX examples use `jsx` language tag.
- html template examples use `js` language tag.
- Always show `import { ... } from '@hellajs/dom'`.
- Prefix-based features (`on:`, `bind:`, `e:`, `hook:`, `error:`) use the prefix doc template (no `## API`, use `## Usage`).
- Show both JSX and html template syntax where practical (like `ForEach`, `Portal`, `Lazy`).

### CSS (`@hellajs/css`)

- Examples use `jsx` language tag (or `tsx` when showing TypeScript features).
- Always show `import { ... } from '@hellajs/css'`.
- Cross-reference `cssRemove`, `cssReset`, `cssVarsReset` within the css package.

### Resource (`@hellajs/resource`)

- All code blocks use `typescript` language tag.
- May use inline TypeScript interfaces for complex API surfaces instead of bullet-list parameter descriptions.
- Use `###` sub-headings for each method/property on the resource object.
- Conceptual content (polling, retry, SWR, etc.) belongs in `/learn/`, not the reference doc.

### Router (`@hellajs/router`)

- All code blocks use `typescript` language tag.
- Route handler examples show `(params, query)` signature consistently.
- Use `navigate` examples with `params` and `query` options.

### Store (`@hellajs/store`)

- All code blocks use `typescript` language tag.
- Show `import { store } from '@hellajs/store'`.
- Document `snapshot`, `update`, `cleanup` as `###` sub-sections under `## API`.

## Dual Syntax (JSX + html)

When a DOM feature supports both JSX and html template syntax:

1. Show the primary example in JSX (under `## Basic Usage`).
2. Show the html template equivalent immediately after, under the same section or a dedicated `### html Template Syntax` sub-heading.
3. Both examples should be self-contained with imports.

## Content Tone

- Direct and factual. No "you can" or "you might want to".
- Describe behavior, not intentions: "Signals create reactive links" not "You can use signals to create reactive links".
- Use present tense: "Returns a class name" not "Will return a class name".
- Avoid hedging: "Prevents propagation" not "Helps prevent propagation".