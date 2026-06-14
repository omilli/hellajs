## [ ] Mitigate ForEach index-key in-place mutation footgun

### Depends On
None

### Objective
At `lib/ForEach.ts:95`, when items don't have explicit keys (falling back to array index), the ForEach reconciler checks reference equality (`oldItem !== item`) to decide whether to reuse DOM nodes. If users mutate array items in-place (e.g., `arr[0].name = 'new'`) without changing the array reference, the reference equality check passes — old DOM nodes are reused with stale content.

### Tasks

#### [ ] Add development-mode deprecation warning for index-keyed ForEach

#### Solution
Since changing the reference-equality behavior would break the performance contract (and users relying on in-place mutation for non-reactive properties), the fix is educational, not behavioral:

1. Add a development-only warning when ForEach renders with index-based keys (no explicit key or item.id). Suggest providing explicit keys.
2. Add a `key` option to ForEach props that allows users to specify a key function (like React's `key` prop or Solid's `<For>` keyed approach).

New ForEach API addition:

```ts
interface ForEachProps<T> {
  each: T[] | (() => T[]);
  use: (item: T, index: number) => HellaChild;
  key?: (item: T, index: number) => unknown; // NEW
}
```

When `key` is provided, use it for reconciliation instead of the auto-resolution logic. This gives users explicit control and eliminates the ambiguity.

The existing key resolution (`element.props.key` → `item.id` → index) remains as the default when `key` function is omitted.

##### Tests
- Add test: ForEach with `key` function — verify correct reconciliation
- Add test: ForEach with `key` function returning same key for different items — verify error handling
- Add test: ForEach without `key` function — verify existing behavior preserved
- Add test: ForEach with index key and in-place mutation — verify dev warning fires

##### Documentation
- AGENTS.md: update ForEach docs with `key` option, deprecation warning note

##### Validation
- `bun check dom` passes
- New `key` prop works correctly
- Existing ForEach usage without `key` continues unchanged

### Tests
Extend `tests/foreach.test.ts` with `key` function test cases.

### Documentation
AGENTS.md: update "ForEach internals" data structure docs and "foreach-reconciliation" algorithm — add `key` prop behavior.

### Validation
New explicit key API works. Existing code unaffected.
