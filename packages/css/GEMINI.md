<css-package-instructions>
  <overview>
    Type-safe CSS-in-JS with runtime style generation, automatic memory management, and reactive CSS variables. Generates unique class names and injects styles into the DOM with reference counting for automatic cleanup. Supports reactive CSS custom properties that update when signals change.
  </overview>
  <mental-model>
    <concept>Two separate style elements: hella-css for rules, hella-vars for custom properties</concept>
    <concept>css() generates scoped class names and injects CSS text — memory managed via reference counting</concept>
    <concept>cssVars() flattens nested objects into --var-name declarations and returns a matching var() proxy</concept>
    <concept>Static and reactive paths are distinct: reactive vars create effects, static vars use a hash cache</concept>
    <concept>Variable scoping is accumulated per selector — multiple cssVars() calls to the same scope merge</concept>
  </mental-model>
  <architecture>
    <key-components>
      <component name="css.ts">Style generation, class name creation, reference counting, DOM injection</component>
      <component name="vars.ts">CSS variable flattening, scoping, prefixing, static/reactive path routing</component>
      <component name="sheet.ts">CSSOM helper for upsert and reset of per-scope rules</component>
      <component name="reactive.ts">Effect wrapper for reactive dependencies, cleanup tracking</component>
      <component name="shared.ts">Deterministic stringify for hashing and cache keys</component>
      <component name="types.d.ts">TypeScript definitions using csstype for full CSS property support</component>
    </key-components>
    <data-structures>
      <structure name="Reference Counting Maps (css.ts)">
        <field name="refCounts">Map&lt;string, number&gt; — usage count per style rule</field>
        <field name="inlineCache">Map&lt;string, string&gt; — memoize hashKey → className</field>
        <field name="cssRulesMap">Map&lt;string, string&gt; — key → CSS text for injection</field>
      </structure>
      <structure name="CSS Variables Maps (vars.ts)">
        <field name="scopedVarsRulesMap">Map&lt;scope, Map&lt;varName, value&gt;&gt; — per-scope variable state</field>
        <field name="cache">Map&lt;string, {flattened, result}&gt; — hash → processed static vars</field>
        <field name="activeEffects">Set&lt;() =&gt; void&gt; — effect cleanup functions for bulk disposal</field>
      </structure>
      <structure name="Variable Flattening">
        <field name="input">{colors: {primary: 'red'}}</field>
        <field name="flattened">{'colors.primary': 'red'}</field>
        <field name="css-output">--colors-primary: red</field>
        <field name="returned">{colors: {primary: 'var(--colors-primary)'}}</field>
      </structure>
    </data-structures>
    <key-algorithms>
      <algorithm name="css() Processing Flow">
        <step>hashKey(obj, options) creates deterministic cache key from stringify(obj):scoped:selector:global</step>
        <step>Cache hit: increment refCount, return cached selector/className</step>
        <step>Cache miss: assign selector — custom selector option, or base36 counter (c1, c2, c1a…)</step>
        <step>Build selector: custom selector as-is, .className, scoped selector, or empty for global</step>
        <step>process() traverses object, builds CSS string</step>
        <step>Set refCount to 1, store text in cssRulesMap, update style element textContent</step>
        <step>Cache result in inlineCache</step>
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
        <step>hasNestedFunctions() recursively checks for function values to decide path</step>
        <step>Static path: hash input, check cache, flattenVars(), applyRules(), buildResult(), cache result</step>
        <step>Reactive path: run body synchronously (deepTrackVars() calls functions), create varsEffect() for re-runs</step>
        <step>Return populated result immediately in both paths</step>
      </algorithm>
      <algorithm name="Variable Scoping System">
        <step>scopedVarsRulesMap is Map&lt;scope, Map&lt;varName, value&gt;&gt;</step>
        <step>Get or create Map for scope selector, merge new variables in</step>
        <step>Upsert single rule via CSSOM insertRule() for the changed scope only</step>
        <step>Sync textContent from data for DevTools/test readability</step>
      </algorithm>
    </key-algorithms>
  </architecture>
  <performance>
    <optimization name="inline-caching">Hash-based memoization for duplicate css() calls — O(1) lookup</optimization>
    <optimization name="reference-counting">Track usage, only inject once, remove CSS from DOM at zero refs</optimization>
    <optimization name="static-detection">Fast path for cssVars without reactive deps skips effect creation</optimization>
    <optimization name="cache-limits">cssVars cache clears at 100 entries to prevent unbounded growth</optimization>
    <optimization name="deterministic-hashing">stringify() sorts keys so {a:1,b:2} and {b:2,a:1} share a cache entry</optimization>
    <optimization name="while-loops">while (i &lt; len) with cached length throughout hot paths</optimization>
    <optimization name="base36-encoding">Short class names via counter.toString(36): c1, c2...c1a</optimization>
    <memory-management>
      <item>Reference counting: css() increments, cssRemove() decrements, DOM cleanup at zero</item>
      <item>Effect tracking: activeEffects Set stores all cssVars() cleanups for bulk disposal</item>
      <item>Cache eviction: cssVars() cache clears when exceeding 100 entries</item>
      <item>DOM separation: separate style elements (hella-css, hella-vars) for independent cleanup</item>
    </memory-management>
  </performance>
  <non-obvious-behaviors>
    <behavior>Global styles return empty string — css() returns '' when global: true, no class needed</behavior>
    <behavior>Reference counting tracks usage — each css() call increments refCount (even cache hits), cssRemove() decrements, DOM cleanup at zero</behavior>
    <behavior>inlineCache cleared only at ref zero — cssRemove() at count &gt; 1 only decrements, preserves cache entry</behavior>
    <behavior>content property auto-quotes — unquoted strings get wrapped in quotes, already-quoted strings preserved</behavior>
    <behavior>Null/undefined ignored — properties with null/undefined values completely omitted from CSS</behavior>
    <behavior>Arrays join with commas — array values become comma-separated (for fonts, transforms, etc.)</behavior>
    <behavior>@ rules avoid selector nesting — media queries process with empty selector, then wrap in @block</behavior>
    <behavior>Dots become hyphens in vars — colors.primary → --colors-primary in CSS output</behavior>
    <behavior>Multiple scopes coexist — scopedVarsRulesMap allows independent variable sets per selector</behavior>
    <behavior>Reactive vars don't cache — only static vars use the hash cache, reactive creates a new effect each time</behavior>
    <behavior>Reactive path runs synchronously first — cssVars() calls run() before creating effect, result is populated immediately</behavior>
    <behavior>Scoped option differs between functions — css() prefixes selector, cssVars() wraps in scope block</behavior>
    <behavior>Style elements created lazily — only appended to head on first css()/cssVars() call</behavior>
    <behavior>Style counter resets on cssReset — fresh c1, c2 names after reset, useful for predictable test assertions</behavior>
    <behavior>cssVarsReset clears textContent only — the hella-vars element stays in DOM with empty content</behavior>
  </non-obvious-behaviors>
  <testing-approach>
    <principle>Test real-world integration patterns using mount() to verify rendered output</principle>
    <principle>Use cssReset() and cssVarsReset() in beforeEach to ensure a clean counter and empty DOM</principle>
    <principle>Verify CSS text content directly via document.getElementById('hella-css')?.textContent</principle>
    <principle>Test both static and reactive cssVars paths, including batch() updates</principle>
    <principle>Cover all scoping variants: class, ID, attribute, pseudo, descendant, child combinator</principle>
    <principle>Test reference counting: multi-use styles should persist until last cssRemove()</principle>
    <principle>Verify reset functions fully clear both DOM content and reactive effects</principle>
  </testing-approach>
</css-package-instructions>
