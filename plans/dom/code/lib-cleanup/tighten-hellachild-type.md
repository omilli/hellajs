# [ ] tighten-hellachild-type

## Contract

### Surface change
yes (pending fork resolution) — `HellaChild` is exported from `lib/types/nodes.d.ts` and re-exported via `lib/index.ts`. It appears in public component prop types (`ForEachProps`, `PortalProps`, `TransitionProps`, `LazyProps`) and is consumed by external callers typing their own component children. Tightening it may break downstream code that passes truly-arbitrary values; the fork below decides how invasive.

### Package
dom

### Guide governance
- Files ← `code.md` §Types, §Package File Structure
- Public API delta ← `code.md` §Types, §JSDoc (`HellaChild` doc), §`index.ts` Rules
- Behavioral scenarios ← `tests.md` §Test Structure (compile-only scenarios for the type; runtime unchanged)
- Doc placement ← `docs.md` §API reference if `HellaChild` is documented

### Root cause (evidence)
`lib/types/nodes.d.ts:27`:

```ts
export type HellaChild = HellaNode | HellaPrimitive | unknown;
```

`| unknown` absorbs the entire union — `HellaChild` resolves to `unknown` at every use site, defeating both member types. The runtime in `appendToParent` (`render.ts:159-252`) actually accepts a concrete set:

| Runtime branch | Accepted type |
|---|---|
| `typeof child === "string"` | `string` |
| `isFunction(child)` (non-dynamic) | reactive child effect — `() => HellaChild \| HellaNode` |
| `isFunction(child) && child.isDynamic` | dynamic component — `RenderFn` |
| `resolveValue` → `string \| number` | `string \| number` |
| `resolved instanceof Node` | `Node` |
| `isHellaNode(resolved)` | `HellaNode` |
| `child === null` | `null` (filtered by `!== null` guard, renders nothing) |

The honest union is roughly `HellaNode | HellaPrimitive | Node | null | undefined`. The current form hides all of this behind `unknown`.

### Files
- `packages/dom/lib/types/nodes.d.ts` — modify `HellaChild` (line 27) per chosen fork

### Fork (decide before acting)

**Option A — Strictest:** drop `| unknown`, leave the rest.
```ts
export type HellaChild = HellaNode | HellaPrimitive;
```
Honest about the common case; rejects arbitrary values at compile time. **Risk:** external callers passing `Node` directly, or `null`/`undefined` (e.g., conditional `{condition && <div/>}` patterns), get type errors. Requires checking every test/example/doc that renders through `HellaChild`.

**Option B — Runtime-accurate:** match what `appendToParent` actually accepts.
```ts
export type HellaChild = HellaNode | HellaPrimitive | Node | null | undefined;
```
Most honest. `Node` covers raw-DOM passthrough (used by `element()` slot capture and `Portal`); `null | undefined` covers conditional rendering. **Risk:** lowest — likely matches all real call sites.

**Option C — Status quo + document:** leave the type, fix the misleading union form.
```ts
export type HellaChild = unknown;
```
Honest about the current permissive contract; drops the cosmetic union members that mislead readers. **Risk:** zero, but loses type guidance for callers.

**Recommendation:** Option B — it matches the runtime, has the lowest breakage risk, and gives callers useful type-checking. Confirm by running `bun lint` after the change and grepping test/example files for any value that fails the new union.

### Behavioral scenarios
No runtime behavior change for any fork. The verification is **compile-time**: after the change, `bun lint` exits 0 and `bun coverage dom` exits 0 — proving every existing call site (in `lib/`, `tests/`, `docs/`, `examples/`) still satisfies the tightened type.

### Doc placement
- `packages/dom/docs/api/` — grep for `HellaChild`; if documented, update the prose to describe the new union (Option B: "HellaNode, primitive, raw DOM Node, or null/undefined for conditional rendering")
- `packages/dom/AGENTS.md` §HellaNode — already describes children flatly; no change unless the union narrows in a way that affects the documented gotcha "`HellaNode.children` is always flat"

---

## [ ] Tighten the HellaChild type (Code)
**Type:** Code
**Depends on:** None (but fork decision is a prerequisite gate — do not edit before the user picks A/B/C)

### Strategy
Surface the fork first via `brain-idea`-style resolution (the user picks A/B/C). Once decided, the edit is one line in `nodes.d.ts`. The real verification is the blast-radius check: `bun lint` and `bun coverage dom` together prove every consumer in `packages/dom/{lib,tests,docs,examples}` still type-checks under the new union. If either fails, read the failing site — it likely points to a real bug (e.g., a test rendering `null` that was silently accepted) or a legitimate need to widen the union. Do not `as any`-cast failures to force green; each failure is a data point about whether the chosen option is correct.

External blast radius (callers outside this repo) cannot be checked from source — note this in the handoff message: tightening a public type is a breaking change for downstream packages and warrants a changeset entry if the project versions per `@hellajs/dom`'s semver contract.

### Definition of Done
- [ ] Fork resolved (Option A / B / C chosen by user)
- [ ] `HellaChild` in `nodes.d.ts:27` matches the chosen option verbatim
- [ ] `bun coverage dom` exits 0 (proves runtime behavior unchanged)
- [ ] `rg "HellaChild" packages/dom/docs` reviewed; any doc describing the type reflects the new union
- [ ] If any test/example/doc failed to compile and was not a bug, the failure is documented as evidence for widening the union back
