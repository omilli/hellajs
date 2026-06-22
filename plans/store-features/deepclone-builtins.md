## [ ] Extend deepClone to handle Date, Map, Set, RegExp

### Depends On
None

### Objective
`deepClone` in `lib/draft.ts` correctly clones `Date`, `Map`, `Set`, and `RegExp` instances instead of silently corrupting them into empty plain objects, so the `store.update(draft => ...)` mutator path works on stores containing these built-ins.

### Sub-tasks

#### [ ] deepClone type branches (Code)
**Solution:**
Modify `packages/store/lib/draft.ts:8-21` to add early-return branches before the plain-object loop. Today the function falls through to the plain-object clone path for `Date` / `Map` / `Set` / `RegExp`, and because `Object.keys()` returns `[]` for all four (none expose their state as own enumerable properties), the "clone" becomes `{}`. The store's draft mutator then either throws (mutating `{}` instead of a `Map`) or silently drops the value. The note in `packages/store/AGENTS.md:105` ("Date, Map, Set, RegExp pass through by reference") is itself wrong — they do not pass through; they get corrupted to `{}`.

New branches inserted after the `Array.isArray` check and before the plain-object clone:

- `Date`: `new Date(obj.getTime())` — primitive value clone.
- `RegExp`: `new RegExp(obj.source, obj.flags)` — preserves flags; `lastIndex` is not cloned (matches structured-clone semantics).
- `Map`: `new Map()` then iterate `Array.from(obj.entries())` with `deepClone` on each value (Map keys are reference-identity by spec; values may themselves be nested objects that need cloning).
- `Set`: `new Set()` then iterate `Array.from(obj.values())` with `deepClone` on each item.

Use the cached `while` loop pattern from `guides/code.md` Loops for the `Map` / `Set` iteration — materialize entries once via `Array.from`, then iterate by index. No `for...of`.

`extractChanges` (`lib/draft.ts:28-78`) needs no change — `Date` / `Map` / `Set` / `RegExp` all fail the `isPlainObject(draftVal)` check at `lib/draft.ts:56` and fall through to the `origVal !== draftVal` reference branch at `lib/draft.ts:69`. The cloned instance diverges from the original after a user mutation, so the whole value is correctly written to the underlying signal. This matches how arrays already work today.

Cited evidence: `file` `lib/draft.ts:8-21` (deepClone falls through to plain-object branch for non-array objects); `file` `packages/store/AGENTS.md:105` (incorrect non-obvious-behavior note); `file` `packages/store/CLAUDE.md:105` (duplicate of the same note); `test` missing — no test exercises `Date` / `Map` / `Set` / `RegExp` through `store.update(draft => ...)`.

**Definition of Done:**
- [ ] `bun check store` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by the package's `index.ts`)
- [ ] No new runtime dependency, OR the dependency is justified in Solution and a changeset exists
- [ ] Backward compatible, OR a changeset exists at `.changeset/*.md` describing the break
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`

#### [ ] deepClone built-ins tests (Tests)
**Solution:**
Extend `packages/store/tests/update.test.ts` draft-mutator section (or split into new `packages/store/tests/draft.test.ts` if the file would exceed the 400-line soft cap from `guides/tests.md` Files). One test per type, each verifying the draft is a real clone (not `{}`, not the original reference):

- `Date` mutation: `draft.timestamp.setHours(0)` — underlying signal holds a new `Date` with the mutated hours; original instance untouched.
- `Map` mutation: `draft.lookup.set("k", "v")` — underlying signal holds a new `Map` with the new entry; original untouched.
- `Set` mutation: `draft.tags.add("new")` — underlying signal holds a new `Set`; original untouched.
- `RegExp` replacement: `draft.pattern = new RegExp("abc", "g")` — round-trips through the leaf-signal branch.
- Deep nested clone: store with `Map<string, { name: string }>` — mutating `draft.lookup.get("k").name` produces a fresh inner object, not a shared reference with the live store.

Use `toBeInstanceOf(Date | Map | Set | RegExp)` and reference-inequality assertions to prove the clone happened.

Cited evidence: `test` missing — no test in `packages/store/tests/` covers `Date` / `Map` / `Set` / `RegExp` through the draft path.

**Definition of Done:**
- [ ] `bun check store` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (the four new branches in `lib/draft.ts`)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, `await tick(); await tick()`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the implementation

#### [ ] Update AGENTS.md and CLAUDE.md non-obvious-behavior note (Docs)
**Solution:**
Edit `packages/store/AGENTS.md:105` and `packages/store/CLAUDE.md:105` non-obvious-behaviors section: remove or rewrite the "deepClone limited — handles plain objects and arrays only; Date, Map, Set, RegExp pass through by reference" line to reflect that `Date` / `Map` / `Set` / `RegExp` are now properly cloned (Map/Set values deep-cloned; Date/RegExp value-cloned). Both files carry identical instruction content and must stay in sync.

Cited evidence: `file` `packages/store/AGENTS.md:105`; `file` `packages/store/CLAUDE.md:105` (duplicate content).

**Definition of Done:**
- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (Function / Prefix / Concept / Pattern / Index)
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter
- [ ] Website wrapper pages (`docs/src/pages/**/*.mdx`) have `title`, `description`, and `layout`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] File name matches the export name (API docs) or is lowercase-hyphenated (concepts / patterns)
