## [ ] tests — replace boolean flag call-trackers with `mock()`
**Type:** Tests

### Depends On
- None

### Objective
`packages/store/tests/` no longer uses the banned `let <name> = false` flag pattern for tracking whether a callback was invoked.

### Solution
The guide explicitly bans the pattern: *"Never use boolean flag patterns (`let called = false`) or pure integer counters (`let runs = 0`) for call tracking — use `mock()` instead."* Two tests in this package use it to track cleanup invocation:

**`cleanup.test.ts:6-31`** — tracks two cleanup calls with two booleans:
```ts
let level1Cleaned = false;
let level2Cleaned = false;
// ...
data.level1.cleanup = function () {
  level1Cleaned = true;
  originalLevel1Cleanup.call(this);
};
data.level1.level2.cleanup = function () {
  level2Cleaned = true;
  originalLevel2Cleanup.call(this);
};
// ...
expect(level1Cleaned).toBe(true);
expect(level2Cleaned).toBe(true);
```
Replace each `let xCleaned = false` with `const xCleaned = mock(() => {});`, call `xCleaned()` inside the wrapper, and assert with `expect(xCleaned).toHaveBeenCalledTimes(1)`. Keep the `originalXCleanup.call(this)` chain so the real cleanup still runs.

**`nested.test.ts:118-127`** — same pattern with one flag (`let nestedCleaned = false`):
```ts
let nestedCleaned = false
const origCleanup = outer.inner.nested.cleanup
outer.inner.nested.cleanup = function () {
  nestedCleaned = true
  origCleanup.call(this)
}
```
Same transformation.

Note: this is a codebase-wide pattern (also in `router/tests/`, `resource/tests/`, `core/tests/reactive.test.ts:668`). Those are out of scope here — this task only fixes the store package. The guide gap that allows the pattern to spread is addressed by the separate `guide-callback-flag-ban-clarity.md` task.

Trade-offs: `mock()` is slightly heavier than a boolean, but the guide prioritizes consistency and the ban is explicit.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun coverage` shows 100% coverage on `packages/store/dist/bundle.js`
- [ ] Overall coverage is not lower than before this task
- [ ] No anti-pattern from `./guides/tests.md` remains: `jest.fn` / `vi.fn`, `any`, `it()` / `test.skip`, `await tick()` without `0`, `await tick(); await tick()`, boolean-flag or pure-integer call counters, helpers duplicated across files
- [ ] Every edited test still asserts a behavior the source actually exposes
- [ ] Does `rg "let \\w+ = false" packages/store/tests/` return zero matches?
- [ ] Does `cleanup.test.ts` use `mock(() => {})` and `toHaveBeenCalledTimes` for both nested cleanups?
- [ ] Does `nested.test.ts` use `mock(() => {})` and `toHaveBeenCalledTimes` for the composed-store cleanup?
