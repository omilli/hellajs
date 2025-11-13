# CSS Package

Type-safe CSS-in-JS with runtime style generation, automatic memory management, and reactive CSS variables.

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

1. **Hash Generation**: `stringify(obj) + options` creates cache key
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
1. Create varsEffect() wrapping core effect()
2. Inside effect: deepTrackVars() traverses and calls functions
3. Functions establish reactive dependencies
4. Apply rules to DOM
5. Build result object
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
- Regenerate entire style element from all scopes
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
- **cssRemove matches by stringify**: Finds keys containing stringified object, checks global flag match
- **Reactive path always creates effect**: Even single function value triggers reactive system
- **deepTrackVars flattens during tracking**: Combines function calling with object flattening in one pass
- **Style counter resets on cssReset**: Fresh c1, c2 names after reset, useful for testing
