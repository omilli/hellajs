---
applyTo: "{packages/css/**,tests/css/**}"
---

# @hellajs/css Instructions

Follow these instructions when working on the CSS-in-JS package. @hellajs/css provides type-safe, reactive CSS-in-JS with automatic memory management and performance optimization.

## Quick Reference

### Key Files
- `lib/css.ts` - Main CSS function with caching and reference counting
- `lib/vars.ts` - CSS variables system with nested object flattening
- `lib/shared.ts` - Shared state management and utilities
- `lib/types.ts` - TypeScript definitions for CSS objects and options
- `lib/index.ts` - Public API exports

## Architecture

### Core Design Principles
1. **Memory Efficiency**: Reference-counted automatic cleanup
2. **Performance**: Dual-layer caching with batched DOM updates
3. **Type Safety**: Full TypeScript support with csstype integration
4. **Reactive Integration**: Seamless signal-based style updates
5. **Developer Experience**: Simple API with powerful features

### CSS Function (`css`)
```typescript
function css(obj: CSSObject, options?: CSSOptions): string
```

**Features**:
- Generates unique class names (c1, c2, c3...) or accepts custom names
- Reference counting with automatic cleanup via `css.remove()`
- Content-based hashing for deduplication
- Support for scoped selectors and global styles
- Nested CSS objects with pseudo-selectors, media queries

**Options**:
- `name?: string` - Custom class name
- `global?: boolean` - Apply globally (returns empty string)
- `scoped?: string` - Scope under parent selector

### CSS Variables (`cssVars`)
```typescript
function cssVars(vars: Record<string, any>): Record<string, string>
```

**Features**:
- Flattens nested objects to CSS custom properties
- Dot-notation conversion (`colors.primary` → `--colors-primary`)
- Returns object with `var()` references
- Automatic DOM injection and cleanup
- Caching with hash-based deduplication

### State Management System
Located in `shared.ts`:
- `globalState` - DOM elements and counters
- `cache` - Cross-call deduplication cache
- `refCounts` - Reference counting for cleanup
- `cssRules` / `varsRules` - Rule storage maps
- `createStyleManager` - Batched DOM update system

### Reactive Integration
Seamless integration with `@hellajs/core` signals:
```typescript
import { signal, effect } from '@hellajs/core';
import { css } from '@hellajs/css';

const color = signal('blue');
effect(() => {
  const style = css({ color: color() });
  // Style updates automatically when signal changes
});
```

## Implementation Details

### Reference Counting System
```typescript
// css.ts:175-190
const key = stringify({ obj, selector, global });
if (cache.has(key)) {
  refCounts.set(key, (refCounts.get(key) || 0) + 1);
  return cache.get(key)!;
}
// ... create new rule
refCounts.set(key, 1);
```

**Cleanup Process**:
- Each CSS rule maintains reference count
- `css.remove()` decrements count
- DOM removal when count reaches zero
- Automatic memory management

### Dual-Layer Caching
1. **Inline Cache**: Fast lookup for identical calls
   - Key: `inline:${hash}:${scoped}:${name}:${global}`
   - Prevents redundant processing
   
2. **Rule Cache**: Deduplication across calls
   - Key: `stringify({ obj, selector, global })`
   - Shares class names for identical styles

### CSS Object Processing
Located in shared utilities:
- Recursive traversal of nested objects
- Automatic kebab-case conversion (`fontSize` → `font-size`)
- Support for pseudo-selectors (`:hover`, `::before`)
- Media queries (`@media (max-width: 768px)`)
- Keyframes and at-rules

### DOM Management
- Single `<style hella-css>` element for scoped styles
- Single `<style hella-vars>` element for CSS variables
- Efficient textContent updates (not individual rule insertion)
- Automatic cleanup when stylesheets become empty

## Development Guidelines

### Adding New Features
1. **Understand Current System**: Review `shared.ts` for state management
2. **Maintain Reference Counting**: Ensure proper cleanup for new features
3. **Update Types**: Modify `types.ts` for TypeScript support
4. **Add Tests**: Include performance, utility, and reactive tests
5. **Update Documentation**: Reflect changes in README.md

### Performance Considerations
- Cache objects outside render functions
- Use reference counting for cleanup
- Leverage content hashing for deduplication
- Batch DOM updates through shared state
- Monitor bundle size impact

### Common Patterns
```typescript
// ✅ Cache styles outside functions
const buttonStyle = css({
  padding: '0.5rem 1rem',
  backgroundColor: 'blue'
});

// ✅ Use cssVars for theming
const theme = cssVars({
  colors: { primary: '#007bff' },
  spacing: { base: '1rem' }
});

// ✅ Reactive styles in effects
effect(() => {
  const dynamicStyle = css({
    color: currentColor(),
    opacity: isHovered() ? 0.8 : 1
  });
});

// ✅ Manual cleanup when needed
css.remove(styles, options);
```

### API Consistency Rules
- All functions return deterministic results
- Reference counting applies to all DOM modifications
- TypeScript support for all public APIs
- Backward compatibility for existing code
- Error handling for edge cases

## Integration

### With @hellajs/core
- Signals trigger automatic style updates
- Effects manage reactive style lifecycles
- Computed values in CSS properties
- Batch updates aligned with core scheduling