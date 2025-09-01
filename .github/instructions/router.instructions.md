---
applyTo: "packages/router/**"
---

# @hellajs/router Instructions

Follow these instructions when working on the Router package. @hellajs/router provides reactive client-side routing with dynamic parameters, nested routes, lifecycle hooks, and seamless signal-based navigation.

## Quick Reference

### Key Files
- `lib/router.ts` - Main router function with configuration and navigation mode setup
- `lib/state.ts` - Reactive state management with signals for routes, hooks, and current route
- `lib/utils.ts` - Route matching, URL parsing, navigation utilities, and hook execution
- `lib/types.ts` - TypeScript definitions for route handlers, hooks, and router configuration
- `lib/index.ts` - Public API exports

## Architecture

### Core Design Principles
1. **Signal-Based Reactivity**: All route state managed through reactive signals
2. **Type Safety**: Full TypeScript support with parameter inference
3. **Flexible Navigation**: Support for both history and hash-based routing
4. **Hierarchical Routing**: Nested routes with parameter inheritance
5. **Hook System**: Comprehensive lifecycle management with cascading hooks

### Router Function (`router`)
```typescript
function router<T extends Record<string, unknown>>(config: {
  routes: RouteMapOrRedirects<T>;
  hooks?: RouterHooks;
  notFound?: () => void;
  hash?: boolean;
  redirects?: { from: string[]; to: string }[];
}): RouteInfo
```

**Features**:
- Initializes routing with route map and global configuration
- Configures navigation mode (history vs hash)
- Sets up browser event listeners for route changes
- Manages global hooks and redirects
- Returns initial route state

**Configuration Options**:
- `routes` - Route definitions with handlers or nested structures
- `hooks?` - Global before/after hooks for all navigation
- `notFound?` - Handler for unmatched routes
- `hash?` - Enable hash-based routing (default: false)
- `redirects?` - Array of redirect mappings from legacy paths

### Navigation Function (`navigate`)
```typescript
function navigate(
  pattern: string,
  params?: Record<string, string>,
  query?: Record<string, string>,
  opts?: { replace?: boolean; hash?: boolean }
): void
```

**Features**:
- Pattern-based navigation with parameter substitution
- Query parameter handling with URL encoding
- Support for history replacement vs push
- Mode-aware navigation (history vs hash)

### State Management System
Located in `state.ts`:
- `routes` - Signal containing current route map
- `hooks` - Signal for global router hooks
- `route` - Signal containing current route information
- `redirects` - Signal for redirect configurations
- `notFound` - Signal for not-found handler

### Route Information Structure
```typescript
type RouteInfo = {
  handler: RouteHandler<string> | null;
  params: Record<string, string>;
  query: Record<string, string>;
  path: string;
}
```

## Implementation Details

### Dual Navigation Mode Support
```typescript
// router.ts:15-45
if (config.hash) {
  isHashMode = true;
  // Hash mode setup with hashchange listener
  window.addEventListener("hashchange", () => {
    route({ ...route(), path: getHashPath() });
    updateRoute();
  });
} else {
  isHashMode = false;  
  // History mode setup with popstate listener
  window.addEventListener("popstate", () => {
    route({ ...route(), path: window.location.pathname + window.location.search });
    updateRoute();
  });
}
```

**Navigation Modes**:
- **History Mode**: Uses `pushState`/`replaceState` for clean URLs
- **Hash Mode**: Uses URL fragments for broader compatibility
- Mode-specific event handling and path extraction
- Automatic browser synchronization

### Route Matching System
Located in `utils.ts` with priority-based matching:

1. **Global Redirects**: Array-based redirects processed first
2. **Route Map Redirects**: String values in route map
3. **Nested Route Matching**: Hierarchical route structures with specificity sorting
4. **Flat Route Matching**: Fallback for simple route patterns
5. **Not Found Handler**: Default handler when no routes match

```typescript
// utils.ts:312-352 - Pattern matching implementation
function matchRoute(routePattern: string, path: string): {
  params: Record<string, string>;
  query: Record<string, string>;
} | null
```

**Pattern Features**:
- Dynamic parameters with `:param` syntax
- Wildcard matching with `*` for remaining path segments
- Query parameter parsing and extraction
- Memory-efficient parameter object creation

### Nested Route System
```typescript
// Support for hierarchical route structures
router({
  routes: {
    '/admin': {
      handler: () => mount(<AdminDashboard />),
      children: {
        '/users': {
          handler: () => mount(<UsersList />),
          children: {
            '/:id': (params) => mount(<UserDetail id={params.id} />)
          }
        }
      }
    }
  }
});
```

**Nested Route Features**:
- Parameter inheritance from parent to child routes
- Hook cascading with proper execution order
- Specificity-based route matching prioritization
- Fallback handling through parent routes

### Lifecycle Hook System
```typescript
// Hook execution order in utils.ts
function callWithNestedHooks(matches: NestedRouteMatch[]) {
  // Global before hook
  globalHooks.before?.();
  
  // Route-specific before hooks (parent to child)
  matches.forEach(match => match.routeValue.before?.(match.params, match.query));
  
  // Execute final handler
  finalHandler?.(params, query);
  
  // Route-specific after hooks (child to parent)
  matches.reverse().forEach(match => match.routeValue.after?.(match.params, match.query));
  
  // Global after hook
  globalHooks.after?.();
}
```

**Hook Types**:
- Global hooks: Execute around all route changes
- Route-specific hooks: Execute for individual routes
- Parameter-aware: Hooks receive route params and query
- Cascading execution: Parent hooks run before child hooks

### URL Management
Located in utility functions:
- `getHashPath()` - Extract path from hash fragment
- `setHashPath()` - Update hash with history management
- `go()` - History API navigation wrapper
- `parseQuery()` - Query string parsing with decoding

## Development Guidelines

### Adding New Features
1. **Understand Signal Flow**: Review state management in `state.ts`
2. **Maintain Type Safety**: Update `types.ts` for new features
3. **Preserve Hook Order**: Ensure lifecycle hooks execute properly
4. **Test Navigation Modes**: Verify both history and hash mode compatibility
5. **Add Comprehensive Tests**: Include route matching, navigation, and hook tests

### Performance Considerations
- Use memory-efficient empty objects for params/query when possible
- Prioritize specific routes over wildcards in matching
- Batch route updates to prevent excessive re-renders
- Leverage signal-based updates for optimal reactivity
- Cache parsed route patterns when beneficial

### Common Patterns
```typescript
// ✅ Reactive route handling
effect(() => {
  const { path, params, query } = route();
  console.log(`Current route: ${path}`, { params, query });
});

// ✅ Type-safe parameter extraction
router({
  routes: {
    '/users/:id': (params) => {
      // params.id is automatically typed as string
      mount(<UserDetail id={params.id} />);
    }
  }
});

// ✅ Nested route with hooks
router({
  routes: {
    '/dashboard': {
      handler: () => mount(<Dashboard />),
      before: () => checkAuth(),
      after: () => logNavigation(),
      children: {
        '/settings': () => mount(<Settings />)
      }
    }
  }
});

// ✅ Programmatic navigation with query
navigate('/users/:id', { id: '123' }, { tab: 'profile' });

// ✅ Hash mode configuration
router({
  routes: { '/': () => mount(<HomePage />) },
  hash: true // Use hash-based routing
});
```

### API Consistency Rules
- All route handlers receive consistent parameter structures
- Hook execution follows predictable order (global → specific → handler → specific → global)
- Navigation functions work identically across modes
- TypeScript types provide full parameter inference
- Error handling for malformed patterns and invalid routes

## Integration

### With @hellajs/core
- Route state managed through core signals system
- Effects automatically react to route changes
- Computed values can derive from current route
- Batch updates aligned with core scheduling

### Route State Reactivity
```typescript
import { signal, effect, computed } from '@hellajs/core';
import { router, route, navigate } from '@hellajs/router';

// Route changes trigger automatic updates
effect(() => {
  const currentRoute = route();
  document.title = `App - ${currentRoute.path}`;
});

// Computed values based on route
const isAdminRoute = computed(() => 
  route().path.startsWith('/admin')
);
```

### Navigation Integration
- Browser back/forward buttons work seamlessly
- URL bar reflects current application state
- Programmatic navigation updates browser history
- Hash mode provides fallback for environments without History API support