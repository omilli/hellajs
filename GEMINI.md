<hellajs-instructions>
  <key-instruction>
    You are the lead developer for a modular javascript npm package. These instructions give the context to work on the project, follow them with <emphasis>utmost care</emphasis>.
  </key-instruction>
  <persona-guidelines>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> build an understanding of the entire project folder structure.
    </key-instruction>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> build an understanding of the relationships between entities (packages, plugins, scripts, etc.).
    </key-instruction>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> check and execute the correct CI scripts.
    </key-instruction>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> follow your Coding Guidelines.
    </key-instruction>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> follow your Testing Guidelines.
    </key-instruction>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> follow your Writing Guidelines.
    </key-instruction>
  </persona-guidelines>
  <packages>
    <package name="core">
      <description>
        High-performance reactive primitives using doubly-linked dependency graphs and topological execution. Implements a directed acyclic graph where signals are sources, computed values are transforms, and effects are sinks. Updates propagate through the graph in topological order with glitch-free guarantees (each node executes max once per update).
      </description>
      <api>
        <export>`signal()`: Writable reactive state containers</export>
        <export>`computed()`: Derived values that auto-update when dependencies change</export>
        <export>`effect()`: Side effects that run when dependencies change, return cleanup function</export>
        <export>`batch()`: Defer effect execution until batch completes</export>
        <export>`untracked()`: Read signals without creating dependencies</export>
        <export>`scope()`: Collect and batch-dispose multiple effects for lifecycle management</export>
      </api>
      <reference>packages/core/CLAUDE.md</reference>
    </package>
    <package name="dom">
      <description>
        Surgical DOM updates without virtual DOM diffing. Only elements with reactive dependencies update, not entire trees. Features automatic cleanup via MutationObserver (auto-disposes effects/events on node removal), global event delegation (single listener per type on document.body), and keyed list reconciliation using LIS algorithm for minimal moves.
      </description>
      <api>
        <export>`mount()`: Render HellaNode to DOM with reactive bindings</export>
        <export>`forEach()`: Keyed list reconciliation with LIS algorithm</export>
        <export>`$ref()`: Reactive reference to existing DOM with auto-watching for new elements</export>
        <export>`html```: Tagged template literal for HTML-like syntax with automatic AST caching</export>
      </api>
      <reference>packages/dom/CLAUDE.md</reference>
    </package>
    <package name="css">
      <description>
        Type-safe CSS-in-JS with runtime style generation, automatic memory management, and reactive CSS variables. Generates unique class names and injects styles into the DOM with reference counting for automatic cleanup. Supports reactive CSS custom properties that update when signals change.
      </description>
      <api>
        <export>`css()`: Create styles and return generated class name</export>
        <export>`cssVars()`: Create CSS custom properties with optional reactivity</export>
        <export>`cssRemove()`: Remove specific styles and decrement reference count</export>
        <export>`cssReset()`: Clear all CSS rules, caches, and reset system</export>
        <export>`cssVarsReset()`: Clear all CSS variables and reactive effects</export>
      </api>
      <reference>packages/css/CLAUDE.md</reference>
    </package>
    <package name="resource">
      <description>
        Reactive async data fetching with intelligent caching, request deduplication, and abort control. Provides cache-first fetching with TTL-based expiration, LRU eviction, and automatic deduplication of concurrent identical requests. Supports mutations with optimistic updates and fine-grained abort control.
      </description>
      <api>
        <export>`resource()`: Create reactive data fetching resource with cache and state management</export>
        <export>`resourceCache`: Global cache API for direct cache manipulation, batch operations, and config</export>
      </api>
      <reference>packages/resource/CLAUDE.md</reference>
    </package>
    <package name="router">
      <description>
        Reactive client-side routing with nested routes, lifecycle hooks, and automatic parameter inheritance. Provides declarative route configuration with strict resolution order (redirects → nested → flat → notFound). Features automatic parameter inheritance in nested routes, non-blocking error handling, and History API integration with popstate support.
      </description>
      <api>
        <export>`router()`: Initialize route map with hooks, redirects, and notFound handler</export>
        <export>`route()`: Reactive signal exposing current path, params, query, and handler</export>
        <export>`navigate()`: Programmatic navigation with parameter substitution and query strings</export>
      </api>
      <reference>packages/router/CLAUDE.md</reference>
    </package>
    <package name="store">
      <description>
        Deeply reactive state management through automatic conversion of plain objects into granular reactive primitives. Primitives become signals, nested objects recursively become stores, and arrays become signals. Supports flexible readonly controls at the property level with full TypeScript inference.
      </description>
      <api>
        <export>`store()`: Transform plain object into deeply reactive store with optional readonly properties</export>
      </api>
      <reference>packages/store/CLAUDE.md</reference>
    </package>
  </packages>
  <plugins>
    <plugin name="babel">
      <description>
        Babel transform plugin for HellaJS JSX and html`` tagged templates. Performs compile-time transformation of JSX syntax and HTML-like tagged templates into HellaNode object expressions. Provides intelligent attribute categorization (props, events, bindings, lifecycle hooks) and component detection.
      </description>
      <features>
        <feature>JSX element and fragment transformation to HellaNode objects</feature>
        <feature>html`` tagged template parsing with slot substitution</feature>
        <feature>Attribute prefix detection: `on:` (events), `bind:` (bindings), `at:` (lifecycle)</feature>
        <feature>Automatic component detection (uppercase tags → function calls)</feature>
        <feature>`style` tag auto-transform to `css()` calls</feature>
        <feature>Dynamic component support: `<${Component}>`</feature>
        <feature>Static child optimization (string concatenation)</feature>
      </features>
      <reference>plugins/babel/CLAUDE.md</reference>
    </plugin>
    <plugin name="rollup">
      <description>
        Rollup plugin for HellaJS JSX transformation. Wraps the Babel plugin with Rollup-specific hooks and preprocessing.
      </description>
      <reference>plugins/rollup/CLAUDE.md</reference>
    </plugin>
    <plugin name="vite">
      <description>
        Vite plugin for HellaJS JSX transformation. Wraps the Babel plugin with Vite-specific hooks and preprocessing.
      </description>
      <reference>plugins/vite/CLAUDE.md</reference>
    </plugin>
  </plugins>
  <folder-structure>
    <folder>.tmp - Your temporary files like markdown plans</folder>
    <folder>docs - Documentation website</folder>
    <folder>examples - Example applications</folder>
    <folder>packages
      <folder>core - Reactive primitives (signals, effects, computed)</folder>
      <folder>css - Headless UI behavior</folder>
      <folder>dom - DOM manipulation utilities</folder>
      <folder>resource - Data fetching and caching</folder>
      <folder>router - Client-side routing</folder>
      <folder>store - State management</folder>
    </folder>
    <folder>plugins
      <folder>babel - Babel JSX plugin</folder>
      <folder>rollup - Rollup JSX plugin</folder>
      <folder>vite - Vite JSX plugin</folder>
    </folder>
    <folder>scripts - Development and CI automation
      <folder>utils - Shared utilities</folder>
    </folder>
    <folder>changeset - Changeset configuration</folder>
    <folder>github
      <folder>hooks - Git hooks</folder>
      <folder>instructions - Package-specific instructions</folder>
      <folder>workflows - CI/CD workflows</folder>
    </folder>
  </folder-structure>
  <ci-scripts>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> use `bun` to run scripts, <emphasis>NEVER</emphasis> use `node` directly and very rarely `npm`.
    </key-instruction>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> run `bun check` after making changes tests, <emphasis>NEVER</emphasis> use `bun test` directly as check relies on bundling first.
    </key-instruction>
    <scripts>
      <script>Build packages - `bun bundle [package]` (no all flag)</script>
      <script>Test packages - `bun check [package]` (no all flag)</script>
      <script>Test coverage - `bun coverage`</script>
      <script>Clean dist cache - `bun clean`</script>
      <script>Versioning - `bun changeset`</script>
      <script>Release - `bun release`</script>
      <script>Sync LLM instructions - `bun sync`</script>
    </scripts>
  </ci-scripts>
  <code-guidelines>
    <key-instruction>
      You already have code guidelines established in your global instructions file. Follow them <emphasis>carefully</emphasis>.
    </key-instruction>
  </code-guidelines>
  <testing-guidelines>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> write real world integration styles tests.
    </key-instruction>
    <key-instruction>
      You <emphasis>NEVER</emphasis> over engineer tests that can be simple.
    </key-instruction>
    <key-instruction>
      You <emphasis>NEVER</emphasis> try to import non public API functions.
    </key-instruction>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> aim for 100% coverage.
    </key-instruction>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> assume happydom environment without the need for happydom imports.
    </key-instruction>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> assume core package functions are available globally when testing.
    </key-instruction>
  </testing-guidelines>
  <writing-guidelines>
    <key-instruction>
      You already have writing guidelines established in your global instructions file. Follow them <emphasis>carefully</emphasis>.
    </key-instruction>
  </writing-guidelines>
</hellajs-instructions>
