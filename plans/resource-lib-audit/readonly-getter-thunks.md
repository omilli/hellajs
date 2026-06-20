## [ ] Replace computed-as-readonly with plain thunks
**Type:** Code

### Depends On
- Extract internal helpers

### Objective
The `resource()` return object exposes writable signals as plain `() => T` thunks, matching core's "arrow getter" idiom (commit e233bf2) and dropping five `computed()` allocations per resource instance.

### Solution
At the `return { … }` block of `resource()`, replace each pass-through `computed` wrapper with a plain arrow thunk. The `Resource<TTransformed, T>` interface already types these fields as `() => T`, so the public API contract is unchanged.

Replacements:
- `error: computed(() => error())` → `error: () => error()`
- `isLoading: computed(() => isLoading())` → `isLoading: () => isLoading()`
- `isFetching: computed(() => isFetching())` → `isFetching: () => isFetching()`
- `isIdle: computed(() => isIdle())` → `isIdle: () => isIdle()`
- `status: computed(() => status())` → `status: () => status()`

Keep `data` as the existing `computed(...)` from lines 58–63 — that one memoizes a real body (the transform function) over `rawData`, so it earns its cost. Verify the `computed` import is still required after the change (it is — for `data`).

Trade-offs: loses ComputedState memoization for `status`/`isIdle`, but their bodies are 2–4 branch checks over primitive signals — recomputation is cheaper than the computed-node overhead. Downstream subscribers still receive glitch-free updates because the thunks read signals directly.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every changed exported symbol has JSDoc
- [ ] No new runtime dependency
- [ ] Backward compatible — `Resource<TTransformed, T>` interface is unchanged, observable behavior is identical (existing tests pass)
- [ ] Audit skill on changed lines reports no deviations from `./guides/code.md`
- [ ] Does `rg "computed\(\(\) => \w+\(\)\)" packages/resource/lib/resource.ts` return only the `data` field's transform computed?
