# Router Package Audit

## Code & JSDoc Quality

### `navigate.ts`

- **JSDoc on public export is solid** — covers `@template`, `@param`, `@returns` correctly. Follows the established pattern.
- **Wildcard `*` is not URL-encoded**: `navigate('/files/*', { params: { '*': 'path/with spaces' } })` replaces `*` with raw value without encoding. The `:param` loop does call `encode()` but the wildcard block on line 24-25 does not. This is inconsistent and potentially a bug — wildcard segments containing special characters will break.

### `hooks.ts`

- **Redundant `hasParams` flag in `matchPattern`**: The `hasParams` boolean is set but its only effect is to decide whether to return `params` or `EMPTY_OBJECT`. This is fine for the optimization intent but the `if (!hasParams) { hasParams = true; }` pattern on lines 49-51 and 59-61 is awkward — a simple `hasParams = true` without the guard would be clearer and identical in behavior.
- **`executeHook` uses `(fn as any)` casts extensively** (lines 24, 26, 27): The function arity detection logic (`fn.length >= 2`) is clever but fragile. TypeScript can't verify these casts. The logic is explained in CLAUDE.md but not inline — a brief comment on the arity check would help maintainers.
- **Uncovered async path in `executeGlobalHook`**: Lines 129-131 in the bundle (the `.catch()` on async global hooks) have no test coverage. The `errors.test.ts` covers async errors in `executeHook` but not in `executeGlobalHook`.

### `match.ts`

- **`parseQuery` doesn't handle multi-value params**: `?tag=a&tag=b` would silently overwrite `tag=a` with `tag=b`. This is a design choice (consistent with `Record<string, string>` type) but worth noting — no JSDoc mentions this limitation.
- **`matchNestedRoute` filters strings then sorts**: The `routeEntries` filter on line 87 excludes string-valued routes, but `sortRoutesBySpecificity` also runs on these already-filtered entries. This is correct but slightly wasteful — the sort could include string entries and the filter happens in the wrong order.

### `utils.ts`

- **`updateRoute` is 90 lines** — the largest function in the package. It handles 5 resolution phases, meta merging, scroll handling, and hook execution orchestration. This is well-structured with clear phase comments but is approaching the threshold where extraction would improve readability.
- **`extractRouteHooks` returns `{ before, after }` with `|| null` fallback**: Lines 302-303 use `|| null` which is fine but inconsistent with the style guide preference for `??` over `||` for non-boolean fallbacks (though both `undefined` and `null` are falsy here so it doesn't matter functionally).
- **`EMPTY_OBJECT` is exported from `utils.ts`** but it's only used in `match.ts` and `utils.ts` itself. The export is correct for the pattern but the re-export chain is worth verifying — `index.ts` doesn't re-export it, which is correct since it's internal.

### `state.ts`

- **Initial `route` signal uses `window.location` directly**: Line 47 checks `typeof window !== 'undefined'` inline. This is correct for SSR safety but the `hasWindow` pattern used in `router.ts` and `utils.ts` is more consistent. Minor inconsistency.
- **`previousPath` initialized to `"/"`**: If the browser is at `/home`, the `previousPath` starts as `"/"` then gets set to `/home` on `router()` init. This means the first navigation's `from` in scroll behavior will be the initial path (set during `router()`), not `"/"`. This is correct behavior per the scroll-skip-on-initial-load logic but isn't documented in JSDoc.

### `router.ts`

- **Clean and minimal** — just initialization and event listener setup. Good separation of concerns.
- **Event listeners are never cleaned up**: `hashchange` and `popstate` listeners are added but never removed. If `router()` is called multiple times (e.g., in tests), listeners accumulate. Tests handle this with `beforeEach`/`afterEach` cleanup via `window.history.replaceState`, but a real application calling `router()` twice would get double-firing events. No JSDoc mentions this limitation.

### `types.d.ts`

- **Well-structured with clear grouping** comments (Core types, Router configuration, Global hooks, Navigation and redirects, Route state and matching).
- **`Handler` type uses `(...args: any[])`**: This conflicts with the "NEVER use `any`" guideline from the global instructions. The `any[]` is used for the generic handler arity detection but could be typed more precisely as `(...args: [Params?, Params?]) => ...` if the intent is only `(params, query)` params.
- **`NavigateOptions` defaults `T` to `string`**: Good for ergonomics when calling `navigate('/path')` without type inference.
- **`RouteWithHooks` has all optional properties except `children`**: This means `{}` is a valid `RouteWithHooks` — an empty route object with no handler, no hooks, no children. This silently matches and does nothing, which could be confusing.

### `internal/core.ts`

- **Re-exports `isUndefined` from core** but it's not used anywhere in the router package. Dead import.

## Test Coverage

### Coverage Report

- **98.33% functions, 99.10% lines** — very strong.
- **Uncovered**: Lines 129, 131 in bundle (async `.catch()` in `executeGlobalHook`).

### Gaps

- **No test for async global hook errors**: The `executeGlobalHook` async rejection path is untested. `errors.test.ts` covers async route hook errors but the global variant has the same catch-attachment pattern that isn't exercised.
- **No test for `navigate()` with wildcard + special characters**: The wildcard substitution doesn't URL-encode, but there's no test proving this (or documenting it as intentional).
- **No test for double `router()` initialization**: Calling `router()` twice should be tested to confirm event listener accumulation behavior.
- **No test for popstate with hash mode**: Tests mock `addEventListener` for popstate (history mode) and hashchange (hash mode) separately, but no test verifies the correct event is used for each mode end-to-end.
- **No test for `route().handler` being callable from user code**: The `route.mdx` docs show `handler()` being called in an effect, but no test verifies this works correctly.
- **No test for malformed query strings**: Edge cases like `??`, `&&`, `=`, empty keys (`?=value`) aren't tested.
- **`errors.test.ts` has duplicate console spy**: The `nested handler errors` test (line 236) creates its own `consoleSpy` instead of using the one from `beforeEach`. The `afterEach` will try to restore the `beforeEach` spy on a different mock, which could mask issues.
- **No test for `navigate()` with `replace: true` verifying history state**: The test only checks `container.textContent` but doesn't verify `history.length` or that back navigation is blocked.

## Documentation Accuracy & Clarity

### `docs/navigate.mdx`

- **Accurate and well-structured**. Follows the reference doc pattern (Title → API → Basic Usage → Options → Considerations).
- **"Parameter Validation" section documents silent failure well** — the ❌/✅ pattern is consistent with other packages.
- **Missing: `navigate()` return type documentation** — the function returns `void` but this isn't explicitly stated. Users might expect it to return a promise or navigation result.

### `docs/route.mdx`

- **The "Handler Reference" section suggests calling `handler()` from effects**: This is potentially dangerous — calling the handler manually would re-execute route logic (setting signals, etc.) outside of the router's control. The docs should clarify this is for inspection, not invocation.
- **Route info example shows `params: { id: "123" }` for nested route** but the comment says "inherited from parent route" — the example URL `/admin/users/123/edit` with config `/admin -> /users -> /:id -> /edit` would have params `{ id: "123" }`, which is correct. But the config structure shown isn't valid router config syntax (it's not nesting with children objects).

### `docs/router.mdx`

- **Most comprehensive reference doc** — covers all major features.
- **"Hook Returns" section** shows `before` hooks returning values like `{ authenticated: true }`, but the router doesn't use these return values for anything — they're discarded. The docs imply these return values flow somewhere, which could mislead users into thinking hooks can pass data to handlers.
- **"Error Recovery Patterns" section** references `routeState.authenticated` which doesn't exist on `RouteInfo`. The example accesses a property that was returned from a `before` hook, but hook return values aren't stored on `route()`. This is factually incorrect.

### `docs/src/pages/learn/concepts/routing.mdx`

- **Very thorough** — covers all features with self-contained examples.
- **Route guards section** accurately documents the non-blocking behavior with ⚠️ warnings. Good.
- **Internal Mechanics section** is extremely detailed for a concepts doc — could overwhelm newcomers. The algorithm descriptions are more appropriate for CLAUDE.md than user-facing concepts docs.
- **"Navigation State Coordination" claims 7-phase execution pipeline** but the implementation is actually 5-phase (matching) + hook execution. The "7-phase" label is marketing more than accuracy — some "phases" are trivial (parameter inheritance happens during matching, not as a separate step).

## CLAUDE.md & README.md Accuracy & Clarity

### CLAUDE.md

- **Extremely detailed and accurate** — one of the best-organized CLAUDE.md files in the monorepo.
- **"Non-Obvious Behaviors" section is excellent** — captures many subtle invariants.
- **"Hooks-only parent with no matching child falls to notFound"** is documented but could be more explicit about why: the parent has no handler, so there's nothing to execute, and the child didn't match.
- **The "Function arity affects param passing" entry** accurately describes the `fn.length >= 2` check but doesn't explain why this exists (backward compatibility? convenience?). This is worth clarifying since it's a surprising behavior.

### README.md

- **Minimal but adequate** for a quick reference.
- **Example uses `console.log` in route handlers** — consistent with the minimal demo style, but the Quick Start example in `router.mdx` shows more realistic usage with `mount()`. These should be aligned.
- **Missing `navigate` import** in the Quick Start code block: `navigate` is used on the last line but isn't shown in the import statement.

## Cross-Package Consistency

### Style Guide Alignment

- **JSDoc pattern**: Router follows the established pattern well — `@template`, `@param`, `@returns` on all public exports. Internal functions also get JSDoc. ✅
- **Type file location**: Uses `lib/types.d.ts` (single file), consistent with smaller packages. ✅
- **Internal module**: Uses `lib/internal/core.ts` for core re-exports, consistent with dom/core. ✅
- **Test imports**: Uses `from "@hellajs/router/bundle"` — consistent with the bundle import pattern. ✅
- **Test structure**: Uses `describe`/`test` blocks, no AAA pattern, natural flow. ✅

### Inconsistencies Found

- **`Handler` type uses `any[]`**: Other packages avoid `any`. Core uses `unknown`, dom uses specific types. The `Handler` type should at minimum use `unknown[]`.
- **`hasWindow` pattern**: `router.ts` and `utils.ts` define `const hasWindow = typeof window !== 'undefined'` at module scope, but `state.ts` does the check inline on line 47. Should be consistent.
- **No `CHANGELOG.md` review**: The file exists at `packages/router/CHANGELOG.md` but wasn't reviewed for this audit.
- **`isUndefined` is imported but unused**: `internal/core.ts` re-exports `isUndefined` from `@hellajs/core` but it's never used in the router package.

### Style Guide Updates

The following should be added to the style guide:

- **Unused import discipline**: Re-exports from `internal/core.ts` should be audited for usage — dead re-exports add bundle weight.
- **Wildcard encoding**: When URL-encoding params, wildcard `*` substitutions should be handled consistently with `:param` substitutions.
- **`any` avoidance in types**: Even internal handler types should use `unknown` rather than `any`.

## Todo List

### Code Quality
- [ ] Fix wildcard `*` parameter substitution in `navigate.ts` to URL-encode the value (or document why raw substitution is intentional)
- [ ] Remove unused `isUndefined` re-export from `internal/core.ts`
- [ ] Replace `any` in `Handler` type with `unknown[]` or a more precise tuple type
- [ ] Replace `any` casts in `executeHook` with safer alternatives or add inline comments explaining the arity detection
- [ ] Normalize `hasWindow` pattern — extract to `internal/core.ts` or use consistently in `state.ts`

### Test Coverage
- [ ] Add test for async global hook errors (covers `executeGlobalHook` promise `.catch()` path)
- [ ] Add test for wildcard parameter with special characters in `navigate()`
- [ ] Add test for calling `router()` twice (event listener accumulation)
- [ ] Add test for malformed query strings (`??`, `&&`, `=`, empty keys)
- [ ] Fix duplicate console spy in `errors.test.ts` nested handler test
- [ ] Add test verifying `replace: true` affects browser history

### Documentation Accuracy
- [ ] Fix `router.mdx` "Hook Returns" section — remove implication that hook return values are accessible to handlers
- [ ] Fix `router.mdx` "Error Recovery Patterns" — `routeState.authenticated` doesn't exist on `RouteInfo`
- [ ] Fix `route.mdx` "Handler Reference" — clarify that calling `handler()` is for inspection only, not recommended invocation
- [ ] Add `navigate` import to README.md Quick Start example
- [ ] Consider trimming "Internal Mechanics" in concepts doc — 5-phase algorithm detail may be too much for user-facing concepts
- [ ] Verify "7-phase execution pipeline" claim in concepts doc matches implementation (it's really 5-phase matching + hook orchestration)

### Cross-Package Consistency
- [ ] Remove `isUndefined` from `internal/core.ts` re-exports
- [ ] Update `.tmp/package-style-guide.md` with wildcard encoding and unused import conventions
