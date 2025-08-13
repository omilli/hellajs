---
applyTo: "**"
---

# Script Instructions

Follow these instructions when working in this monorepo sub-folder. @hellajs/router is the client-side routing system that provides reactive navigation and URL management.

## Structure
- `router.ts` - Router initialization with route map registration and navigation mode setup
- `state.ts` - Reactive state management using signals for routes, hooks, and current route info
- `utils.ts` - Route matching, URL parsing, hash/history navigation, and hook execution utilities
- `types.ts` - TypeScript type definitions for route handlers, hooks, and router configuration
- `index.ts` - Public API exports for router functionality

## Approach

### Signal-Based Route State Management
- Three core signals manage router state: `routes` (route map), `hooks` (global configuration), and `route` (current route info)
- Current route info includes handler, params, query, and path as a reactive `RouteInfo` object
- Route changes automatically propagate through the reactive system to update dependent components
- Browser URL synchronization maintains bidirectional binding between signals and address bar

### Pattern-Based Route Matching
- Route patterns support dynamic parameters (`:param`) and wildcard segments (`*`)
- Pattern matching splits URLs into path and query components for separate processing
- Parameter extraction uses pattern tokenization with bidirectional parameter/wildcard support
- Route matching follows priority order: redirects → pattern matching → 404 fallback

### Dual Navigation Mode Support
- History mode uses `pushState`/`replaceState` for clean URLs with popstate event handling
- Hash mode uses URL fragments with hashchange event handling for broader browser compatibility
- Navigation mode determined by `hash` option in router configuration
- `navigate()` function abstracts mode differences with unified parameter/query handling

### Lifecycle Hook System
- Global hooks (`before`, `after`, `404`) execute around all route changes
- Route-specific hooks (`before`, `after`) execute for individual route handlers
- Hook execution order: global before → route before → handler → route after → global after
- Hooks support both parameterized and parameter-less route handlers with automatic detection

### Redirect and 404 Handling
- String values in route map create automatic redirects with history replacement
- Global redirects array supports complex redirect patterns with from/to mapping
- 404 handler executes when no route patterns match the current URL
- All redirects use `replace: true` to avoid creating unnecessary history entries