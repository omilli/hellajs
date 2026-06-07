# Router Package

Reactive client-side routing with nested routes, lifecycle hooks, and automatic parameter inheritance.

## Mental Model

- **router()**: Initializes route map, hooks, and browser history listeners
- **route()**: Reactive signal exposing current path, params, query, and handler
- **navigate()**: Programmatic navigation with parameter substitution and query strings
- **Resolution**: Strict priority order (redirects → nested → flat → notFound)

## Key Components

- **router.ts**: Initialization, history API integration, resolution orchestration
- **match.ts**: Pattern matching engine with nested route recursion
- **navigate.ts**: Parameter substitution and query string serialization
- **hooks.ts**: Lifecycle execution with non-blocking error handling
- **state.ts**: Seven signals (routes, hooks, redirects, notFound, mode, scrollBehavior, previousPath)
- **utils.ts**: Type guards, sorting, and route resolution logic

## Route Resolution Order

1. Global redirects from `redirects` array (exact path match)
2. String redirects in route map (pattern match)
3. Nested routes sorted by specificity (recursive matching)
4. Flat routes (simple pattern match)
5. notFound handler

Nested routes are sorted: non-wildcard before wildcard, deeper paths before shallow. Flat routes match in object entry order.

## Hook Execution

```
global.before → parent.before → child.before → handler → child.after → parent.after → global.after
```

After hooks execute in reverse (LIFO cleanup order).

## Non-Obvious Behaviors

- **queueMicrotask on init**: First `updateRoute()` deferred to prevent race with signal subscriptions
- **Hooks never block navigation**: All errors caught and logged, navigation completes regardless
- **Function arity affects param passing**: 2+ arity with no params gets `(undefined, query)`, otherwise `(query)`
- **Wildcard captures without leading slash**: `/files/*` with `/files/docs/readme.md` → `params["*"] = "docs/readme.md"`
- **Nested params inherit via spread**: Child overrides parent if same key
- **Flat routes not sorted by specificity**: Order specific routes before generic ones in the routes object
- **Scroll skipped on initial load**: `previousPath` initialized to current path, first navigation detects `from === to`
- **Meta from final matched route only**: Leaf route's meta exposed on route signal, not inherited from parents
- **Listener cleanup on re-init**: Calling `router()` again removes previous event listeners

## Performance Patterns

- **EMPTY_OBJECT reuse**: Frozen `{}` returned for routes without params/query
- **hasParams flag**: Defers object allocation until dynamic segment matched
- **Early exits**: Redirect checks before expensive nested matching
- **Route map in single signal**: Not per-route subscriptions
