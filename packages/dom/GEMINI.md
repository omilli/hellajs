<important-instructions>
  <key-information>
    <ol>
      <li>Understand the reactive rendering system and DOM update cycles</li>
      <li>Preserve memory management and automatic cleanup patterns</li>
      <li>Maintain performance characteristics of list diffing algorithms</li>
      <li>Keep event delegation system efficient and type-safe</li>
    </ol>
  </key-information>
  <architecture>
    <reactive-dom-system>
      <ul>
        <li><code>mount()</code> - Component mounting with reactive property binding</li>
        <li><code>forEach()</code> - Efficient list rendering with key-based diffing</li>
        <li><code>setNodeHandler()</code> - Global event delegation system</li>
        <li><code>addRegistryEffect()</code> - Automatic cleanup with lifecycle management</li>
        <li><code>renderNode()</code> - VNode to DOM transformation pipeline</li>
        <li><code>resolveValue()</code> - Reactive value resolution with signal tracking</li>
      </ul>
    </reactive-dom-system>
    <core-concepts>
      <ul>
        <li><strong>VNode Pipeline</strong> - JSX to DOM transformation with reactive bindings</li>
        <li><strong>List Diffing</strong> - LIS algorithm for minimal DOM operations</li>
        <li><strong>Event Delegation</strong> - Single global listener per event type</li>
        <li><strong>Memory Management</strong> - MutationObserver-based cleanup system</li>
        <li><strong>Reactive Properties</strong> - Signal-based property updates</li>
      </ul>
    </core-concepts>
    <file-structure>
      <ul>
        <li><code>index.ts</code> - Public API exports and JSX global declarations</li>
        <li><code>core.ts</code> - Re-exports from @hellajs/core</li>
        <li><code>mount.ts</code> - Component mounting system with reactive rendering</li>
        <li><code>forEach.ts</code> - List rendering with key-based diffing and LIS optimization</li>
        <li><code>events.ts</code> - Global event delegation system</li>
        <li><code>cleanup.ts</code> - Automatic cleanup with MutationObserver</li>
        <li><code>utils.ts</code> - DOM utility functions and type guards</li>
        <li><code>types/</code> - TypeScript definitions for VNodes and attributes</li>
      </ul>
    </file-structure>
  </architecture>

  <api-patterns>
    <mount-usage>
      <code-example>
        <pre>
// Basic component mounting
mount(() => h('div', { class: 'app' }, 'Hello World'));

// Reactive content with signals
const count = signal(0);
mount(() => 
  h('button', 
    { onClick: () => count(count() + 1) }, 
    () => `Count: ${count()}`
  )
);
        </pre>
      </code-example>
    </mount-usage>
    <foreach-usage>
      <code-example>
        <pre>
// List rendering with keys for optimal diffing
const items = signal([{ id: 1, text: 'Item 1' }]);
mount(() =>
  h('ul', {},
    forEach(items, (item) =>
      h('li', { key: item.id }, item.text)
    )
  )
);
        </pre>
      </code-example>
    </foreach-usage>
    <event-usage>
      <code-example>
        <pre>
// Event delegation with automatic cleanup
h('button', {
  onClick: (e) => console.log('Clicked'),
  onMouseOver: (e) => console.log('Hovered')
}, 'Click me');
        </pre>
      </code-example>
    </event-usage>
  </api-patterns>

  <performance-characteristics>
      <ul>
        <li>Key-based diffing with O(1) node lookup for list rendering</li>
        <li>LIS algorithm minimizes DOM operations during reordering</li>
        <li>Global event delegation reduces memory footprint</li>
        <li>MutationObserver enables automatic cleanup without manual tracking</li>
        <li>Reactive property binding prevents unnecessary DOM updates</li>
      </ul>
  </performance-characteristics>
  <internal-systems>
    <list-diffing>
      <ul>
        <li><code>keyToNode Map</code> - O(1) node lookup by key</li>
        <li><code>LIS algorithm</code> - Minimal DOM moves calculation</li>
        <li><code>Three-phase diffing</code> - Reuse, remove, reorder optimization</li>
        <li><code>Complete replacement</code> - Fallback when no keys match</li>
      </ul>
    </list-diffing>
    <memory-management>
      <ul>
        <li><code>nodeRegistry</code> - Element-specific effect and event tracking</li>
        <li><code>MutationObserver</code> - DOM removal detection</li>
        <li><code>cleanNodeRegistry</code> - Recursive cleanup for removed elements</li>
        <li><code>addRegistryEffect/Event</code> - Lifecycle-bound resource tracking</li>
      </ul>
    </memory-management>
  </internal-systems>

  <key-principles>
    <design-principles>
      <ul>
        <li><strong>Reactive First</strong> - Automatic DOM updates from signal changes</li>
        <li><strong>Memory Safe</strong> - MutationObserver-based cleanup prevents leaks</li>
        <li><strong>Performance Optimized</strong> - LIS diffing and event delegation</li>
        <li><strong>Type Safe</strong> - Full TypeScript support with JSX integration</li>
        <li><strong>Developer Friendly</strong> - Minimal API with powerful primitives</li>
      </ul>
    </design-principles>
  </key-principles>
</important-instructions>

