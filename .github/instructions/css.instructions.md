---
applyTo: "**"
---

# Script Instructions

Follow these instructions when working in this monorepo sub-folder. @hellajs/css is the CSS-in-JS system for creating scoped styles and CSS variables.

## Structure
- `css.ts` - Core CSS-in-JS implementation with caching and reference counting
- `vars.ts` - CSS custom properties (variables) system with nested object flattening
- `state.ts` - Global state management for stylesheets, counters, and caching maps
- `utils.ts` - CSS processing utilities for object-to-CSS conversion and DOM updates
- `types.ts` - TypeScript definitions for CSS objects, options, and selectors
- `index.ts` - Public API exports for css and cssVars functions

## Approach

### Reference-Counted CSS Injection
- Each CSS rule maintains a reference count for automatic garbage collection
- Identical style objects share the same generated class name via content-based hashing
- Rules are removed from DOM when reference count reaches zero
- Separate caching layers for inline memoization and cross-call deduplication

### Dynamic Class Name Generation
- Base-36 encoded counter creates short, unique class names (c1, c2, c3...)
- Custom names supported via options for predictable class generation
- Scoped selectors allow nesting styles under parent components
- Global mode bypasses class generation for document-level styles

### Nested CSS Object Processing
- Recursive traversal converts JavaScript objects to valid CSS strings
- Automatic kebab-case conversion for camelCase property names
- Support for pseudo-selectors, media queries, keyframes, and at-rules
- Ampersand (&) reference for parent selector composition and nesting

### Stylesheet State Management
- Single `<style>` element with `hella-css` attribute for all scoped styles
- Separate `<style>` element with `hella-vars` attribute for CSS variables
- Efficient DOM updates by concatenating all rules into textContent
- Automatic stylesheet cleanup when no rules remain

### CSS Variables Flattening
- Nested objects converted to dot-notation CSS custom properties
- Automatic prefixing with double hyphens for valid CSS variable syntax
- Return objects maintain original structure with `var()` function references
- Dynamic theme support through repeated calls with new values

### Content-Based Hashing
- Deterministic hash generation using sorted object keys for consistency
- Separate hash keys for inline memoization and rule deduplication
- Options (scoped, name, global) included in hash for proper cache isolation
- JSON.stringify with custom object sorting ensures stable hash generation