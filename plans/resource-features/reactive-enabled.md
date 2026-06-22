## [ ] Reactive Enabled
**Type:** Code

### Depends On
- None

### Objective

Resource `enabled` option accepts a signal-getter `() => boolean` that re-evaluates reactively, while static `boolean` values continue to work unchanged. Manual `fetch()` calls always bypass the enabled check.

### Solution

**Files touched:**
- `packages/resource/lib/resource.ts` — the `enabled` option logic in the factory and the `run()` function
- `packages/resource/lib/types/resource.d.ts` — widen `enabled` type in `ResourceOptions`

**Strategy:**

1. Widen the `enabled` type in `ResourceOptions` from `boolean` to `boolean | (() => boolean)`.
2. At the top of the `resource()` factory, resolve the enabled value through a local `computed` when a function is passed, or keep the static value when a boolean is passed. Store the resolved getter in a closure `isEnabled` that returns the current value.
3. In `run()` (`lib/resource.ts:153`), replace the `if (!enabled) return;` check with `if (!isEnabled()) return;` — since `isEnabled` is a plain function (not a signal-read), it produces no reactive tracking inside `run()`. The enabled-ness is evaluated synchronously at fetch time.
4. The `refetchOnKeyChange` effect at `lib/resource.ts:345-350` already uses `enabled` — update that read too so the effect re-triggers the fetch when enabled flips from false to true.
5. In `dispose()`, clean up any allocated computed for the dynamic enabled path.

**Key decisions:**
- Manual `fetch()` always bypasses enabled (user chose). This matches the user's preference.
- The effect block at line 345 reads `enabled` inside the effect body so it re-runs when `enabled` changes. When a getter is provided, the effect re-evaluates the enabled check and calls `run()` if the key changed or enabled just became true.
- No breaking change: existing `enabled: true` / `enabled: false` static values continue to work identically. Only when a function is passed does the reactive path activate.

### Definition of Done
- [ ] `bun check resource` exits 0
- [ ] `bun lint` exits 0
- [ ] Every new or changed exported symbol has JSDoc
- [ ] No new runtime dependency
- [ ] Backward compatible — existing `enabled: boolean` static values unchanged
- [ ] A reactive enabled getter causes `run()` to skip when the getter returns `false`
- [ ] Manual `fetch()` executes even when the reactive getter returns `false`
- [ ] When `enabled` transitions from `false` to `true` via getter and `refetchOnKeyChange` is on, a fetch triggers automatically
- [ ] Audit skill run on the changed files reports no deviations from `./guides/code.md`
