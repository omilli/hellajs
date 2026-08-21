# Comparison Doc Template

The section structure every `[package]-comparison.md` must follow. Fixed sections are mandatory — do not skip or rename them. Domain sections are selected from the candidate list based on the package being compared. Number sections sequentially starting at 1.

Copy the dom comparison's voice and density as the reference quality bar: `packages/dom/dom-comparison.md`.

---

## Fixed structure (every package)

```markdown
# HellaJS @hellajs/[package] vs. [Competitor 1] / [Competitor 2] / ... / [Competitor N]

A ground-up comparison based on the actual source code of `@hellajs/[package]` v2. Every claim below was verified against `packages/[package]/lib/`.

---

## 1. At-a-Glance Summary

| Dimension | HellaJS [package] | [Competitor 1] | [Competitor 2] | ... |
|---|---|---|---|---|
| [dimension 1] | ... | ... | ... | ... |
| [dimension 2] | ... | ... | ... | ... |

[One paragraph positioning HellaJS relative to the competitors.]

---

## 2. [Primary Architecture Section]

### HellaJS

- [Mechanism, cited with file]
- [Mechanism, cited with file]

### [Competitor 1]

- [How it works]

### [Competitor 2]

- [How it works]

...

**Verdict:** [One paragraph stating where HellaJS sits relative to the competitors.]

---

## 3. Dependencies

Bundle/byte-size numbers are intentionally excluded — they are point-in-time, frequently unverifiable (size APIs fail), and drift faster than any other claim in the doc. Dependency facts come from each package's `package.json`.

| | HellaJS ([package]) | [Competitor 1] | [Competitor 2] | ... |
|---|---|---|---|---|
| Runtime deps | [fetched from package.json] | [fetched] | [fetched] | ... |
| Peer deps | [fetched from package.json] | [fetched] | [fetched] | ... |

[Bullet points on dependency model, package split, tree-shaking.]

---

[... domain-specific sections (see below) ...]

---

## N. Built-in Features Matrix

| Feature | HellaJS | [Competitor 1] | [Competitor 2] | ... |
|---|---|---|---|---|
| [feature 1] | ... | ... | ... | ... |
| [feature 2] | ... | ... | ... | ... |

### Notable HellaJS differentiators

- [Differentiator 1] — `(lib/[file].ts)`
- [Differentiator 2] — `(lib/[file].ts)`

---

## N+1. Ergonomics & Syntax

[Code examples showing the HellaJS API. One or two short snippets. Then a paragraph comparing the API shape to competitors.]

---

## Bottom Line

[One paragraph positioning HellaJS architecturally relative to the competitors.]

What sets HellaJS apart — and no single competitor matches all of:

1. **[Differentiator 1]** — [one sentence]
2. **[Differentiator 2]** — [one sentence]
...

Its gaps are [honest list: ecosystem size, SSR, devtools, maturity, etc.].
```

---

## Domain-specific section candidates

Pick the sections relevant to the package. Each becomes a numbered `##` section between section 3 (Dependencies) and the Built-in Features Matrix. Adapt the section title to the package's domain.

### For `core` (reactive primitives)

- **Reactivity Granularity** — per-binding vs component-subtree, glitch-free guarantees, untracked reads.
- **Dependency Graph & Propagation** — DAG structure, topological execution, depth-first propagation.
- **Memory Management & GC** — link reuse, computed auto-disposal, effect cleanup.
- **Batching & Scheduling** — how multiple updates coalesce, effect queue, flush order.

### For `dom` (DOM rendering)

*(Already generated. See `packages/dom/dom-comparison.md` for the section list.)*

### For `css` (CSS-in-JS)

- **Style Generation Strategy** — runtime injection vs build-time extraction, CSSOM vs textContent.
- **Scoping Model** — global by default, `name` for scoped, vs hashed class names vs atomic classes.
- **Reactive Variables** — `cssVars()` signal-driven custom properties, vs CSS variables in competitors.
- **Memory Management** — reference counting, auto-cleanup at zero refs, vs static injection.
- **Type Safety** — `csstype` integration, vs template literal types vs runtime objects.

### For `resource` (async data fetching)

- **Caching Model** — fetcher-scoped nested cache, TTL/staleTime, LRU eviction.
- **Request Deduplication** — shared promises, subscriber sets, vs dedup keys in competitors.
- **Abort & Cancellation** — AbortController propagation, signal composition, timeout.
- **Mutations & Optimistic Updates** — `mutate()` with onMutate hooks, vs mutation APIs in competitors.
- **Stale-While-Revalidate** — staleTime + background refresh, vs SWR patterns.
- **Retry & Polling** — configurable retry strategies, refetchInterval, visibility awareness.

### For `router` (client-side routing)

- **Route Matching** — pattern matching engine, nested route recursion, specificity sorting.
- **Navigation Model** — History API integration, programmatic navigation, parameter substitution.
- **Lifecycle Hooks** — before/after execution order, non-blocking error handling.
- **Parameter & Query Handling** — dynamic segments, wildcard capture, inheritance.
- **Bundle & Dependencies** — framework coupling vs standalone, peer deps.

### For `store` (reactive state)

- **Reactivity Model** — plain object → granular signal conversion, vs proxy vs immutable vs atomic.
- **Update Mechanism** — `update()` partial deep merge, draft mutator, vs reducers vs direct mutation.
- **Snapshot / Serialization** — computed plain-object view, vs selectors vs getters.
- **Granularity** — per-property signals vs whole-state subscriptions, deep reactivity depth.
- **TypeScript Inference** — conditional readonly types, vs manual typing vs runtime checks.
- **Memory Management** — recursive cleanup, vs auto-GC vs manual disposal.

---

## Dimension labels for the At-a-Glance table

Adapt to the package. Common dimensions:

| Dimension | Applies to |
|---|---|
| Reactive model | core, dom, store |
| Rendering strategy | dom |
| Caching model | resource |
| Styling approach | css |
| Routing model | router |
| State shape | store |
| Virtual DOM | dom |
| Compile step | core, dom, css |
| External deps | all |
| Templating / API shape | all |
| Language / type safety | all |
| Mutability model | store |
| Hook / lifecycle model | router |

---

## Hard rules

- Section numbering is sequential and continuous. No gaps, no restarts.
- Every `###` subsection in the architecture deep-dive gets one paragraph minimum — never just a bullet list.
- The Built-in Features Matrix must include at least 6 feature rows.
- The Notable Differentiators list must cite `file` (no line numbers) for each item.
- The Bottom Line must list at least 3 differentiators and at least 2 honest gaps.
- Tables use `|` pipes, not HTML.
- No emojis.
