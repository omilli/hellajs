## [ ] Atomic route signal writes

### Depends On
None

### Objective
The `route()` signal never exposes a partially-updated `RouteInfo` — every navigation (programmatic, `popstate`, or `hashchange`) writes the full resolved match (path + handler + params + query + meta + crumbs) in one atomic signal write, eliminating the transient `{ ...route(), path }` pre-write that today fires subscribed effects with stale `handler`/`params` for one synchronous flush cycle.

### Context

`signal.ts:50` of `@hellajs/core` runs `!batchDepth && flush()` synchronously after every non-batched write. Today `go()`, the `popstate` handler, and the `hashchange` handler each call `route({ ...route(), path: nextPath })` BEFORE calling `updateRoute()` (`packages/router/lib/utils.ts:103-108`, `packages/router/lib/router.ts:52-54`, `packages/router/lib/router.ts:58-62`). That pre-write triggers `flush()` immediately, so every effect/computed subscribed to `route()` re-runs once with `{ path: <new>, handler: <old>, params: <old>, ... }`, then re-runs again when `updateRoute()` writes the resolved match. The first run observes a `RouteInfo` that never logically existed.

The init-time pre-write at `packages/router/lib/router.ts:35-40` looks identical but is harmless: the `if (!route().handler)` guard skips it on re-init (prior route's handler is set), and on first init no subscribers exist yet. It also preserves the synchronous correctness of `router()`'s return value in hash mode (`return route()` at line 117). Left untouched.

### Sub-tasks

#### [ ] Atomic updateRoute signature (Code)
**Solution:**
Add an optional first parameter `nextPath` to `updateRoute` in `packages/router/lib/utils.ts:118`. New signature:

```typescript
export function updateRoute(
  nextPath?: string,
  inlineScroll?: ScrollBehavior | false,
  inlineMeta?: Record<string, unknown>
): void
```

Body uses `const currentPath = nextPath ?? route().path;` in place of the current `const currentPath = route().path;` at line 122. No other change to `updateRoute` internals — `tryRedirect(currentPath)` and `tryMatchRoute(currentPath, ...)` already take `currentPath` as a parameter, so the new path flows through unchanged. Update the JSDoc to document `@param nextPath Optional new path. When omitted, reads from route().path.`

Remove the three transient pre-writes. Each becomes a single `updateRoute(newPath, ...)` call:

- `go()` at `packages/router/lib/utils.ts:90-110` — replace lines 105-108 (`route({ ...route(), path: to }); updateRoute(scroll, meta);`) with `updateRoute(to, scroll, meta);`. The `pushState`/`replaceState` call above stays.
- `packages/router/lib/router.ts:52-54` (hashchange handler) — body becomes `updateRoute(getHashPath());`.
- `packages/router/lib/router.ts:58-62` (popstate handler) — body becomes `updateRoute(window.location.pathname + window.location.search);`.

Init pre-write at `packages/router/lib/router.ts:35-40` is left in place — harmless per Context, and removing it regresses hash-mode `router()` return value.

Recursive redirect chain still works: `updateRoute() → tryRedirect() → go(to) → updateRoute(to, ...)` — the inner call receives `nextPath = to`, uses it as `currentPath`, and either re-redirects or matches. Same recursion bounds as today (redirect chain length).

No new exports. `updateRoute` is not re-exported by `packages/router/lib/index.ts` (confirmed — barrel exports only `router`, `route`, `navigate`, `type *`). The signature change is internal.

No public API change — the user-observable contract (when `route()` notifies its subscribers) gets stricter, not looser. Per scope decision, no changeset.

Files touched:

- `packages/router/lib/utils.ts` — `updateRoute` signature; `go()` body.
- `packages/router/lib/router.ts` — popstate and hashchange handler bodies.

**Definition of Done:**
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by the package's `index.ts`)
- [ ] No new runtime dependency, OR the dependency is justified in Solution and a changeset exists
- [ ] Backward compatible, OR a changeset exists at `.changeset/*.md` describing the break
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`
- [ ] The three transient `route({ ...route(), path })` writes at `lib/utils.ts:105-108`, `lib/router.ts:53`, and `lib/router.ts:60` are removed and replaced with `updateRoute(newPath, ...)` calls
- [ ] The init pre-write at `lib/router.ts:35-40` is unchanged

#### [ ] Atomicity regression tests (Tests)
**Solution:**
New file `packages/router/tests/atomicity.test.ts`. Three tests, one per real-bug site, plus a fourth asserting the no-stale-state invariant directly.

Pattern follows `guides/tests.md` — `mock()` for the effect tracker, `mockClear()` after setup so post-navigation count is unambiguous, `import from "@hellajs/router/bundle"` for the router, and global `effect` (no import). All three updates are synchronous (the `queueMicrotask` deferral is init-only), so no `tick` / `flush` needed.

Shared setup at top of file:

```typescript
import { describe, test, expect, beforeEach, mock } from "bun:test";
import { router, route, navigate } from "@hellajs/router/bundle";

beforeEach(() => {
  router({
    routes: {
      "/users/:id": () => {},
      "/about": () => {}
    }
  });
});
```

Test cases:

- `"navigate fires route subscribers exactly once per navigation"` — create `const tracker = mock(() => route().path); effect(tracker); tracker.mockClear(); navigate("/users/123"); expect(tracker).toHaveBeenCalledTimes(1);`. Pre-fix this was 2.
- `"popstate fires route subscribers exactly once per navigation"` — same shape, but trigger via `window.dispatchEvent(new PopStateEvent("popstate"));` after setting `window.location.pathname` (or use `navigate` then `mockClear` then dispatch). Assert count is 1.
- `"hashchange fires route subscribers exactly once per navigation"` — `mode: "hash"` router config in an inner `describe` with its own `beforeEach`. Dispatch `window.dispatchEvent(new HashChangeEvent("hashchange"));`. Assert count is 1.
- `"route signal never exposes stale handler alongside new path"` — track `route()` snapshots inside the effect: `const snapshots: Array<{ path: string; handler: unknown }> = []; effect(() => snapshots.push({ path: route().path, handler: route().handler })); navigate("/users/123"); navigate("/about");` then assert no snapshot has `path` matching one route while `handler` is the other route's handler. Use a typed array (no `any`). Iterate with cached `while` loop per `guides/code.md` Loops rule, or use `.find()` / `.some()` on the array (test code, not hot path — acceptable).

For the popstate/hashchange tests, confirm the event-construction APIs exist in HappyDOM (`PopStateEvent`, `HashChangeEvent` constructors are standard). If HappyDOM does not support them, fall back to `history.pushState({}, "", "/x"); window.dispatchEvent(new Event("popstate"));` and equivalent for hashchange.

Cited evidence: `file` `packages/router/lib/utils.ts:103-108` (the `go` pre-write); `file` `packages/router/lib/router.ts:52-54` (hashchange pre-write); `file` `packages/router/lib/router.ts:58-62` (popstate pre-write); `file` `packages/core/lib/signal.ts:50` (synchronous flush on write — the mechanism that makes the partial write observable); existing test files in `packages/router/tests/` for pattern reference.

**Definition of Done:**
- [ ] `bun check router` exits 0
- [ ] `bun coverage` shows 100% coverage on the changed source lines (`packages/router/lib/utils.ts` `updateRoute` `nextPath ?? route().path` line and the three rewritten call sites in `lib/utils.ts:90-110`, `lib/router.ts:52-54`, `lib/router.ts:58-62` — name the file and line range in the commit message)
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md`: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, `await tick(); await tick()`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every new test asserts a behavior the source actually exposes — cross-checked against the implementation

#### [ ] Document atomicity guarantee (Docs)
**Solution:**
Two documentation updates — one internal, one user-facing.

Internal: `packages/router/AGENTS.md` Non-Obvious Behaviors section. Add a new bullet (do not remove existing bullets):

> **Atomic route writes**: `route()` updates `path`, `handler`, `params`, `query`, `meta`, and `crumbs` in a single signal write. Effects never observe a partially-updated `RouteInfo` — `go()`, `popstate`, and `hashchange` all funnel through `updateRoute(nextPath, ...)`, which writes the resolved match once. The init-time pre-write at `router.ts:35-40` is the only non-atomic write, and it is harmless (skipped on re-init via the `handler` guard, no subscribers on first init).

User-facing: `packages/router/docs/api/route.mdx`. Add a new `### Atomic Updates` sub-heading under the existing `## Important Considerations` section (after the existing `### Handler Availability` sub-heading at line 211). Content:

```markdown
### Atomic Updates

Every navigation — programmatic ([`navigate`](/reference/router/navigate)), browser back/forward (`popstate`), or hash change (`hashchange`) — writes the full resolved route into the [`route`](/reference/router/route) signal in a single update. `path`, `params`, `query`, `handler`, `meta`, and `crumbs` always describe the same matched route.

```typescript
import { effect } from '@hellajs/core';
import { router, route, navigate } from '@hellajs/router';

router({
  routes: {
    '/users/:id': () => {},
    '/about': () => {}
  }
});

effect(() => {
  const { path, params } = route();
  // Runs once per navigation — never sees path='/users/456' with stale params={}
  console.log(path, params.id);
});

navigate('/users/456');
// Logs: "/users/456" "456"
```

The init microtask (see [router](/reference/router/router)) defers the first resolution. `route()` returns its initial empty state until that microtask fires — no partial state, just the not-yet-resolved state.
```

Code examples follow `guides/docs.md`: `typescript` language tag, package imports (`@hellajs/core`, `@hellajs/router`), descriptive names, no test assertions, no AAA pattern. The "Logs:" comment style follows the existing `### Basic Usage` example at line 38.

File-name and heading rules per `guides/docs.md`: existing file is `route.mdx` (matches export name) — unchanged. New `###` sub-heading is descriptive (`### Atomic Updates`), not a banned generic label.

No frontmatter change (package doc, no frontmatter per `guides/docs.md`).

Cited evidence: `file` `packages/router/AGENTS.md` (Non-Obvious Behaviors section to extend); `file` `packages/router/docs/api/route.mdx:179-223` (existing `## Important Considerations` section with `###` sub-headings — template to follow); `file` `packages/router/lib/utils.ts:118` (the `updateRoute` signature change that makes the guarantee true).

**Definition of Done:**
- [ ] Every code example in the changed files compiles against the current source signatures
- [ ] The correct template from `./guides/docs.md` was used (Function / Prefix / Concept / Pattern / Index)
- [ ] Package docs (`packages/*/docs/**/*.mdx`) have no frontmatter
- [ ] Website wrapper pages (`docs/src/pages/**/*.mdx`) have `title`, `description`, and `layout`
- [ ] No claim in the changed docs contradicts the implementation — cross-checked against source and tests
- [ ] File name matches the export name (API docs) or is lowercase-hyphenated (concepts / patterns)
