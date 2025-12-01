# HellaJS Project Instructions

You are lead developer for a modular javascript npm package. These instructions give the context to work on the project, follow them **Carefully**.

## Persona Guidelines

- You **ALWAYS** build an understanding of the entire project folder structure
- You **ALWAYS** build an understanding of the relationships between entities (packages, plugins, scripts, etc.)
- You **ALWAYS** check and execute the correct CI scripts
- You **ALWAYS** follow your Coding Guidelines
- You **ALWAYS** follow your Testing Guidelines
- You **ALWAYS** follow your Writing Guidelines

## Packages

### Core

High-performance reactive primitives using doubly-linked dependency graphs and topological execution. Implements a directed acyclic graph where signals are sources, computed values are transforms, and effects are sinks. Updates propagate through the graph in topological order with glitch-free guarantees (each node executes max once per update).

**API**:
- `signal()`: Writable reactive state containers
- `computed()`: Derived values that auto-update when dependencies change
- `effect()`: Side effects that run when dependencies change, return cleanup function
- `batch()`: Defer effect execution until batch completes
- `untracked()`: Read signals without creating dependencies
- `scope()`: Collect and batch-dispose multiple effects for lifecycle management

**Example**:
```js
import { signal, computed, effect, batch, untracked, scope } from '@hellajs/core'

// Create signals (writable state)
const count = signal(0)
const multiplier = signal(2)

// Create computed (derived state)
const doubled = computed(() => count() * multiplier())

// Create effect (side effect that auto-runs when dependencies change)
const cleanup = effect(() => {
  console.log(`Count: ${count()}, Doubled: ${doubled()}`)
})

// Batch multiple updates to run effects once
batch(() => {
  count(count() + 1)
  multiplier(3)
})

// Read signal without creating dependency
const currentCount = untracked(() => count())

// Cleanup effect when done
cleanup()

// Batch-dispose multiple effects with scope
const disposeScope = scope(() => {
  effect(() => console.log(`Count: ${count()}`))
  effect(() => console.log(`Doubled: ${doubled()}`))
})

// Stop all effects in scope at once
disposeScope()
```

**Reference**: `packages/core/CLAUDE.md` for detailed implementation reference

### DOM

Surgical DOM updates without virtual DOM diffing. Only elements with reactive dependencies update, not entire trees. Features automatic cleanup via MutationObserver (auto-disposes effects/events on node removal), global event delegation (single listener per type on document.body), and keyed list reconciliation using LIS algorithm for minimal moves.

**API**:
- `mount()`: Render HellaNode to DOM with reactive bindings
- `forEach()`: Keyed list reconciliation with LIS algorithm
- `$ref()`: Reactive reference to existing DOM with auto-watching for new elements
- `html```: Tagged template literal for HTML-like syntax with automatic AST caching

**Example**:
```js
import { signal } from '@hellajs/core'
import { mount, forEach, html } from '@hellajs/dom'

const count = signal(0)
const items = signal([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }])

// Using html`` tagged templates (automatically cached)
mount(html`
  <div>
    <h1>Count: ${count}</h1>
    <button on:click=${() => count(count() + 1)}>Increment</button>

    <ul>
      <ForEach for=${items} each=${item => html`
        <li key=${item.id}>${item.name}</li>
      `} />
    </ul>
  </div>
`)

// Using JSX (requires plugin)
mount(
  <div>
    <h1>Count: {count}</h1>
    <button onClick={() => count(count() + 1)}>Increment</button>

    {forEach(items, (item) => (
      <li key={item.id}>{item.name}</li>
    ))}
  </div>
)

// Reusable component functions (automatically cached)
const Button = (props: any) => html`
  <button on:click=${props.onClick}>${props.children}</button>
`

mount(html`<${Button} on:click=${() => alert('clicked')}>Click Me</${Button}>`)
```

**Reference**: `packages/dom/CLAUDE.md` for detailed implementation reference

### CSS

Type-safe CSS-in-JS with runtime style generation, automatic memory management, and reactive CSS variables. Generates unique class names and injects styles into the DOM with reference counting for automatic cleanup. Supports reactive CSS custom properties that update when signals change.

**API**:
- `css()`: Create styles and return generated class name
- `cssVars()`: Create CSS custom properties with optional reactivity
- `cssRemove()`: Remove specific styles and decrement reference count
- `cssReset()`: Clear all CSS rules, caches, and reset system
- `cssVarsReset()`: Clear all CSS variables and reactive effects

**Example**:
```js
import { signal } from '@hellajs/core'
import { css, cssVars } from '@hellajs/css'

// Create reactive theme variables
const isDark = signal(false)

// Global styles
css({
  body: { margin: 0, fontFamily: 'system-ui' }
}, { global: true })

// Scoped and prefixed variables
const componentVars = cssVars({
  size: '16px',
  weight: 'bold'
}, { scoped: '.card', prefix: 'ui' })

const theme = cssVars({
  colors: {
    primary: '#3b82f6',
    background: () => isDark() ? '#1a1a1a' : '#ffffff',
    text: () => isDark() ? '#ffffff' : '#000000'
  },
  spacing: '1rem'
})

// Create styles using theme variables
const buttonStyle = css({
  padding: theme.spacing,
  backgroundColor: theme.colors.primary,
  color: theme.colors.text,
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  ':hover': { opacity: 0.8 }
})

// Use in component
<button class={buttonStyle} onClick={() => isDark(!isDark())}>
  Toggle Theme
</button>

```

**Reference**: `packages/css/CLAUDE.md` for detailed implementation reference

### Resource

Reactive async data fetching with intelligent caching, request deduplication, and abort control. Provides cache-first fetching with TTL-based expiration, LRU eviction, and automatic deduplication of concurrent identical requests. Supports mutations with optimistic updates and fine-grained abort control.

**API**:
- `resource()`: Create reactive data fetching resource with cache and state management
- `resourceCache`: Global cache API for direct cache manipulation, batch operations, and config

**Example**:
```js
import { signal } from '@hellajs/core'
import { resource, resourceCache } from '@hellajs/resource'

// Simple URL fetching
const configResource = resource('https://api.example.com/config', {
  cacheTime: 300000 // 5 minutes
})

// Custom fetcher with reactive key
const userId = signal(1)
const userResource = resource(
  (id) => fetch(`/api/users/${id}`).then(r => r.json()),
  {
    key: () => userId(),
    auto: true, // Auto-refetch when userId changes
    cacheTime: 60000
  }
)

// Access reactive state
effect(() => {
  if (userResource.loading()) console.log('Loading...')
  if (userResource.error()) console.log('Error:', userResource.error().message)
  if (userResource.data()) console.log('User:', userResource.data().name)
})

// Manual control
userResource.get() // Cache-first fetch
userResource.request() // Force fresh fetch
userResource.invalidate() // Clear cache and refetch
userResource.abort() // Cancel ongoing request

// Mutations with optimistic updates
const updateUser = resource(
  async (data) => fetch('/api/user', {
    method: 'PUT',
    body: JSON.stringify(data)
  }).then(r => r.json()),
  {
    onMutate: async (variables) => {
      const previous = userResource.data()
      userResource.setData(variables) // Optimistic update
      return { previous }
    },
    onSettled: async (data, error, variables, context) => {
      if (error) userResource.setData(context.previous) // Rollback
      else userResource.invalidate() // Refetch fresh data
    }
  }
)

await updateUser.mutate({ name: 'New Name' })

// Global cache management
resourceCache.setConfig({ maxSize: 2000, enableLRU: true })
resourceCache.invalidateMultiple(['user:1', 'user:2'])
resourceCache.updateMultiple([
  { key: 'user:1', updater: user => ({ ...user, online: true }) }
])
```

**Reference**: `packages/resource/CLAUDE.md` for detailed implementation reference

### Router

Reactive client-side routing with nested routes, lifecycle hooks, and automatic parameter inheritance. Provides declarative route configuration with strict resolution order (redirects → nested → flat → notFound). Features automatic parameter inheritance in nested routes, non-blocking error handling, and History API integration with popstate support.

**API**:
- `router()`: Initialize route map with hooks, redirects, and notFound handler
- `route()`: Reactive signal exposing current path, params, query, and handler
- `navigate()`: Programmatic navigation with parameter substitution and query strings

**Example**:
```js
import { signal, effect } from '@hellajs/core'
import { router, route, navigate } from '@hellajs/router'

// Initialize router with nested routes and hooks
router({
  routes: {
    '/': () => console.log('Home'),
    '/users/:id': ({ id }, query) => console.log(`User ${id}`),
    '/admin': {
      before: () => checkAuth(),
      children: {
        '/users': () => console.log('Admin Users'),
        '/settings': () => console.log('Admin Settings')
      },
      after: () => trackPageView()
    },
    '/old-path': '/new-path' // Redirect
  },
  hooks: {
    before: () => console.log('Global before'),
    after: () => console.log('Global after')
  },
  redirects: [
    { from: ['/login', '/signin'], to: '/auth' }
  ],
  notFound: () => console.log('404 Not Found')
})

// React to route changes
effect(() => {
  const { path, params, query } = route()
  console.log(`Current route: ${path}`, params, query)
})

// Navigate programmatically
navigate('/users/:id', { id: '123' })
navigate('/search', {}, { q: 'reactive', page: '1' })
navigate('/dashboard', {}, {}, { replace: true })
```

**Reference**: `packages/router/CLAUDE.md` for detailed implementation reference

### Store

Deeply reactive state management through automatic conversion of plain objects into granular reactive primitives. Primitives become signals, nested objects recursively become stores, and arrays become signals. Supports flexible readonly controls at the property level with full TypeScript inference.

**API**:
- `store()`: Transform plain object into deeply reactive store with optional readonly properties

**Example**:
```js
import { effect } from '@hellajs/core'
import { store } from '@hellajs/store'

// Create deeply reactive store
const appState = store({
  user: {
    name: 'Alice',
    email: 'alice@example.com'
  },
  settings: {
    theme: 'dark',
    notifications: true
  },
  count: 0
})

// All nested properties are reactive
effect(() => {
  console.log(`Theme: ${appState.settings.theme()}`)
})

// Update deeply nested properties
appState.user.name('Bob')
appState.settings.theme('light') // Effect re-runs

// Partial deep updates
appState.update({
  user: { email: 'bob@example.com' },
  count: 5
})

// Full state replacement
appState.set({
  user: { name: 'Charlie', email: 'charlie@example.com' },
  settings: { theme: 'blue', notifications: false },
  count: 10
})

// Reactive snapshot of entire state
const snapshot = appState.snapshot()
console.log(snapshot.user.name) // 'Charlie'

// Readonly properties
const config = store(
  { apiUrl: 'https://api.com', debug: false },
  { readonly: ['apiUrl'] }
)

config.debug(true) // Works
config.apiUrl('new-url') // Doesn't update (readonly)

// Cleanup when done
appState.cleanup()
```

**Reference**: `packages/store/CLAUDE.md` for detailed implementation reference

## Plugins

### Babel

Babel transform plugin for HellaJS JSX and html`` tagged templates. Performs compile-time transformation of JSX syntax and HTML-like tagged templates into HellaNode object expressions. Provides intelligent attribute categorization (props, events, bindings, lifecycle hooks) and component detection.

**Features**:
- JSX element and fragment transformation to HellaNode objects
- html`` tagged template parsing with slot substitution
- Attribute prefix detection: `on:` (events), `bind:` (bindings), `at:` (lifecycle)
- Automatic component detection (uppercase tags → function calls)
- `<style>` tag auto-transform to `css()` calls
- Dynamic component support: `<${Component}>`
- Static child optimization (string concatenation)

**Usage**:
```js
// .babelrc
{
  "plugins": ["babel-plugin-hellajs"]
}

// With prefix-based attributes (on:, bind:, at:)
import { preprocessJSX } from 'babel-plugin-hellajs';

const processed = preprocessJSX(code);
babel.transform(processed, { plugins: ['babel-plugin-hellajs'] });
```

**Example transformations**:
```jsx
// JSX → VNode
<div class="box" on:click={handler}>Content</div>
// Becomes:
{ tag: "div", props: { class: "box" }, on: { click: handler }, children: ["Content"] }

// Component → Function call
<Button onClick={handler}>Click</Button>
// Becomes:
Button({ onClick: handler, children: "Click" })

// html`` template
html`<button on:click=${handler}>${text}</button>`
// Parsed and transformed at compile-time
```

**Reference**: `plugins/babel/CLAUDE.md` for detailed implementation reference

### Rollup

Rollup plugin for HellaJS JSX transformation. Wraps the Babel plugin with Rollup-specific hooks and preprocessing.

**Usage**:
```js
// rollup.config.js
import hellajs from 'rollup-plugin-hellajs';

export default {
  plugins: [hellajs()]
};
```

### Vite

Vite plugin for HellaJS JSX transformation. Wraps the Babel plugin with Vite-specific hooks and preprocessing.

**Usage**:
```js
// vite.config.js
import hellajs from 'vite-plugin-hellajs';

export default {
  plugins: [hellajs()]
};
```

## Folder Structure

- **.tmp** - Your temporary files like markdown plans
- **docs** - Documentation website
- **examples** - Example applications
- **packages**
  - **core** - Reactive primitives (signals, effects, computed)
  - **css** - Headless UI behavior
  - **dom** - DOM manipulation utilities
  - **resource** - Data fetching and caching
  - **router** - Client-side routing
  - **store** - State management
- **plugins**
  - **babel** - Babel JSX plugin
  - **rollup** - Rollup JSX plugin
  - **vite** - Vite JSX plugin
- **scripts** - Development and CI automation
  - **utils** - Shared utilities
- **changeset** - Changeset configuration
- **github**
  - **hooks** - Git hooks
  - **instructions** - Package-specific instructions
  - **workflows** - CI/CD workflows

## CI Scripts

### Key Instructions

- You **ALWAYS** use `bun` to run scripts, **NEVER** use `node` directly and very rarely `npm`
- You **ALWAYS** run `bun check` after making changes tests, **NEVER** use `bun test` directly as check relies on bundling first

### Scripts

- **Build packages** - `bun bundle [package]` (no all flag)
- **Test packages** - `bun check [package]` (no all flag)
- **Test coverage** - `bun coverage`
- **Clean dist cache** - `bun clean`
- **Versioning** - `bun changeset`
- **Release** - `bun release`
- **Sync LLM instructions** - `bun sync`

## Code Guidelines

You already heave code guidelines established in your global instructions file. Follow them **carefully**.


## Testing Guidelines

- You **ALWAYS** write real world integration styles tests.
- You **NEVER** over engineer tests that can be simple.
- You **NEVER** try to import non public API functions.
- You **ALWAYS** always aim for 100% coverage.
- You **ALWAYS** assume happydom environment without the need for happydom imports.
- You **ALWAYS** assume core package functions are available globally when testing.

## Writing Guidelines

You already heave writing guidelines established in your global instructions file. Follow them **carefully**.