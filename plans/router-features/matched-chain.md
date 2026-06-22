## [ ] Expose matched route chain on RouteInfo

### Depends On
None

### Objective
`RouteInfo` gains a `matched: { pattern: string }[]` field exposing the parent-to-leaf chain of route patterns that resolved for the current navigation, enabling breadcrumb rendering and active-link styling without requiring users to write their own matcher.

### Sub-tasks

#### [ ] matched field on RouteInfo (Code)
**Solution:**
Extend `RouteInfo` in `packages/router/lib/types.d.ts:131-142` with a new field:

```
matched: ReadonlyArray<{ pattern: string }>
```

The array is parent-to-leaf: `matched[0]` is the outermost matched pattern, `matched[matched.length - 1]` is the leaf. Each entry's `pattern` is the route-map key that matched at that nesting level (e.g. `"/admin"` then `"/users"` then `"/:id"`).

Populate the field in `packages/router/lib/utils.ts:177-256` `tryMatchRoute`:

- Nested branch (lines 190-222): the `nestedMatches` array already carries the chain. Map it to `{ pattern: string }[]` by reading each match's originating pattern. Note: `matchNestedRoute` (`packages/router/lib/match.ts:94-147`) does not currently surface the pattern on `RouteMatch` — the type at `lib/types.d.ts:147-160` has `routeValue`, `params`, `query`, `remainingPath`, `fullPath`, `meta` but no `pattern`. Add `pattern: string` to `RouteMatch` and populate it in `matchNestedRoute` where each `currentMatch` is constructed (lines 116-122). The pattern is already in scope as the destructured `[pattern, routeValue]` from the routeEntries iteration.
- Flat branch (lines 224-254): a single-element array `[{ pattern }]` where `pattern` is the matched flat-route key.
- `notFound` branch (lines 108-123): an empty array `[]` (no route matched). Use the frozen-empty pattern from `guides/code.md` Memory rules — a single `const EMPTY_MATCHED: readonly { pattern: string }[] = Object.freeze([])` shared across all notFound resolutions.

Attach `matched` to every `route({...})` call inside `tryMatchRoute` and `updateRoute`. The initial `route` signal in `packages/router/lib/state.ts:49-56` gets `matched: []` as its default.

The frozen-empty-shared-object pattern is consistent with `EMPTY_OBJECT` in `packages/router/lib/utils.ts:17` — same memory rule, same allocation discipline.

Files touched:

- `packages/router/lib/types.d.ts` — add `matched` to `RouteInfo`; add `pattern` to `RouteMatch`.
- `packages/router/lib/match.ts` — populate `pattern` on each `currentMatch` (lines 116-122).
- `packages/router/lib/utils.ts` — map `nestedMatches` / flat-route pattern into `matched` on every `route()` call (lines 114-120, 210-216, 242-248).
- `packages/router/lib/state.ts` — initial route signal includes `matched: []`.

No new exports, no new public functions. The change is additive to the `RouteInfo` type — non-breaking for users who destructure specific fields (`{ path, params }`); users who spread or deep-compare `RouteInfo` see the new field appear.

Cited evidence: `file` `packages/router/lib/utils.ts:201-220` (nestedMatches computed but only leaf exposed); `file` `packages/router/lib/match.ts:94-147` (matchNestedRoute returns chain but RouteMatch has no pattern field); `file` `packages/router/lib/types.d.ts:131-142` (RouteInfo has no matched field); `file` `packages/router/lib/types.d.ts:147-160` (RouteMatch type — pattern needs adding); `file` `packages/router/docs/patterns/routing.mdx` (no breadcrumb or active-link pattern exists).

**Definition of Done:**
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by the package's `index.ts`)
- [ ] No new runtime dependency, OR the dependency is justified in Solution and a changeset exists
- [ ] Backward compatible, OR a changeset exists at `.changeset/*.md` describing the break
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`

#### [ ] Matched chain tests (Tests)
**Solution:**
Extend `packages/router/tests/features.test.ts` (or new `tests/matched.test.ts` if the features file feels crowded). Cases:

- Flat route `/about` → `route().matched` equals `[{ pattern: "/about" }]`.
- Nested route `/admin/users` with config `{ "/admin": { children: { "/users": { handler: ... } } } }` → `route().matched` equals `[{ pattern: "/admin" }, { pattern: "/users" }]`.
- Three-level nested route → three-element chain, parent-to-leaf order.
- Wildcard route `/files/*` matching `/files/docs/readme.md` → `[{ pattern: "/files/*" }]`.
- Nested wildcard `/files` with child `/*` matching `/files/docs/readme.md` → `[{ pattern: "/files" }, { pattern: "/*" }]`.
- `notFound` resolution → `route().matched` equals `[]`.
- Initial `route()` signal (before any navigation resolves) → `matched` is `[]`.
- Dynamic segment route `/users/:id` → `matched` is `[{ pattern: "/users/:id" }]` (pattern preserves the `:id` form, not the resolved value).

Mock pattern per `guides/tests.md` — `expect(matched).toEqual([...])` for deep equality, no boolean flags.

Cited evidence: `test` missing — no test asserts `route().matched` because the field does not exist yet.

**Definition of Done:**
- [ ] `bun check router` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (`packages/router/lib/utils.ts` matched-mapping + `packages/router/lib/match.ts` pattern-population — name the file and line range in the commit message)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, `await tick(); await tick()`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the implementation

#### [ ] Matched chain docs (Docs)
**Solution:**
Update `packages/router/docs/api/route.mdx:5-17` — add `matched` to the `RouteInfo` type signature in the API block. Add a `### Matched Route Chain` sub-heading under `## Key Concepts` explaining the parent-to-leaf order, the empty-array notFound case, and how to use it for breadcrumbs (render `matched.map(segment => segment.pattern)` or look up segment names from a meta dictionary).

Add a `### Breadcrumbs` pattern to `packages/router/docs/patterns/routing.mdx` showing a reactive breadcrumb component that reads `route().matched` and renders links via `navigate()`.

Cited evidence: `file` `packages/router/docs/api/route.mdx:5-17` (RouteInfo type block — needs the new field); `file` `packages/router/docs/patterns/routing.mdx` (no breadcrumb pattern exists).

**Definition of Done:**
- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (Function / Prefix / Concept / Pattern / Index)
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter
- [ ] Website wrapper pages (`docs/src/pages/**/*.mdx`) have `title`, `description`, and `layout`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] File name matches the export name (API docs) or is lowercase-hyphenated (concepts / patterns)
