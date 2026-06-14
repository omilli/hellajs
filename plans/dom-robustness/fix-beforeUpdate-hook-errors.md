## [ ] Catch beforeUpdate and afterUpdate hook errors

### Depends On
None

### Objective
At `lib/internal/render.ts:101-114`, the `bind:` loop calls effects that invoke lifecycle hooks via `registry.addEffect`. Unlike bind callbacks (which have try/catch) and event handlers (which have try/catch), the `beforeUpdate` and `afterUpdate` hooks run inside the effect body without any error wrapping. An error in these hooks kills the reactive binding entirely.

### Tasks

#### [ ] Wrap hook invocations in effects with try/catch

#### Solution
The `beforeUpdate` and `afterUpdate` hooks are registered via `registry.addHook` in `mountNode()` (`render.ts:76-77`) and invoked inside the effect via the registry system. The registry's effect runner in `registry.ts` should wrap hook calls in try/catch, or the hook invocation in `render.ts` effects should be wrapped.

Better approach: wrap the effect body for bind: callbacks at `render.ts:102-113` so that hook errors and render errors are handled uniformly. The existing try/catch at lines 105-112 catches errors in `renderProp(element, key, resolveValue(value))` — but if `beforeUpdate` or `afterUpdate` is called by the registry's mount/update system (not inside this effect), the error escapes.

Check the registry code at `lib/registry.ts` — the `invokeHooks` function should wrap each hook call in try/catch, dispatching errors through the error system.

##### Tests
- Add test: element with `hook:beforeUpdate` that throws — verify error is caught and dispatched
- Add test: element with `hook:afterUpdate` that throws — verify error is caught and dispatched
- Add test: error in beforeUpdate does not prevent subsequent updates
- Add test: error in afterUpdate does not prevent subsequent updates

##### Documentation
- AGENTS.md: update "non-obvious behaviors" — beforeUpdate/afterUpdate hook errors are now caught
- CHANGELOG: patch entry

##### Validation
- `bun check dom` passes
- Tests verify errors are dispatched and bindings remain functional

### Tests
Extend `tests/error-catching.test.ts` or `tests/lifecycle.test.ts` with hook-throwing scenarios.

### Documentation
AGENTS.md: remove "beforeUpdate/afterUpdate hook errors not caught" from non-obvious behaviors; add to error-handling docs.

### Validation
Hook errors no longer crash reactive bindings — they dispatch through the error system.
