## [ ] Fix mount() Promise type handling

### Depends On
None

### Objective
The `mount()` function at `lib/mount.ts:16` accepts `() => Promise<HellaNode>` in its type signature, but the implementation passes the return value through `resolveValue()` which never awaits — the Promise object is passed directly to `mountNode()` and fails.

### Tasks

#### [ ] Align type and implementation in mount()

#### Solution
Fix the implementation to handle async component functions properly. Add a check in `mount()` (or in `resolveValue()` called by `mount()`) for thenable values and await them before passing to `mountNode()`.

Alternatively, remove the Promise variant from the type signature to match current reality. The "default safe" approach is to fix the implementation since users may already pass async functions expecting them to work.

Carefully analyze callers: `resolveValue` is used in multiple places (`render.ts:161`, `render.ts:104`, `ForEach.ts:37`, `mount.ts:19`). The async fix should only apply in `mount()` where the Promise type is declared, not in reactive contexts where functions are expected to be synchronous signal reads.

##### Tests
- Add test: `mount(async () => html\`<div>loaded</div>\`)` — verify content renders
- Add test: async mount with rejected promise — verify error is thrown
- Add test: ensure existing sync usages (signal reads in bindings) are unaffected

##### Documentation
- Update AGENTS.md for `mount()` if behavior is documented
- CHANGELOG: patch entry

##### Validation
- `bun check dom` passes
- New tests cover success and error paths
- Existing tests unaffected

### Tests
Add `tests/mount.test.ts` or extend existing mount.test.ts with async mount cases.

### Documentation
AGENTS.md mount section may need updating if Promise support is documented. Status: check first.

### Validation
Test output confirms async functions work end-to-end. No regression in sync mount behavior.
