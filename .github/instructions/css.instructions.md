---
applyTo: "packages/css/**"
---

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
      <component name="sheet.ts">CSSOM helper for surgical per-scope rule updates in style elements</component>
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
        <step>hashKey(obj, options) creates deterministic cache key from stringify(obj):scoped:name:global</step>
        <step>Return cached className if exists in inlineCache</step>
        <step>Assign class name: custom name, or base36 counter (c1, c2, c1a…)</step>
        <step>Build selector: .className, scoped .className, or empty for global</step>
        <step>process() traverses object, builds CSS string</step>
        <step>Increment refCount for key, store text in cssRulesMap</step>
        <step>Update style element textContent</step>
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
    <behavior>Reference counting tracks keys not class names — multiple css() calls with same object increment the same ref</behavior>
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

## Architecture Overview

### Mental Model

The system provides **runtime CSS generation** without build-time processing:
- **css()**: Generates class names and injects styles into `<style id="hella-css">`
- **cssVars()**: Creates CSS custom properties with reactive support in `<style id="hella-vars">`
- **Memory Management**: Reference counting prevents premature removal, automatic cleanup on zero refs
- **Caching**: Inline memoization prevents duplicate generation, hash-based cache for vars

### Key Components

- **css.ts**: Style generation, class name creation, reference counting, DOM injection
- **vars.ts**: CSS variable flattening, scoping, prefixing, static/reactive path routing
- **sheet.ts**: CSSOM helper for surgical per-scope rule updates in `<style>` elements
- **reactive.ts**: Effect wrapper for reactive dependencies, cleanup tracking
- **shared.ts**: Deterministic stringify for hashing and cache keys
- **types.ts**: TypeScript definitions using csstype for full CSS property support

## Key Data Structures

**Reference Counting Maps** (css.ts)
```typescript
refCounts: Map<string, number>        // Track usage count per style rule
inlineCache: Map<string, string>      // Memoize hashKey → className
cssRulesMap: Map<string, string>      // Store key → CSS text for injection
```

**CSS Variables Maps** (vars.ts)
```typescript
scopedVarsRulesMap: Map<string, Map<string, string>>  // scope → (varName → value)
cache: Map<string, {flattened, result}>               // Hash → processed vars
activeEffects: Set<() => void>                        // Effect cleanup functions
```

**Variable Flattening**
- Input: `{colors: {primary: 'red'}}`
- Flattened: `{'colors.primary': 'red'}`
- CSS output: `--colors-primary: red`
- Returned: `{colors: {primary: 'var(--colors-primary)'}}`

## Key Algorithms

### css() Processing Flow

1. **Hash Key**: `hashKey(obj, options)` creates deterministic cache key from `stringify(obj):scoped:name:global`
2. **Cache Check**: Return cached className if exists
3. **Class Name**: Custom name, or base36 counter (c1, c2, c1a...)
4. **Selector Build**: `.className` or `scoped .className` or empty for global
5. **CSS Generation**: process() traverses object, builds CSS string
6. **Reference Counting**: Increment refCount for key, store in cssRulesMap
7. **DOM Injection**: Update `<style id="hella-css">` textContent

### process() CSS Traversal

**Strategy**: While loop through object keys, build properties and nested rules

**Special Handling**:
- **Null/undefined**: Skip property entirely
- **Objects**: Recurse to build nested selectors or at-rules
- **Arrays**: Join with commas for multi-value properties
- **camelCase**: Convert to kebab-case (fontSize → font-size)
- **Custom properties**: Preserve as-is (--custom-var stays --custom-var)
- **content property**: Auto-quote unquoted strings
- **& selector**: Replace with parent selector
- **@ rules**: Process content with empty selector to avoid nesting

### cssVars() Dual Path

**Static Detection**: hasNestedFunctions() recursively checks for function values

**Static Path** (no functions):
1. Hash input with options
2. Check cache, return if hit
3. Flatten nested object (dots for nesting)
4. Apply rules to DOM
5. Build result with var() references
6. Cache result (max 100 entries, clear on overflow)

**Reactive Path** (has functions):
1. Run body synchronously: deepTrackVars() traverses and calls functions, builds result
2. Create varsEffect() wrapping the same body for reactive updates
3. Functions establish reactive dependencies
4. Apply rules to DOM via CSSOM
5. Return populated result immediately (no flush needed)
6. Effect re-runs when dependencies change

### deepTrackVars() Dependency Tracking

**Purpose**: Traverse object tree calling functions to establish reactive dependencies

**Strategy**: Recursive traversal with while loop, call functions during effect execution
- Functions return values are captured
- Signals accessed during function calls create dependencies
- Effect re-runs when any signal changes
- Flattens nested structure during traversal

### Variable Scoping System

**Scope Management**: scopedVarsRulesMap is `Map<scope, Map<varName, value>>`

**Update Strategy**:
- Get or create Map for scope selector
- Merge new variables into scope's Map
- Upsert single rule via CSSOM `insertRule()` for the changed scope only
- Sync textContent from data for DevTools/test readability
- Multiple cssVars() calls to same scope accumulate

**Generated CSS**: `:root{--var1: val1;}` or `.scoped{--var1: val1;}`

## Performance Patterns

### Hot Path Optimizations

1. **Inline caching**: Hash-based memoization for duplicate css() calls
2. **Reference counting**: Track usage, only inject once, remove on zero
3. **Static detection**: Fast path for cssVars without reactive deps
4. **Cache limits**: cssVars cache clears at 100 entries to prevent bloat
5. **Deterministic hashing**: Sorted keys in stringify() ensure cache hits
6. **While loops**: Prefer `while (i < len)` with cached length over for...of
7. **Base36 encoding**: Short class names via counter.toString(36)

### Memory Management

- **Reference counting**: css() increments refs, cssRemove() decrements, DOM cleanup at zero
- **Effect tracking**: activeEffects Set stores all cssVars() cleanups for bulk disposal
- **Cache eviction**: cssVars() cache clears when exceeding 100 entries
- **DOM separation**: Separate style elements (hella-css, hella-vars) for independent cleanup
- **Inline cache cleanup**: cssRemove() clears inline cache entries

## Non-Obvious Behaviors

- **Class name generation**: Uses base36 encoding of counter, produces c1, c2...c1a, c2b
- **Global styles return empty string**: No class needed, css() returns '' when global: true
- **Reference counting tracks keys not class names**: Multiple css() calls with same object increment same ref
- **content property auto-quotes**: Unquoted strings get wrapped in quotes, quoted strings preserved
- **Null/undefined ignored**: Properties with null/undefined values completely omitted from CSS
- **Arrays join with commas**: Array values become comma-separated (for fonts, transforms, etc)
- **@ rules avoid selector nesting**: Media queries process with empty selector, then wrap
- **Dots become hyphens in vars**: colors.primary → --colors-primary in CSS
- **Multiple scopes coexist**: scopedVarsRulesMap allows independent variable sets per selector
- **Reactive vars don't cache**: Only static vars use hash cache, reactive creates new effect each time
- **Effect cleanup on reset**: cssVarsReset() walks activeEffects Set calling all cleanups
- **Prefix applied before flattening**: prefix + key + dots-to-hyphens → --prefix-key-nested
- **Scoped option differs between functions**: css() prefixes selector, cssVars() wraps in scope block
- **Style elements created lazily**: Only appended to head on first css()/cssVars() call
- **Cache size limit 100**: Prevents unbounded growth, clears entire cache on overflow
- **stringify sorts keys**: Ensures {a:1, b:2} and {b:2, a:1} produce same hash
- **cssRemove uses hash-based lookup**: O(1) via `hashKey()`, not O(n) substring matching
- **Reactive path runs synchronously first**: `cssVars()` calls `run()` before creating effect, so result is populated immediately
- **deepTrackVars flattens during tracking**: Combines function calling with object flattening in one pass
- **Style counter resets on cssReset**: Fresh c1, c2 names after reset, useful for testing
