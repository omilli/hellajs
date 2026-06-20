## [ ] In-place style fixes
**Type:** Code

### Depends On
- None

### Objective
Every file in `packages/resource/lib/` passes the audit skill against `./guides/code.md` for mechanical style (quotes, semicolons, JSDoc, loop variable names) without any structural moves or signature changes.

### Solution
Mechanical edits only. No function moves, no behavior change, no signature change. Touches `resource.ts`, `cache.ts`, `internal/core.ts`, `types.d.ts`.

Quotes — convert every single-quoted string literal to double quotes in `resource.ts` and `cache.ts`. Spot targets include `'AbortError'`, `'Request was aborted'`, `'Mutation was aborted'`, `'idle'`, `'loading'`, `'error'`, `'success'`, `'visibilitychange'`, `'visible'`, `'hidden'`, `'function'`, `'HTTP '`, `'key'`, `'HTTP (\d+):'` in `resource.ts`; `'online'`, `'offline'`, `'public'` (Symbol description), `'function'`, `'string'` in `cache.ts`. Comments and template literals are untouched. The one existing `"string"` at `resource.ts:46` shows the file is already inconsistent.

Semicolons — add `;` after every multi-line arrow-function `const` assignment that currently omits it. Targets in `resource.ts`: `resolveKey` (89), `handleError` (94), `handleSuccessError` (104), `handleSuccess` (116), `cleanAbort` (126), `resolveRetryConfig` (140), `clearPolling` (155), `setupPolling` (160), `clearFocus` (208), `setupFocus` (213), `clearReconnect` (230), `setupReconnect` (235), `setData` (490), `reset` (558), `dispose` (574). Targets in `internal/core.ts`: lines 1 and 2.

JSDoc — add a present-tense one-line block (plus `@param`/`@returns` where non-obvious) to every currently-bare helper. Targets in `resource.ts`: `isAbortError` (10), `resolveRetryConfig` (140), `clearPolling` (155), `setupPolling` (160), `clearFocus` (208), `setupFocus` (213), `clearReconnect` (230), `setupReconnect` (235), `isIdle` (567), `mutate` (506). Targets in `cache.ts`: `getScope` (39), `totalSize` (48), `invalidateGlobal` (205), and each `flatView` method (`size` getter, `get`, `has`, `clear` at 178–203). Add interface-level JSDoc to `CacheUpdate` in `types.d.ts:97`.

Loop variable names — in `cache.ts`, rename nested-loop index/length pairs to match `./guides/code.md` (`si`/`sLen`, `ki`/`kLen`, `ui`/`uLen`). Targets: `cleanupExpiredCache` (71, 88), `setCacheData` LRU pass (115), `invalidateByPrefix` (271, 285), `invalidateByPattern` (297, 311), `updateMultiple` (249). A single loop in a function keeps plain `i`/`len` — verify no wrong renames in single-loop functions.

`internal/core.ts` — merge the two `export { … } from "@hellajs/core"` lines into a single statement with a trailing semicolon.

Trade-offs: none. This is the project's house style.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc (`@internal` where the symbol is not re-exported by the package's `index.ts` barrel)
- [ ] No new runtime dependency
- [ ] Backward compatible — public API surface and runtime behavior unchanged
- [ ] Audit skill run on `packages/resource/lib/` reports no deviations from `./guides/code.md` for quotes, semicolons, JSDoc presence, and nested-loop variable naming
- [ ] Does `rg "'" packages/resource/lib/` return matches only inside comments (no string literals)?
- [ ] Does every multi-line `const NAME = (...) => { … }` in `resource.ts` and `internal/core.ts` end with `};`?
- [ ] Does `rg "\b(slen|klen|ulen)\b" packages/resource/lib/cache.ts` return no matches?
