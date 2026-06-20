## [ ] types.d.ts interface conversion
**Type:** Code

### Depends On
- In-place style fixes

### Objective
`packages/router/lib/types.d.ts` declares object shapes as `interface` and unions/utility/conditional types as `type`, matching `./guides/code.md` § Types and the convention every sibling package already follows (`core`, `dom`, `resource`, `css`).

### Solution
Convert the eight object-shape type aliases to `interface`. Drop the `=` sign, keep the body verbatim, keep all JSDoc and `readonly` modifiers. Targets in `types.d.ts`:
- `Routes` (49) — index signature shape.
- `RouteWithHooks` (63) — object shape with `handler?`/`before?`/`after?`/`meta?`/`scroll?`/`children?`.
- `RouterConfig` (81).
- `GlobalHooks` (100).
- `NavigateOptions<T>` (111) — generic but object-shaped; interface generics are fine.
- `Redirect` (127) — already uses `readonly`; interfaces support `readonly` members.
- `RouteInfo` (138).
- `RouteMatch` (154).

Leave as `type` (correct per guide — unions, utility aliases, conditionals, function types):
- `Params` (5) — `Record<string, string>` utility alias.
- `ExtractParams<T>` (11) — conditional/mapped recursive type.
- `Handler` (25) — function type. (The `any` narrowing is handled by the `handler-and-guard-consistency` task.)
- `HistoryMode` (31) — string union.
- `ScrollBehavior` (40) — union with function member.
- `RouteValue` (56) — union.

Trade-offs: none at the type level. `type X = {...}` and `interface X {...}` are structurally identical for consumers; converting `type` → `interface` strictly *adds* declaration-merge capability (a superset), so no downstream break. No changeset required. Runs after `in-place-style-fixes` so the quote fixes in this file land first and the two passes do not collide.

### Definition of Done
- [ ] `bun check router` exits 0
- [ ] `bun lint` exits 0
- [ ] Every changed exported symbol has JSDoc (`@internal` where not re-exported by `index.ts`)
- [ ] No new runtime dependency
- [ ] Backward compatible — no changeset needed (type alias → interface is structurally a superset)
- [ ] Audit skill run on `packages/router/lib/types.d.ts` reports no deviations from `./guides/code.md` for the interface-vs-type rule
- [ ] Does `rg "^export interface" packages/router/lib/types.d.ts` find exactly 8 matches (`Routes`, `RouteWithHooks`, `RouterConfig`, `GlobalHooks`, `NavigateOptions`, `Redirect`, `RouteInfo`, `RouteMatch`)?
- [ ] Do `Params`, `ExtractParams`, `Handler`, `HistoryMode`, `ScrollBehavior`, `RouteValue` remain declared with `export type`?
