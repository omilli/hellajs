<css-package-instructions>
  <overview>
    Type-safe CSS-in-JS with runtime style generation, automatic memory management, and reactive CSS variables. Global by default. `name` option creates scoped class selectors and returns the name for use in `class` attributes.
  </overview>
  <mental-model>
    <concept>Two separate style elements: hella-css for rules, hella-vars for custom properties</concept>
    <concept>css() is global by default — no class name, no selector wrapping, returns empty string</concept>
    <concept>css({...}, { name: 'x' }) creates .x selector and returns 'x' for class attributes</concept>
    <concept>cssVars() flattens nested objects into --var-name declarations and returns a matching var() proxy</concept>
    <concept>Static and reactive paths are distinct: reactive vars create effects, static vars use a hash cache</concept>
    <concept>Variable scoping is accumulated per selector — multiple cssVars() calls to the same scope merge</concept>
  </mental-model>
  <architecture>
    <key-components>
      <component name="css.ts">Style generation, reference counting, DOM injection (guarded by hasDocument for SSR). Global default, name for scoped</component>
      <component name="vars.ts">CSS variable flattening, scoping, prefixing, static/reactive path routing (DOM writes guarded by hasDocument)</component>
      <component name="sheet.ts">CSSOM helper for upsert and reset of per-scope rules (all DOM access guarded by hasDocument)</component>
      <component name="reactive.ts">Effect wrapper for reactive dependencies, cleanup tracking</component>
      <component name="shared.ts">Deterministic stringify for hashing and cache keys</component>
      <component name="types.d.ts">TypeScript definitions using csstype for full CSS property support</component>
    </key-components>
    <data-structures>
      <structure name="Reference Counting Maps (css.ts)">
        <field name="refCounts">Map&lt;string, number&gt; — usage count per style rule</field>
        <field name="inlineCache">Map&lt;string, string&gt; — memoize hashKey → result string</field>
        <field name="cssRulesMap">Map&lt;string, string&gt; — key → CSS text for injection</field>
      </structure>
      <structure name="CSS Variables Maps (vars.ts)">
        <field name="scopedVarsRulesMap">Map&lt;scope, Map&lt;varName, value&gt;&gt; — per-scope variable state</field>
        <field name="cache">Map&lt;string, {flattened, result}&gt; — hash → processed static vars</field>
        <field name="activeEffects">Set&lt;() =&gt; void&gt; — effect cleanup functions for bulk disposal</field>
        <field name="varsRegistryStatic">Map&lt;string, VarsEntry&gt; — per-call registry for static var sets (keyed by hash). Each entry tracks flatKeys, scope, prefix, refCount</field>
        <field name="varsRegistryReactive">WeakMap&lt;object, VarsEntry&gt; — per-call registry for reactive var sets (keyed by vars object reference). Each entry tracks flatKeys, scope, prefix, refCount, cleanup (effect disposer)</field>
        <field name="varsResultReactive">WeakMap&lt;object, CSSVars&gt; — cached result objects for reactive var sets, returned on repeated cssVars calls with the same vars reference</field>
      </structure>
    </data-structures>
    <key-algorithms>
      <algorithm name="css() Processing Flow">
        <step>hashKey(obj, options) creates deterministic cache key from stringify(obj):name</step>
        <step>Cache hit: increment refCount, return cached result</step>
        <step>Cache miss: if name provided, build .{name} selector; otherwise process as global</step>
        <step>process() traverses object, builds CSS string</step>
        <step>Set refCount to 1, store text in cssRulesMap, update style element textContent</step>
        <step>Cache result in inlineCache (name or empty string)</step>
      </algorithm>
      <algorithm name="process() CSS Traversal">
        <step>While loop through object keys, accumulate properties and nested rules</step>
        <step>Null/undefined: skip entirely</step>
        <step>Objects: recurse to build nested selectors or at-rules</step>
        <step>Arrays: join with commas for multi-value properties</step>
        <step>camelCase: convert to kebab-case (fontSize → font-size)</step>
        <step>Custom properties: preserve as-is (--custom-var)</step>
        <step>content property: auto-quote unquoted strings</step>
        <step>& selector: replace with parent selector</step>
        <step>@ rules: process content with empty selector to avoid nesting</step>
      </algorithm>
      <algorithm name="cssVars() Dual Path">
        <step>Single flatten pass returns { flat, hasFns }; the flag routes the path</step>
        <step>Static path: hash input, check cache, applyRules(), buildResult(), cache result</step>
        <step>Reactive path: first flat already resolved functions; applyRules + buildResult, then create varsEffect() for re-runs that re-call the single flattener</step>
        <step>Return populated result immediately in both paths</step>
      </algorithm>
    </key-algorithms>
  </architecture>
  <performance>
    <optimization name="inline-caching">Hash-based memoization for duplicate css() calls — O(1) lookup</optimization>
    <optimization name="reference-counting">Track usage, only inject once, remove CSS from DOM at zero refs</optimization>
    <optimization name="static-detection">Fast path for cssVars without reactive deps skips effect creation</optimization>
    <optimization name="cache-lru">cssVars cache LRU eviction at 100 entries (only the least-recently-used entry is discarded)</optimization>
    <optimization name="deterministic-hashing">stringify() sorts keys so {a:1,b:2} and {b:2,a:1} share a cache entry</optimization>
    <optimization name="while-loops">while (i &lt; len) with cached length throughout hot paths</optimization>
    <memory-management>
      <item>Reference counting: css() increments, cssRemove() decrements, DOM cleanup at zero</item>
      <item>Effect tracking: activeEffects Set stores all cssVars() cleanups for bulk disposal</item>
      <item>Cache eviction: cssVars() cache LRU eviction at 100 entries (only the least-recently-used entry is discarded)</item>
      <item>DOM separation: separate style elements (hella-css, hella-vars) for independent cleanup</item>
    </memory-management>
  </performance>
  <non-obvious-behaviors>
    <behavior>Global by default — css() returns empty string and injects styles without a class selector</behavior>
    <behavior>name option creates scoped class — css({...}, { name: 'card' }) creates .card selector and returns 'card'</behavior>
    <behavior>Reference counting tracks usage — each css() call increments refCount (even cache hits), cssRemove() decrements, DOM cleanup at zero</behavior>
    <behavior>inlineCache cleared only at ref zero — cssRemove() at count &gt; 1 only decrements, preserves cache entry</behavior>
    <behavior>content property auto-quotes — unquoted strings get wrapped in quotes, already-quoted strings preserved</behavior>
    <behavior>Null/undefined ignored — properties with null/undefined values completely omitted from CSS</behavior>
    <behavior>Arrays join with commas — array values become comma-separated (for fonts, transforms, etc.)</behavior>
    <behavior>@ rules avoid selector nesting — media queries process with empty selector, then wrap in @block</behavior>
    <behavior>Dots become hyphens in vars — colors.primary → --colors-primary in CSS output</behavior>
    <behavior>Reactive vars don't cache — only static vars use the hash cache, reactive creates a new effect each time</behavior>
    <behavior>Reactive path runs synchronously first — cssVars() calls run() before creating effect, result is populated immediately</behavior>
    <behavior>Style elements created lazily — only appended to head on first css()/cssVars() call</behavior>
    <behavior>cssVarsReset clears textContent only — the hella-vars element stays in DOM with empty content</behavior>
    <behavior>cssVarsRemove decrements per-call ref counts; vars persist until the last reference is removed</behavior>
    <behavior>Reactive removal disposes the effect — updating a signal afterward no longer mutates the stylesheet</behavior>
    <behavior>cssVarsRemove is a no-op for unknown inputs (not previously registered by cssVars)</behavior>
    <behavior>cssVarsReset also clears the per-call registries (varsRegistryStatic, varsRegistryReactive, varsResultReactive)</behavior>
    <behavior>css()/cssVars() no-op DOM injection when document is undefined (SSR-safe via hasDocument guard); in-memory state still updates</behavior>
  </non-obvious-behaviors>
  <testing-approach>
    <principle>Test real-world integration patterns using mount() to verify rendered output</principle>
    <principle>Use cssReset() and cssVarsReset() in beforeEach to ensure clean DOM state</principle>
    <principle>Verify CSS text content directly via document.getElementById('hella-css')?.textContent</principle>
    <principle>Test both global (no name) and scoped (with name) css() paths</principle>
    <principle>Test both static and reactive cssVars paths, including batch() updates</principle>
    <principle>Test reference counting: multi-use styles should persist until last cssRemove()</principle>
    <principle>Verify reset functions fully clear both DOM content and reactive effects</principle>
    <principle>Test cssVarsRemove reference counting: multi-use vars should persist until last cssVarsRemove()</principle>
    <principle>Test cssVarsRemove with reactive vars: verify effect disposal and scope cleanup</principle>
  </testing-approach>
</css-package-instructions>
