## [ ] Export Fragment for JSX users

### Depends On
None

### Objective
The internal fragment tag `"$"` is used by `html\`\`` (multiple root elements auto-wrap in a fragment) but there is no user-facing `Fragment` export for JSX users. JSX users who want to return multiple root elements must wrap them in an array or a wrapper `<div>`, which adds unnecessary nesting.

### Tasks

#### [ ] Add Fragment export to public API

#### Solution
Add a `Fragment` export to `lib/index.ts` and make it available through the package entry point. For JSX, declare the `Fragment` in the `JSX` namespace types.

Implementation:

```ts
// lib/Fragment.ts
import type { HellaNode } from "./types/nodes";

export function Fragment(props: { children?: HellaNode | HellaNode[] }): HellaNode {
  return {
    tag: "$",
    children: Array.isArray(props.children) ? props.children : [props.children]
  } as HellaNode;
}
```

Alternatively, if the component system already handles this (function returning HellaNode with children), just export the JSX namespace type and a simple identity-like function.

For JSX users, the `JSX.IntrinsicElements` type or `JSX.ElementChildrenAttribute` needs `Fragment` declared. In `lib/index.ts`:

```ts
// In the JSX namespace declaration
export namespace JSX {
  // ...
  export type Fragment = typeof Fragment;
}
```

For `html\`\`` users, fragments already work implicitly via the `"$"` tag wrapping. No change needed.

##### Tests
- Add test: JSX `<><div>a</div><div>b</div></>` — verify both elements rendered
- Add test: Fragment with single child — verify single child rendered
- Add test: Fragment with no children — verify empty render
- Add test: Fragment integration with ForEach — verify lists inside fragments work

##### Documentation
- AGENTS.md: add Fragment to API exports
- AGENTS.md: add fragment usage pattern
- CHANGELOG: minor entry (new export)

##### Validation
- `bun check dom` passes
- Fragment works in JSX context
- No extra DOM nesting introduced

### Tests
Add fragment test cases to `tests/mount.test.ts` or a new `tests/fragment.test.ts`.

### Documentation
AGENTS.md: add Fragment to public API exports and basic usage pattern.

### Validation
JSX users can use `<></>` or `<Fragment>` for multi-root returns.
