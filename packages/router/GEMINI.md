# Router Package

Reactive client-side routing with nested routes, lifecycle hooks, and automatic parameter inheritance.

## Architecture Overview

### Mental Model

The system provides **declarative route configuration** with imperative navigation:
- **router()**: Initializes route map, hooks, and browser history listeners
- **route()**: Reactive signal exposing current path, params, query, and handler
- **navigate()**: Programmatic navigation with parameter substitution and query strings
- **Resolution**: Strict priority order (redirects → nested → flat → notFound)

### Key Components

- **router.ts**: Initialization, history API integration, resolution orchestration
- **match.ts**: Pattern matching engine with nested route recursion
- **navigate.ts**: Parameter substitution and query string serialization
- **hooks.ts**: Lifecycle execution with non-blocking error handling
- **state.ts**: Seven signals for modular state management (routes, hooks, redirects, notFound, mode, scrollBehavior, previousPath)
- **utils.ts**: Type guards, sorting, and route resolution logic

## Key Data Structures

**RouteInfo** (exposed via route signal)
```typescript
{
  path: string           // Full path including query string
  params: Params         // Extracted route parameters (inherited in nested routes)
  query: Params          // Parsed query string
  handler: Handler | null // Active route handler function
  meta?: Record<string, unknown> // Route metadata from matched route
}
```

**RouteMatch** (internal matching result)
```typescript
{
  routeValue: RouteValue    // Matched route (handler or RouteWithHooks)
  params: Params            // Parameters extracted from this segment
  query: Params             // Query parameters from URL
  remainingPath: string     // Unconsumed path for nested matching
  fullPath: string          // Complete original path
  meta?: Record<string, unknown> // Route metadata if present
}
```

**RouteValue** (route configuration)
```typescript
Handler | RouteWithHooks | string

// Handler: Simple function receiving (params, query)
// RouteWithHooks: { handler?, before?, after?, children?, meta?, scroll? }
// string: Redirect target path
```

## Key Algorithms

### Route Resolution (updateRoute in utils.ts)

**Purpose**: Determine which handler to execute for current path

**Strategy**: Strict precedence order with early exits
1. Global redirects from `redirects` array (exact path match)
2. String redirects in route map (pattern match)
3. Nested routes sorted by specificity (recursive matching)
4. Flat routes (simple pattern match)
5. notFound handler

**Why this order**: Redirects always win (security/control), nested routes prioritized (more specific), flat routes fallback (simple cases), notFound last resort.

### Hash Mode

**Purpose**: Enable routing without server-side configuration using hash URLs

**Strategy**: Uses `#` prefix for all paths, `hashchange` event instead of `popstate`
- `mode: "hash"` in router config switches to hash-based routing
- URLs become `#/path` format, `navigate()` automatically prepends `#`
- `getHashPath()` extracts path from `window.location.hash`

### Scroll Behavior

**Purpose**: Control scroll position after navigation

**Strategy**: Multiple configuration levels with override hierarchy
- Inline `scroll` option in navigate(): highest priority, overrides everything
- Route-level `scroll`: overrides global for specific routes, can be `false` to disable
- Global `scrollBehavior`: 'auto' (default) | 'top' | 'preserve' | custom function
- Custom function receives `(to, from)` paths, returns `{ top, left? }` or `null` to skip
- Skipped on initial load (when `from === to`)

### Navigate API

**Purpose**: Programmatic navigation with parameter substitution and query strings

**Signature**:
```typescript
navigate<T extends string>(
  path: T,
  options?: {
    params?: ExtractParams<T>;
    query?: Params;
    replace?: boolean;
    scroll?: ScrollBehavior | false;
    meta?: Record<string, unknown>;
  }
): void
```

**Options**:
- `params` - Route parameter substitution for `:param` patterns
- `query` - Query string parameters
- `replace` - Use replaceState instead of pushState
- `scroll` - Inline scroll override (highest priority)
- `meta` - Inline meta override (merges with route meta)

### Pattern Matching (matchPattern in match.ts)

**Purpose**: Extract parameters from URL path against route pattern

**Strategy**: String splitting with dynamic segment detection
- Split pattern and path on "/" and filter empty segments
- Detect wildcard (*) at end of pattern → captures remaining path
- Iterate segments: `:param` extracts value, literal must match exactly
- Return params object (or EMPTY_OBJECT if no dynamic segments) and remainingPath

**Critical insight**: `isNested` flag changes validation - nested patterns allow longer paths (remainingPath !== ""), flat patterns must match exactly.

### Nested Route Matching (matchNestedRoute in match.ts)

**Purpose**: Recursively match hierarchical route structures with parameter inheritance

**Strategy**: Build array of matches from parent to child
- Filter and sort routes by specificity
- For each pattern, call matchPattern with isNested=true
- If match with remainingPath and has children, recurse into children
- Build RouteMatch array: [parent, child, grandchild]
- Spread parent params into child params: `{ ...parentParams, ...childParams }`

**Why recursive**: Enables unlimited nesting depth, automatic parameter inheritance, and proper hook execution order.

### Specificity Sorting (sortRoutesBySpecificity in utils.ts)

**Purpose**: Prevent wildcard routes from shadowing specific patterns

**Strategy**: Two-tier comparison
1. Primary: Non-wildcard before wildcard (includes("*") check)
2. Secondary: Deeper paths before shallow (count "/" segments)

**Result**: /api/v1/users matches before /api/* which matches before /*

### Hook Execution (executeRouteWithHooks in utils.ts)

**Purpose**: Run lifecycle hooks in correct order with proper cleanup semantics

**Strategy for nested routes**: Forward loop for before, reverse for after
```
global.before
parent.before → child.before → handler → child.after → parent.after
global.after
```

**Why reverse after hooks**: LIFO cleanup order (child cleans up before parent), mirrors component lifecycle patterns.

## Performance Patterns

### Hot Path Optimizations

1. **EMPTY_OBJECT reuse**: Frozen {} returned for routes without params/query
2. **hasParams flag**: Defers object allocation until dynamic segment matched
3. **String splitting cached**: Pattern parts computed once, not per match attempt
4. **Type guard inlining**: isFunction/isObject checked before expensive operations
5. **Early exits**: Redirect checks before expensive nested matching

### Memory Management

- Route map stored in single signal, not per-route subscriptions
- Query string parsing skipped for empty query (returns EMPTY_OBJECT)
- Nested match arrays allocated only when children exist
- Params objects use spread (shallow copy), not deep clone

## Non-Obvious Behaviors

- **queueMicrotask on initialization**: First updateRoute() deferred to prevent race with signal subscriptions
- **Parameter substitution is simple replace**: Missing params leave empty segments (/users//posts), unused params ignored
- **Unmatched :param patterns removed**: Regex `:([^/]+)` replaced with empty string in final path
- **Query params always strings**: No type coercion, cast in handlers
- **Hooks never block navigation**: All errors caught and logged, navigation completes
- **Async hook errors use .catch()**: Promises returned by hooks have `.catch()` attached inline to prevent unhandled rejections
- **Function arity affects param passing**: 2+ arity with no params gets (undefined, query), otherwise (query)
- **Wildcard captures without leading slash**: /files/* with /files/docs/readme.md → params["*"] = "docs/readme.md"
- **Nested routes inherit params via spread**: Child can override parent params if same key
- **popstate updates route signal twice**: Once for path, once via updateRoute() - intentional for reactive updates
- **String route values are redirects**: Type discrimination via isString() guard
- **History API called before signal update**: go() calls pushState/replaceState then updates route signal
- **No route validation on initialization**: Invalid patterns detected at runtime during matching
- **Parent without handler still executes hooks**: Nested routes can have hooks-only parents
- **Flat routes match in object entry order**: Unlike nested routes (which are sorted), flat routes are not sorted by specificity - order specific routes before generic ones in the routes object
- **Replace mode uses replaceState**: Overwrites current history entry, can't go back
- **Hash mode uses hashchange event**: Different from history mode which uses popstate, go() prepends `#` to path
- **Scroll skipped on initial load**: previousPath initialized to current path, so first navigation detects `from === to`
- **Route-level scroll: false**: Explicitly disables scrolling for that route, overriding global scrollBehavior
- **Meta from final matched route**: Only the leaf route's meta is exposed on route signal, not inherited from parents
- **Hooks-only parent with no matching child falls to notFound**: If a parent route has only hooks/children (no handler) and no child matches, the route falls through to the notFound handler rather than executing the parent's hooks
