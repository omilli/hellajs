---
applyTo: "**"
---

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
        High-performance reactive primitives using doubly-linked dependency graphs and depth-first propagation. Implements a directed acyclic graph where signals are sources, computed values are transforms, and effects are sinks. Updates propagate through the graph in depth-first order with glitch-free guarantees (each node executes max once per update).
      </description>
      <reference>packages/core</reference>
    </package>
    <package name="dom">
      <description>
        Surgical DOM updates without virtual DOM diffing. Only elements with reactive dependencies update, not entire trees. Features automatic cleanup via MutationObserver (auto-disposes effects/events on node removal), global event delegation (single listener per type on document.body), and keyed list reconciliation using LIS algorithm for minimal moves.
      </description>
      <reference>packages/dom</reference>
    </package>
    <package name="css">
      <description>
        Type-safe CSS-in-JS with runtime style generation, automatic memory management, and reactive CSS variables. Generates unique class names and injects styles into the DOM with reference counting for automatic cleanup. Supports reactive CSS custom properties that update when signals change.
      </description>
      <reference>packages/css</reference>
    </package>
    <package name="resource">
      <description>
        Reactive async data fetching with intelligent caching, request deduplication, and abort control. Provides cache-first fetching with TTL-based expiration, LRU eviction, and automatic deduplication of concurrent identical requests. Supports mutations with optimistic updates and fine-grained abort control.
      </description>
      <reference>packages/resource</reference>
    </package>
    <package name="router">
      <description>
        Reactive client-side routing with nested routes, lifecycle hooks, and automatic parameter inheritance. Provides declarative route configuration with strict resolution order (redirects → nested → flat → notFound). Features automatic parameter inheritance in nested routes, non-blocking error handling, and History API integration with popstate support.
      </description>
      <reference>packages/router</reference>
    </package>
    <package name="store">
      <description>
        Deeply reactive state management through automatic conversion of plain objects into granular reactive primitives. Primitives become signals, nested objects recursively become stores, and arrays become signals. Supports flexible readonly controls at the property level with full TypeScript inference.
      </description>
      <reference>packages/store</reference>
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
        <feature>Attribute prefix detection: `on:` (events), `bind:` (bindings), `hook:` (lifecycle), `e:` (direct events), `error:` (error config)</feature>
        <feature>Automatic component detection (uppercase tags → function calls)</feature>
        <feature>`style` tag auto-transform to `css()` calls</feature>
        <feature>Dynamic component support: `<${Component}>`</feature>
        <feature>Static child optimization (string concatenation)</feature>
      </features>
      <reference>plugins/babel</reference>
    </plugin>
    <plugin name="rollup">
      <description>
        Rollup plugin for HellaJS JSX transformation. Wraps the Babel plugin with Rollup-specific hooks and preprocessing.
      </description>
      <reference>plugins/rollup</reference>
    </plugin>
    <plugin name="vite">
      <description>
        Vite plugin for HellaJS JSX transformation. Wraps the Babel plugin with Vite-specific hooks and preprocessing.
      </description>
      <reference>plugins/vite</reference>
    </plugin>
  </plugins>
  <folder-structure>
    <folder>.tmp - Your temporary files like markdown plans</folder>
    <folder>docs - Documentation website</folder>
    <folder>examples - Example applications</folder>
    <folder>guides - Read these guides before contributing</folder>
    <folder>packages
      <folder>core - Reactive primitives (signals, effects, computed)</folder>
      <folder>css - CSS-in-JS styling</folder>
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
    <folder>.changeset - Changeset configuration</folder>
    <folder>.github
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
      <script>Format code - `bun format`</script>
      <script>Sync LLM instructions - `bun sync`</script>
    </scripts>
  </ci-scripts>
  <style-guides>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> read the relevant style guide from <emphasis>guides/</emphasis> before writing or editing any of the following:
    </key-instruction>
    <guide>
      <trigger>Source code, types, JSDoc, package structure, imports, CLAUDE.md files, package.json</trigger>
      <file>guides/package-code-style.md</file>
    </guide>
    <guide>
      <trigger>Tests, test helpers, mocks, assertions, test structure</trigger>
      <file>guides/package-tests-style.md</file>
    </guide>
    <guide>
      <trigger>Reference docs (.mdx), examples, cross-references, documentation website content</trigger>
      <file>guides/package-docs-style.md</file>
    </guide>
  </style-guides>
  <code-guidelines>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> read <emphasis>guides/package-code-style.md</emphasis> before writing or editing source code.
    </key-instruction>
    <key-instruction>
      You already have code guidelines established in your global instructions file. Follow them <emphasis>carefully</emphasis>.
    </key-instruction>
  </code-guidelines>
  <testing-guidelines>
    <key-instruction>
      You <emphasis>ALWAYS</emphasis> read <emphasis>guides/package-tests-style.md</emphasis> before writing or editing tests.
    </key-instruction>
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
      You <emphasis>ALWAYS</emphasis> read <emphasis>guides/package-docs-style.md</emphasis> before writing or editing documentation.
    </key-instruction>
    <key-instruction>
      You already have writing guidelines established in your global instructions file. Follow them <emphasis>carefully</emphasis>.
    </key-instruction>
  </writing-guidelines>
</hellajs-instructions>
