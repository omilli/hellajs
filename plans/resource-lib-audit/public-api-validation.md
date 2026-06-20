## [ ] Public API input validation
**Type:** Code

### Depends On
- Extract internal helpers

### Objective
Every public entry point in `@hellajs/resource` validates its inputs and throws an `Error` shaped `[resource] fn: <constraint>, received <value>` on invalid input — failing fast instead of failing late.

### Solution
Add guards at the top of each public entry point. All messages follow `./guides/code.md` § Error Handling. Internal functions remain unguarded (trusted callers).

`resource(fetcher | url, options)` — at the top of the implementation signature:
- If `typeof fetcher !== "string" && typeof fetcher !== "function"`: throw `new Error("[resource] resource: fetcher must be a string URL or function, received " + typeof fetcher)`.
- If `options != null && (typeof options !== "object" || Array.isArray(options))`: throw `new Error("[resource] resource: options must be an object, received " + typeof options)`.

`setData(updater)` — at the top of the function:
- If `updater === undefined`: throw `new Error("[resource] setData: updater is required, received undefined")`. (Note: the generic data type cannot be checked structurally; the only universally-invalid input is `undefined`.)

`mutate(variables)` — no validation. Variables may legitimately be `undefined`, `null`, or any serializable shape; the fetcher enforces its own contract.

`resourceCache.set(key, data, cacheTime, staleTime)` — after the existing default assignments:
- If `cacheTime != null && (typeof cacheTime !== "number" || Number.isNaN(cacheTime) || cacheTime < 0)`: throw `new Error("[resource] set: cacheTime must be a non-negative number, received " + cacheTime)`.
- Same shape for `staleTime`, with the additional allowance of `Infinity`.

`resourceCache.update(key, updater)` and `resourceCache.updateMultiple(updates)` — same `updater` rule as `setData` (reject `undefined`); `updateMultiple` validates each entry's `updater` before any mutation to keep the operation atomic.

`resourceCache.setConfig(config)` — if `config != null && typeof config !== "object"`: throw `[resource] setConfig: config must be an object, received <typeof>`.

This is a behavior change: code that previously passed bad inputs and failed deep inside `run()` (or silently wrote `cacheTime: -1`) now throws at the boundary. Create a changeset at `.changeset/resource-input-validation.md` describing the new validation, marking `@hellajs/resource` as a breaking change (major) since prior calls with invalid inputs would have thrown different errors or silently misbehaved.

Trade-offs: validating inside `set()` requires the default-parameter values (`cacheTime = 0`, `staleTime = 0`) to be checked after assignment, not before. The `Number.isNaN` guard catches `NaN` which would otherwise produce silently broken TTL behavior.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every changed exported symbol has JSDoc
- [ ] No new runtime dependency
- [ ] A changeset exists at `.changeset/*.md` describing the breaking input-validation behavior change for `@hellajs/resource` (major version bump)
- [ ] Audit skill on changed lines reports no deviations from `./guides/code.md`
- [ ] Does `rg "\[resource\]" packages/resource/lib/` find guard messages for `resource`, `setData`, `resourceCache.set`, `resourceCache.update`, `resourceCache.updateMultiple`, `resourceCache.setConfig`?
- [ ] Does each guard message include the literal substring `received `?
