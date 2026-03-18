# HellaJS Router Audit & Comparison

## Executive Summary

HellaJS Router is a **lightweight, reactive, client-side router** (~2KB gzipped) with a unique signal-first architecture. It excels in simplicity and reactivity but lacks several features found in larger frameworks.

---

## Feature Comparison Matrix

| Feature | HellaJS | TanStack Router | React Router v7 | Vue Router v5 | Angular Router | Solid Router |
|---------|---------|-----------------|-----------------|---------------|----------------|--------------|
| **Core Size** | ~2KB | ~12KB | ~13KB | ~15KB | ~25KB+ | ~3KB |
| **Nested Routes** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Dynamic Params** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Query Params** | ✅ Basic | ✅ Advanced | ✅ Basic | ✅ Basic | ✅ Basic | ✅ Basic |
| **Wildcards** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Navigation Guards** | ✅ before/after | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Global Hooks** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Type-Safe Routes** | ⚠️ Partial | ✅ 100% | ⚠️ Partial | ✅ Full | ✅ Full | ⚠️ Partial |
| **Type-Safe Nav** | ❌ | ✅ 100% | ⚠️ With setup | ✅ | ✅ | ⚠️ |
| **Search Param Schema** | ❌ | ✅ Zod/etc | ❌ | ❌ | ❌ | ❌ |
| **Built-in Data Loaders** | ❌ | ✅ SWR Cache | ✅ Loaders | ✅ Data Loaders | ✅ Resolve | ✅ |
| **Built-in Caching** | ❌ | ✅ SWR | ❌ | ❌ | ❌ | ❌ |
| **Code Splitting** | Manual | ✅ Built-in | ✅ Built-in | ✅ Lazy | ✅ Lazy | ✅ Lazy |
| **File-based Routing** | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Redirects** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **History Modes** | ✅ Multi | ✅ Multi | ✅ Multi | ✅ Multi | ✅ Multi | ✅ Multi |
| **Route Meta** | ✅| ✅ | ✅ | ✅ | ✅ | ❌ |
| **Named Views** | ❌ | ❌ | ✅ Outlets | ✅ Named | ✅ Named | ✅ |
| **Scroll Restoration** | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Error Boundaries** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Prefetching** | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Middleware** | ❌ | ✅ | ✅ v7 | ❌ | ✅ Interceptors | ❌ |
| **Parallel Loading** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## HellaJS Router Strengths

### 1. **Minimalist Architecture**
- Single `router()` call to initialize
- Three exports total: `router`, `route`, `navigate`
- No components required - works with any rendering approach

### 2. **Signal-Native Reactivity**
```jsx
// Direct signal integration - no hooks/context needed
const { path, params } = route();
// Automatically updates when URL changes
```

### 3. **Flexible Handler Pattern**
```jsx
routes: {
  '/': () => renderView('Home'),           // Simple function
  '/admin': { handler, before, after },    // Object with hooks
  '/old': '/new'                           // String redirect
}
```

### 4. **Clean Nested Route Syntax**
```jsx
'/admin': {
  children: {
    '/users': {
      children: { '/:id': handler }
    }
  }
}
```

### 5. **Predictable Resolution Order**
1. Global redirects
2. Route map string redirects
3. Nested routes (sorted by specificity)
4. Flat routes (object order)
5. notFound handler

### 6. **Non-Blocking Error Handling**
Hook errors log but don't block navigation - resilient by default.

---

## Implementation Todo List

Prioritized by **Impact × Effort** ratio (high impact / low effort first).

### Phase 1: Quick Wins (Low Complexity)

| # | Feature | Complexity | Impact | Description |
|---|---------|------------|--------|-------------|
| ✅ | **Hash Mode** | Low | Medium | `mode: 'hash'` for static file hosting without server config |
| ✅ | **Route Meta Field** | Low | Medium | `meta` property for document head (title, SEO, analytics) |

### Phase 2: Type Safety (Medium Complexity, High Impact)

| # | Feature | Complexity | Impact | Description |
|---|---------|------------|--------|-------------|
| 3 | **Typed Route Paths** | Medium | High | Template literal types for route patterns |
| 4 | **Typed `navigate()`** | Medium | High | Infer required params from path pattern |
| 5 | **Route Config Types** | Medium | High | Full type inference from routes object |

### Phase 3: UX Enhancements (Medium Complexity)

| # | Feature | Complexity | Impact | Description |
|---|---------|------------|--------|-------------|
| 6 | **Scroll Restoration** | Medium | Medium | Configurable scroll behavior on navigation |
| 7 | **Code Splitting Helper** | Medium | Medium | `lazy(() => import(...))` utility with error handling |
| 8 | **Route Transition Hooks** | Medium | Medium | `onEnter`, `onLeave` callbacks per route |

### Phase 4: Advanced Features (Higher Complexity)

| # | Feature | Complexity | Impact | Description |
|---|---------|------------|--------|-------------|
| 9 | **Data Loader Pattern** | High | High | `loader` function with loading state integration |
| 10 | **Prefetching API** | Medium | Medium | Preload routes/data on link hover |
| 11 | **Search Param Schema** | Medium | Medium | Optional validation (Zod/Valibot integration) |
| 12 | **Route Middleware** | Medium | Low | Composable middleware chain |

### Phase 5: Nice-to-Have (Optional)

| # | Feature | Complexity | Impact | Description |
|---|---------|------------|--------|-------------|
| 13 | **Error Boundary Integration** | Medium | Low | Route-level error handling |
| 14 | **Named Views** | Medium | Low | Multiple outlet support |
| 15 | **Route Debug Panel** | Low | Low | Dev tool for route inspection |
| 16 | **File-based Routing** | High | Low | Vite plugin for auto-route generation |

---

## Detailed Feature Specs

### 1. Hash Mode

**Complexity:** Low
**Files to modify:** `router.ts`, `state.ts`, `utils.ts`

```ts
type HistoryMode = 'history' | 'hash';

router({
  routes,
  mode: 'hash' // Uses #/ paths
});
```

**Implementation notes:**
- Hash mode: intercept `hashchange` instead of `popstate`
- Path reading: `window.location.hash.slice(1)` instead of `pathname`
- Navigation: Update hash portion only

---

### 2. Route Meta Field

**Complexity:** Low
**Files to modify:** `types.d.ts`, `utils.ts`, `state.ts`

```ts
type RouteWithHooks = {
  handler?: Handler;
  before?: Handler;
  after?: Handler;
  meta?: Record<string, unknown>; // NEW
  children?: Routes;
};

// Usage - document head management
routes: {
  '/about': {
    meta: { title: 'About Us', description: 'Learn more about us' },
    handler: ...
  }
}

// Access via route signal
const { meta } = route();
document.title = meta?.title || 'Default Title';
```

**Use cases:**
- Page titles
- Meta description/tags
- Analytics contexts
- Breadcrumb data
- Open Graph tags

---

### 3. Type-Safe Navigation

**Complexity:** Medium
**Files to modify:** `navigate.ts`, `types.d.ts`

```ts
// Extract params from route pattern
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractParams<Rest>]: string }
    : T extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : {};

// Typed navigate
function navigate<T extends string>(
  path: T,
  params: ExtractParams<T>,
  query?: Params,
  options?: NavigateOptions
): void;

// Usage - params are now required and type-checked
navigate('/users/:id', { id: '123' }); // ✅
navigate('/users/:id', {}); // ❌ Error: missing 'id'
```

---

### 4. Scroll Restoration

**Complexity:** Medium
**Files to modify:** `router.ts`, `utils.ts`

```ts
type ScrollBehavior = 'auto' | 'top' | 'preserve' | ((to: string, from: string) => { top: number; left?: number });

router({
  routes,
  scrollBehavior: 'top' // or custom function
});
```

---

### 5. Data Loader Pattern

**Complexity:** High
**Files to modify:** `types.d.ts`, `utils.ts`, new `loader.ts`

```ts
type RouteWithHooks = {
  handler?: Handler;
  loader?: (ctx: { params: Params; query: Params }) => Promise<unknown>;
  // ...
};

// Loader runs before handler, exposes loading state
routes: {
  '/users/:id': {
    loader: async ({ params }) => {
      return { user: await fetchUser(params.id) };
    },
    handler: (params, query, data) => {
      // data contains loader result
    }
  }
}
```

---

### 6. Code Splitting Helper

**Complexity:** Medium
**New file:** `lazy.ts`

```ts
export function lazy<T extends Handler>(
  importFn: () => Promise<{ default: T }>,
  fallback?: Handler
): RouteWithHooks {
  let cached: T | null = null;

  return {
    handler: async (...args) => {
      if (!cached) {
        const module = await importFn();
        cached = module.default;
      }
      return cached(...args);
    }
  };
}

// Usage
routes: {
  '/admin': lazy(() => import('./AdminPage.js'))
}
```

---

## Competitive Analysis Summary

| Router | Bundle | Type Safety | Data Loading | Best For |
|--------|--------|-------------|--------------|----------|
| **HellaJS** | ~2KB | ⚠️ Partial | ❌ | Lightweight SPAs |
| **TanStack** | ~12KB | ✅ 100% | ✅ SWR Cache | TypeScript apps |
| **React Router** | ~13KB | ⚠️ Partial | ✅ Loaders | React ecosystems |
| **Vue Router** | ~15KB | ✅ Full | ✅ Pinia | Vue.js apps |
| **Solid Router** | ~3KB | ⚠️ Partial | ✅ | SolidJS apps |

---

## Conclusion

HellaJS Router occupies a unique niche: **minimalist reactive routing**. It's ideal for:

- Lightweight SPAs
- Micro-frontends
- Projects avoiding framework lock-in
- Signal-based architectures

**Recommended implementation order:**
1. Hash mode + Route meta (quick wins)
2. Type-safe navigation (catches bugs at compile time)
3. Data loaders (improves data fetching DX)

The current implementation is well-architected with clear resolution semantics and excellent performance characteristics.
