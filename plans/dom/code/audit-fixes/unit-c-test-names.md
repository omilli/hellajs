# [ ] Unit C: Fix test names in direct-events.test.ts

## Type tag

Tests.

## Surface fork

No. Test naming only.

## Files

### `packages/dom/tests/direct-events.test.ts`

Two tests use the banned `"works correctly"` suffix (bad column in `guides/tests.md` §Naming):

| Ln | Current | Replace with |
|----|---------|--------------|
| 74 | `"handler replacement works correctly"` | `"replaces existing e:click handler on re-mount"` |
| 127 | `"stopPropagation works correctly"` | `"stopPropagation prevents parent e:click from firing"` |

## Definitions of Done

- [ ] Line 74 test renamed to `"replaces existing e:click handler on re-mount"`
- [ ] Line 127 test renamed to `"stopPropagation prevents parent e:click from firing"`
- [ ] `bun coverage dom` is still green

## Strategy

Pure renames — no logic changes. The new names describe the asserted behavior in present tense (per guide rule). Run `bun coverage dom` to confirm green.
