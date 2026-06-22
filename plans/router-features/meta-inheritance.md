## [ ] Opt-in meta inheritance through nested match chain

### Depends On
None

### Objective
A new `inheritMeta: true` config flag on `router()` cascades parent-route `meta` down through the nested match chain using the same `{ ...parent, ...child }` spread pattern already used for params, with `navigate({ meta })` inline values still winning over the inherited result — closing the "meta from leaf route only" gap named in `router-comparison.md`.

### Sub-tasks

#### [ ] inheritMeta flag and cascade aggregation (Code)
**Solution:**
Add `inheritMeta?: boolean` to `RouterConfig` in `packages/router/lib/types.d.ts:77-90`. Default is `false` — preserves the current leaf-only behavior verified by `packages/router/tests/features.test.ts:128-145` and documented in `packages/router/AGENTS.md`.

Store the flag in a new signal alongside the existing config signals in `packages/router/lib/state.ts:8-44` — e.g. `export const inheritMeta = signal<boolean>(false);`. This follows the existing pattern (each config input gets its own signal). The signal is set in `router()` initialization in `packages/router/lib/router.ts:14-18` next to `routes`, `hooks`, `redirects`, `notFound`, `scrollBehavior`.

In `packages/router/lib/utils.ts:177-256`, `tryMatchRoute` currently reads meta from `lastMatch.routeValue` only (lines 207, 239). When `inheritMeta()` is true, walk `nestedMatches` parent-to-leaf and spread each `extractMeta(match.routeValue)` so child keys override parent keys — the exact pattern `matchNestedRoute` already uses for params at `packages/router/lib/match.ts:132-135` (`{ ...match.params, ...childMatch.params }`).

The aggregation loop follows the `guides/code.md` Loops rule (cached `while` with `len`, materialize once). For the nested branch:

```
const entries = Array.from(nestedMatches)
let i = 0
const len = entries.length
let inheritedMeta: Record<string, unknown> | undefined
while (i < len) {
  const segmentMeta = extractMeta(entries[i]!.routeValue)
  if (segmentMeta) inheritedMeta = { ...(inheritedMeta ?? {}), ...segmentMeta }
  i++
}
const meta = mergeMeta(inheritedMeta)
```

The flat-route branch reads meta off a single routeValue — no cascade needed; leave as-is.

`mergeMeta` (defined inline at `packages/router/lib/utils.ts:187-188`) continues to spread `inlineMeta` over the route-level (now possibly inherited) meta — `navigate({ meta })` still wins on key conflicts. This preserves the behavior verified by `packages/router/tests/features-nav.test.ts:73-100`.

No new runtime deps. No changes to `lib/internal/matched.ts` (its `extractMeta` at lines 84-89 already returns the raw routeValue meta; the cascade lives in `tryMatchRoute` where the match chain is available).

Cited evidence: `comparison` Section 7 ("Meta from the leaf route only" + "puts it behind TanStack and Vue Router on data richness"); `comparison` Bottom Line ("meta from leaf route only, not inherited up the tree"); `file` `packages/router/lib/utils.ts:204-207` (only reads `lastMatch.routeValue` meta); `file` `packages/router/lib/match.ts:132-135` (param spread precedent to mirror); `file` `packages/router/tests/features.test.ts:128-145` (test currently asserts parent meta absent); `file` `packages/router/AGENTS.md` (documents leaf-only as a Non-Obvious Behavior).

Non-breaking — opt-in flag, default preserves existing behavior. No changeset required for break; a changeset for the new feature is still added per changeset hygiene.

**Definition of Done:**
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by the package's `index.ts`)
- [ ] No new runtime dependency, OR the dependency is justified in Solution and a changeset exists
- [ ] Backward compatible, OR a changeset exists at `.changeset/*.md` describing the break
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`

#### [ ] Meta inheritance tests (Tests)
**Solution:**
Extend `packages/router/tests/features.test.ts` with a new `describe("inheritMeta", ...)` block. Cases:

- `router({ inheritMeta: true, routes: { "/admin": { meta: { section: "admin" }, children: { "/users": { meta: { title: "Users" }, handler: ... } } } } })` — navigate to `/admin/users` and assert `route().meta` equals `{ section: "admin", title: "Users" }` (parent key preserved, child key added).
- Child key overrides parent on conflict: parent `{ title: "Admin" }`, child `{ title: "Users" }` → result `{ title: "Users" }`.
- Three-level cascade: `/a` → `/b` → `/c` with meta at each level, all merged parent-to-leaf.
- `navigate("/admin/users", { meta: { title: "Override" } })` with `inheritMeta: true` still produces `{ section: "admin", title: "Override" }` — inline wins over inherited.
- Default behavior unchanged: same router config without `inheritMeta` produces `{ title: "Users" }` only (the existing assertion at `tests/features.test.ts:144` stays green).
- Flat route with `inheritMeta: true` — meta is unchanged (no cascade possible for flat routes).

Follow `guides/tests.md` — no `any`, no boolean-flag counters, descriptive signal names, one behavior per test.

Cited evidence: `test` missing — no test for meta inheritance exists; the existing `tests/features.test.ts:128-145` actively asserts the opposite (leaf-only).

**Definition of Done:**
- [ ] `bun check router` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (`packages/router/lib/utils.ts` meta-cascade block — name the line range in the commit message)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, `await tick(); await tick()`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the implementation

#### [ ] Meta inheritance docs (Docs)
**Solution:**
Update `packages/router/docs/api/router.mdx:136-159` (the `### Route Metadata` Key Concept). Add a paragraph after the current example explaining the `inheritMeta` flag, the parent-to-leaf merge order (mirrors param inheritance), the child-overrides-parent rule, and the inline-still-wins precedence. Include a runnable example showing nested routes with meta at multiple levels and the resulting `route().meta` shape.

Update `packages/router/docs/concepts/routing.mdx` Route Metadata section (around lines 367-382) with a cross-reference to the `inheritMeta` flag.

Cross-reference the existing param-inheritance paragraph (`docs/concepts/routing.mdx:132-137`) so readers see the parallel between param inheritance and meta inheritance.

Cited evidence: `file` `packages/router/docs/api/router.mdx:136-159` (current meta section, no mention of inheritance); `file` `packages/router/docs/concepts/routing.mdx:132-137` (param inheritance precedent to cross-reference).

**Definition of Done:**
- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (Function / Prefix / Concept / Pattern / Index)
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter
- [ ] Website wrapper pages (`docs/src/pages/**/*.mdx`) have `title`, `description`, and `layout`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] File name matches the export name (API docs) or is lowercase-hyphenated (concepts / patterns)
