## [ ] Mutation Auto-invalidation
**Type:** Code

### Depends On
- None

### Objective

New `invalidates` option on `ResourceOptions` accepts an array of strings (prefix match) and/or `RegExp` (pattern match). On mutation success, the listed prefixes/patterns auto-invalidate via `resourceCache.invalidateByPrefix`/`invalidateByPattern` after the `onSettled` hook fires.

### Solution

**Files touched:**
- `packages/resource/lib/resource.ts` — destructure `invalidates` from options; call it after `onSettled` on success in the `mutate` function
- `packages/resource/lib/types/resource.d.ts` — add `invalidates?: Array<string | RegExp>` to `ResourceOptions`

**Strategy:**

1. Add `invalidates` to the destructured options in `resource()` around line 90.
2. In the `mutate` function at `lib/resource.ts:441`, after `await options.onSettled?.(result, undefined, variables, mutationContext);` on the success path, iterate the `invalidates` array: strings become `resourceCache.invalidateByPrefix(item)`, RegExp items become `resourceCache.invalidateByPattern(item)`.
3. The invalidation runs only on the *success* path (not on error, not on abort), consistent with the user's decision. The error path at line 449 already calls `onSettled` with the error — no invalidation there.

**Key decisions:**
- Runs after `onSettled` so user code can inspect the result before cache state changes.
- Mixed array of strings and RegExp is allowed: `invalidates: ["user:", /^posts:\d+$/]`.
- Uses existing `resourceCache.invalidateByPrefix` and `resourceCache.invalidateByPattern` — no new invalidation logic.
- Only invalidates on mutation *success*. For error-path invalidation, users still call `invalidate()` manually in `onSettled`.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc
- [ ] No new runtime dependency
- [ ] Backward compatible — `invalidates` is optional, no change to existing mutation behavior
- [ ] A mutation with `invalidates: ["user:"]` calls `resourceCache.invalidateByPrefix("user:")` on success
- [ ] A mutation with `invalidates: [/^posts:\d+$/]` calls `resourceCache.invalidateByPattern(/^posts:\d+$/)` on success
- [ ] A mutation with `invalidates` does NOT invalidate on error or abort
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`
