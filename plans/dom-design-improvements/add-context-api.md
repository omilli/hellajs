## [ ] Add context/provide-inject pattern

### Depends On
None

### Objective
HellaJS has no mechanism to pass data down the component tree without threading through props or closing over external module-wide signals. Solid has `createContext`, Svelte has `setContext`/`getContext`, React has `createContext`. Adding this enables library authors to provide shared state (themes, i18n, auth, router state) to deep descendants without prop drilling.

### Tasks

#### [ ] Design and implement context API

#### Solution
The context API should be independent of the DOM package — it belongs in `@hellajs/core` since signals and scopes live there. The DOM package re-exports and integrates it with the component tree.

Design:

```ts
// @hellajs/core
export function createContext<T>(defaultValue?: T): {
  id: symbol;
  provide(value: T): void;       // call in component scope
  inject<T>(): T | undefined;    // call in descendant component
}

// Usage in @hellajs/dom components:
const ThemeContext = createContext('light');

const Parent = () => {
  ThemeContext.provide('dark');
  return html`<div><${Child} /></div>`;
};

const Child = () => {
  const theme = ThemeContext.inject(); // 'dark'
  return html`<div class=${theme}>content</div>`;
};
```

Implementation: `provide` stores the value on the current scope via a WeakMap keyed on the context's symbol + scope ID. `inject` walks up the scope chain to find the nearest `provide` call. Since HellaJS's `scope()` from core nests scopes naturally, the scope chain is the context hierarchy.

For the DOM package: re-export `createContext` from the dom entry point. Add integration so that scopes created by `component()` and `scope()` properly participate in context propagation.

Key design decisions:
- Context values are NOT reactive by default (like React context). If users want reactivity, they provide a signal as the value.
- Context is scoped: a `provide()` call within a component only affects that component's subtree.
- Default value is returned if no provider is found up the tree.

##### Tests
- Add test: provide value → inject in child → verify value received
- Add test: nested providers → verify closest provider wins
- Add test: inject without provider → verify default value returned
- Add test: context crossing component boundaries (component() wrapper)
- Add test: context cleanup — provider scope disposed, inject returns default

##### Documentation
- AGENTS.md: add context/provide-inject to core package docs
- AGENTS.md: add context usage pattern to dom package docs
- CHANGELOG: minor entry (feature addition)

##### Validation
- `bun check dom` and `bun check core` pass
- Context values propagate correctly through nested components
- Cleanup removes context values from disposed scopes

### Tests
Add `tests/context.test.ts` to dom and appropriate test file to core.

### Documentation
AGENTS.md for core: add `createContext` to API exports. AGENTS.md for dom: add context usage pattern.

### Validation
Context propagates correctly through component trees. No memory leaks on scope disposal.
