## [ ] Fix Lazy props API shape

### Depends On
None

### Objective
At `lib/Lazy.ts:38`, the loaded component receives `props.props` — a nested accessor that forces awkward usage:

```js
Lazy({ loader, loading: <Spinner />, fallback: <Error />, props: { userId } })
// Inside loaded component: receives { userId }
```

The `props` property name conflates with the concept of component props. Users intuitively expect to pass component props at the top level, not nested under a `props` key.

Since we're following "default safe" (no breaking changes), the fix is to add a second parameter to the Lazy function or support a flat API while keeping the old one working.

### Tasks

#### [ ] Add flat props API to Lazy

#### Solution
Add support for passing component props as a second argument to Lazy, or as a top-level property alongside `loader`/`loading`/`fallback`. The loaded component receives all Lazy props minus the reserved keys.

Approach: merge all Lazy props (except `loader`, `loading`, `fallback`) into a `componentProps` object and pass that to the loaded component. This allows:

```js
Lazy({ loader, loading, fallback, userId })
// Inside loaded component: receives { userId }
```

Keep backward compatibility: if `props.props` exists and no other component props are present at the top level, use the old behavior. Deprecate `props.props` with a `console.warn` once.

Better approach: add a `componentProps` option alongside `props`:

```ts
interface LazyProps {
  loader: (opts: LazyOptions) => Promise<Component | HellaNode>;
  loading?: HellaChild;
  fallback?: HellaChild;
  props?: Record<string, unknown>;        // old way (deprecated)
  componentProps?: Record<string, unknown>; // new way
}
```

If both are provided, `componentProps` wins and a deprecation warning is logged for `props`.

##### Tests
- Add test: Lazy with `componentProps` → verify loaded component receives them
- Add test: Lazy with `props` (old API) → verify continues to work (no breaking)
- Add test: Lazy with both `props` and `componentProps` → verify `componentProps` wins and warning is logged
- Add test: Lazy without component props → verify component receives empty/undefined props

##### Documentation
- AGENTS.md: update Lazy usage pattern documentation to prefer `componentProps`
- CHANGELOG: minor entry (feature addition, backward compatible)

##### Validation
- `bun check dom` passes
- Old `props` usage still works (tested)
- No regressions in existing lazy tests

### Tests
Extend `tests/lazy.test.ts` with `componentProps` test cases.

### Documentation
AGENTS.md: "lazy-loading" mental model and "basic-usage" → switch to `componentProps`. Update README example if it uses the old API.

### Validation
Both old and new APIs work. Deprecation warning fires for old API.
